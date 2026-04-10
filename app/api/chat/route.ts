import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

export type ChatMessage = {
  id: string;
  side: "left" | "right";
  text: string;
  createdAt: string;
};

const dataFilePath = path.join(process.cwd(), "data", "chat-messages.json");

function isReadonlyFilesystemError(error: unknown): boolean {
  const code =
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as NodeJS.ErrnoException).code === "string"
      ? (error as NodeJS.ErrnoException).code
      : undefined;
  if (code === "EROFS" || code === "EACCES" || code === "EPERM") return true;
  const msg = error instanceof Error ? error.message : String(error);
  return /read-only|EROFS|not permitted to open/i.test(msg);
}

async function ensureDataFile() {
  await fs.mkdir(path.dirname(dataFilePath), { recursive: true });
  try {
    await fs.access(dataFilePath);
  } catch {
    await fs.writeFile(dataFilePath, "[]", "utf-8");
  }
}

async function readMessages(): Promise<ChatMessage[]> {
  await ensureDataFile();
  const raw = await fs.readFile(dataFilePath, "utf-8");
  try {
    const parsed = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeMessages(list: ChatMessage[]) {
  await fs.writeFile(dataFilePath, JSON.stringify(list, null, 2), "utf-8");
}

export async function GET() {
  try {
    const messages = await readMessages();
    return NextResponse.json({ messages, source: "file" as const });
  } catch {
    return NextResponse.json({ messages: [] as ChatMessage[], source: "error" as const });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      side?: string;
      text?: string;
    };

    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (text.length === 0) {
      return NextResponse.json({ error: "内容不能为空" }, { status: 400 });
    }
    if (body.side !== "left" && body.side !== "right") {
      return NextResponse.json({ error: "参数 side 无效" }, { status: 400 });
    }

    const item: ChatMessage = {
      id: crypto.randomUUID(),
      side: body.side,
      text,
      createdAt: new Date().toISOString(),
    };

    try {
      const list = await readMessages();
      list.push(item);
      await writeMessages(list);
      return NextResponse.json({
        entry: item,
        persisted: true,
      });
    } catch (fsError) {
      if (isReadonlyFilesystemError(fsError)) {
        return NextResponse.json({
          entry: item,
          persisted: false,
        });
      }
      console.error(fsError);
      return NextResponse.json({ error: "写入失败" }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ error: "请求无效" }, { status: 400 });
  }
}

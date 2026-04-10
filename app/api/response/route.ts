import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

type SurveyItem = {
  id: string;
  willingToContact: "yes" | "no";
  willingAsFriends: "yes" | "no";
  note: string;
  createdAt: string;
};

const dataFilePath = path.join(process.cwd(), "data", "responses.json");

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

async function readResponses(): Promise<SurveyItem[]> {
  await ensureDataFile();
  const raw = await fs.readFile(dataFilePath, "utf-8");
  try {
    const parsed = JSON.parse(raw) as SurveyItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<SurveyItem>;

    if (
      (body.willingToContact !== "yes" && body.willingToContact !== "no") ||
      (body.willingAsFriends !== "yes" && body.willingAsFriends !== "no")
    ) {
      return NextResponse.json(
        { message: "参数不合法，请重试。" },
        { status: 400 },
      );
    }

    const item: SurveyItem = {
      id: crypto.randomUUID(),
      willingToContact: body.willingToContact,
      willingAsFriends: body.willingAsFriends,
      note: typeof body.note === "string" ? body.note : "",
      createdAt: new Date().toISOString(),
    };

    try {
      const list = await readResponses();
      list.push(item);
      await fs.writeFile(dataFilePath, JSON.stringify(list, null, 2), "utf-8");
      return NextResponse.json({
        message: "已收到你的选择，谢谢你。",
        serverSaved: true,
      });
    } catch (fsError) {
      if (isReadonlyFilesystemError(fsError)) {
        return NextResponse.json({
          message:
            "谢谢你。线上环境无法在服务器写入文件，你的选择已保存在本设备浏览器里。",
          serverSaved: false,
        });
      }
      console.error(fsError);
      return NextResponse.json(
        { message: "服务器写入失败，请稍后再试。", serverSaved: false },
        { status: 500 },
      );
    }
  } catch {
    return NextResponse.json(
      { message: "服务器写入失败，请稍后再试。", serverSaved: false },
      { status: 500 },
    );
  }
}

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

async function readResponses(): Promise<SurveyItem[]> {
  const raw = await fs.readFile(dataFilePath, "utf-8");
  const parsed = JSON.parse(raw) as SurveyItem[];
  return Array.isArray(parsed) ? parsed : [];
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

    const list = await readResponses();
    const item: SurveyItem = {
      id: crypto.randomUUID(),
      willingToContact: body.willingToContact,
      willingAsFriends: body.willingAsFriends,
      note: typeof body.note === "string" ? body.note : "",
      createdAt: new Date().toISOString(),
    };

    list.push(item);
    await fs.writeFile(dataFilePath, JSON.stringify(list, null, 2), "utf-8");

    return NextResponse.json({ message: "已收到你的选择，谢谢你。" });
  } catch {
    return NextResponse.json(
      { message: "服务器写入失败，请稍后再试。" },
      { status: 500 },
    );
  }
}

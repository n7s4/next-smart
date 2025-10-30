import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// 更新会话（重命名、置顶）
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  const body = await request.json();
  const { title, pinned }: { title?: string | null; pinned?: boolean } =
    body || {};

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    if (title !== undefined) {
      await prisma.$executeRaw`INSERT OR IGNORE INTO Conversation (conversationId, title, pinned, createdAt, updatedAt) VALUES (${id}, ${title}, ${false}, ${new Date().toISOString()}, ${new Date().toISOString()})`;
      await prisma.$executeRaw`UPDATE Conversation SET title = ${title}, updatedAt = ${new Date().toISOString()} WHERE conversationId = ${id}`;
    }
    if (pinned !== undefined) {
      await prisma.$executeRaw`INSERT OR IGNORE INTO Conversation (conversationId, title, pinned, createdAt, updatedAt) VALUES (${id}, ${null}, ${pinned}, ${new Date().toISOString()}, ${new Date().toISOString()})`;
      await prisma.$executeRaw`UPDATE Conversation SET pinned = ${
        pinned ? 1 : 0
      }, updatedAt = ${new Date().toISOString()} WHERE conversationId = ${id}`;
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// 删除会话（删除消息与元信息）
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    await prisma.$executeRaw`DELETE FROM ChatMessage WHERE conversationId = ${id}`;
    await prisma.$executeRaw`DELETE FROM Conversation WHERE conversationId = ${id}`;
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

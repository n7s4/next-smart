import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type ImportMessage = { role: string; content: string; createdAt?: string };

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    conversationId,
    title,
    pinned,
    messages,
    overwrite,
  }: {
    conversationId?: string;
    title?: string | null;
    pinned?: boolean;
    messages: ImportMessage[];
    overwrite?: boolean;
  } = body || {};

  const id =
    conversationId || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  if (!Array.isArray(messages)) {
    return NextResponse.json(
      { error: "messages array required" },
      { status: 400 }
    );
  }

  try {
    if (overwrite) {
      await prisma.$executeRaw`DELETE FROM ChatMessage WHERE conversationId = ${id}`;
      await prisma.$executeRaw`DELETE FROM Conversation WHERE conversationId = ${id}`;
    }
    await prisma.$executeRaw`INSERT OR IGNORE INTO Conversation (conversationId, title, pinned, createdAt, updatedAt) VALUES (${id}, ${
      title ?? null
    }, ${
      pinned ? 1 : 0
    }, ${new Date().toISOString()}, ${new Date().toISOString()})`;
    if (title !== undefined || pinned !== undefined) {
      await prisma.$executeRaw`UPDATE Conversation SET title = ${
        title ?? null
      }, pinned = ${
        pinned ? 1 : 0
      }, updatedAt = ${new Date().toISOString()} WHERE conversationId = ${id}`;
    }

    for (const m of messages) {
      const ts = m.createdAt || new Date().toISOString();
      await prisma.$executeRaw`INSERT INTO ChatMessage (conversationId, role, content, userId, createdAt) VALUES (${id}, ${
        m.role
      }, ${m.content}, ${null}, ${ts})`;
    }
    return NextResponse.json({ conversationId: id }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

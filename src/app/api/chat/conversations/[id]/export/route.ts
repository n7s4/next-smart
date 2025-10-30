import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const meta = await prisma.$queryRaw<
      Array<{
        conversationId: string;
        title: string | null;
        pinned: number | boolean;
        createdAt: string;
        updatedAt: string;
      }>
    >`SELECT conversationId, title, pinned, createdAt, updatedAt FROM Conversation WHERE conversationId = ${id}`;
    const messages = await prisma.$queryRaw<
      Array<{ role: string; content: string; createdAt: string }>
    >`SELECT role, content, createdAt FROM ChatMessage WHERE conversationId = ${id} ORDER BY createdAt ASC`;

    return NextResponse.json(
      {
        conversation: meta[0] || { conversationId: id, title: null, pinned: 0 },
        messages,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

import { getChatResponseStream } from "@/lib/chatbot";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const {
    message,
    systemPrompt,
    conversationId,
  }: { message: string; systemPrompt?: string; conversationId?: string } =
    await request.json();

  if (!message) {
    return new Response(JSON.stringify({ error: "No Message provided" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  try {
    const stream = await getChatResponseStream(
      message,
      systemPrompt,
      conversationId
    );
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked", // 分块传输
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("conversationId");

  if (!conversationId) {
    return NextResponse.json(
      { error: "conversationId is required" },
      { status: 400 }
    );
  }

  try {
    const rows: Array<{ role: string; content: string }> =
      await prisma.$queryRaw`SELECT role, content FROM ChatMessage WHERE conversationId = ${conversationId} ORDER BY createdAt ASC`;
    return NextResponse.json({ messages: rows }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

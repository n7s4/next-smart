import { getChatResponseStream } from "@/lib/chatbot";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { message, systemPrompt }: { message: string; systemPrompt: string } =
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
    const stream = await getChatResponseStream(message, systemPrompt);
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

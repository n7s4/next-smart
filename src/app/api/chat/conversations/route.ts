import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// 获取最近会话列表（按最后一条消息时间倒序）
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") || 20);
  const cursor = searchParams.get("cursor"); // 传入上一页最后的 updatedAt 光标（ISO 字符串）

  try {
    // 把 ChatMessage 的 MAX(createdAt) 聚合成 updatedAt，再与 Conversation 左连接拿到 title/pinned
    const rows = await prisma.$queryRawUnsafe<
      {
        conversationId: string;
        updatedAt: string;
        title: string | null;
        pinned: number | boolean;
      }[]
    >(
      `
      SELECT agg.conversationId,
             agg.updatedAt,
             co.title as title,
             co.pinned as pinned
      FROM (
        SELECT conversationId, MAX(createdAt) AS updatedAt
        FROM ChatMessage
        GROUP BY conversationId
      ) AS agg
      LEFT JOIN Conversation co ON co.conversationId = agg.conversationId
      ${cursor ? "WHERE agg.updatedAt < ?" : ""}
      ORDER BY co.pinned DESC, agg.updatedAt DESC
      LIMIT ?
    `,
      ...(cursor ? [cursor, limit] : [limit])
    );

    // 获取每个会话的最后一条消息作为预览
    const previews: Record<string, { lastRole: string; lastContent: string }> =
      {};
    for (const r of rows) {
      const last = await prisma.$queryRaw<
        Array<{ role: string; content: string }>
      >`SELECT role, content FROM ChatMessage WHERE conversationId = ${r.conversationId} ORDER BY createdAt DESC LIMIT 1`;
      if (last[0]) {
        previews[r.conversationId] = {
          lastRole: last[0].role,
          lastContent: last[0].content,
        };
      }
    }

    const data = rows.map((r) => ({
      conversationId: r.conversationId as string,
      updatedAt: r.updatedAt as string,
      title: (r.title as string) ?? null,
      pinned: Boolean(r.pinned),
      lastRole: previews[r.conversationId]?.lastRole || null,
      lastContent: previews[r.conversationId]?.lastContent || null,
    }));

    const nextCursor =
      data.length === limit ? data[data.length - 1].updatedAt : null;

    return NextResponse.json(
      { conversations: data, nextCursor },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// 创建会话元信息（可选：前端新建时就登记标题）
export async function POST(request: NextRequest) {
  const { conversationId, title }: { conversationId: string; title?: string } =
    await request.json();
  if (!conversationId) {
    return NextResponse.json(
      { error: "conversationId is required" },
      { status: 400 }
    );
  }
  try {
    await prisma.$executeRaw`INSERT OR IGNORE INTO Conversation (conversationId, title, pinned, createdAt, updatedAt) VALUES (${conversationId}, ${
      title ?? null
    }, ${false}, ${new Date().toISOString()}, ${new Date().toISOString()})`;
    if (title) {
      await prisma.$executeRaw`UPDATE Conversation SET title = ${title}, updatedAt = ${new Date().toISOString()} WHERE conversationId = ${conversationId}`;
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

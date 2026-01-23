import { NextResponse } from "next/server";

/**
 * @description MCP 协议健康检查接口，用于响应 Cursor 等工具的自动探测
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Smart App MCP server is active",
    version: "1.0.0",
  });
}

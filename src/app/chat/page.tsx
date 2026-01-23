"use client";

import { useState, useEffect, useRef } from "react";
import { Button, Input } from "antd";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Send, Trash2, Loader2, Sparkles, MessageSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

// 定义消息类型
interface Message {
  text: string;
  sender: "user" | "bot";
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [mode, setMode] = useState<string>("friendly");
  const [conversationId, setConversationId] = useState<string>(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  const [conversations, setConversations] = useState<
    {
      conversationId: string;
      updatedAt: string;
      title?: string | null;
      pinned?: boolean;
      lastRole: string | null;
      lastContent: string | null;
    }[]
  >([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // 加载会话列表
  const refreshConversations = async (reset = true) => {
    try {
      const res = await fetch(`/api/chat/conversations?limit=20`);
      if (!res.ok) return;
      const data: {
        conversations: {
          conversationId: string;
          updatedAt: string;
          title?: string | null;
          pinned?: boolean;
          lastRole: string | null;
          lastContent: string | null;
        }[];
        nextCursor: string | null;
      } = await res.json();
      setConversations(
        reset ? data.conversations : [...conversations, ...data.conversations]
      );
      setNextCursor(data.nextCursor);
    } catch (e) {
      // 忽略
    }
  };

  // 根据当前会话加载历史
  const loadHistory = async (cid: string) => {
    try {
      const res = await fetch(`/api/chat?conversationId=${cid}`);
      if (!res.ok) {
        setMessages([]);
        return;
      }
      const data: { messages: { role: string; content: string }[] } =
        await res.json();
      const restored = data.messages.map((m) => ({
        text: m.content,
        sender: m.role === "user" ? ("user" as const) : ("bot" as const),
      }));
      setMessages(restored);
    } catch (e) {
      setMessages([]);
    }
  };

  // 初始化：加载列表与当前会话历史
  useEffect(() => {
    refreshConversations();
    loadHistory(conversationId);
  }, []);

  // 切换会话
  const handleSelectConversation = async (cid: string) => {
    if (cid === conversationId) return;
    setConversationId(cid);
    await loadHistory(cid);
  };

  // 新建会话
  const handleNewConversation = async () => {
    const newId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try {
      await fetch(`/api/chat/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: newId }),
      });
    } catch {}
    setConversationId(newId);
    setMessages([]);
    await refreshConversations();
  };

  // 重命名
  const handleRename = async (cid: string) => {
    const name = window.prompt("重命名会话：");
    if (name === null) return;
    try {
      await fetch(`/api/chat/conversations/${cid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: name || null }),
      });
      await refreshConversations();
    } catch {}
  };

  // 置顶/取消置顶
  const handleTogglePin = async (cid: string, pinned?: boolean) => {
    try {
      await fetch(`/api/chat/conversations/${cid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !pinned }),
      });
      await refreshConversations();
    } catch {}
  };

  // 删除会话
  const handleDelete = async (cid: string) => {
    if (!confirm("确定删除该会话及其消息？")) return;
    try {
      await fetch(`/api/chat/conversations/${cid}`, { method: "DELETE" });
      if (cid === conversationId) {
        await handleNewConversation();
      } else {
        await refreshConversations();
      }
    } catch {}
  };

  // 加载更多
  const handleLoadMore = async () => {
    if (!nextCursor) return;
    try {
      const res = await fetch(
        `/api/chat/conversations?limit=20&cursor=${encodeURIComponent(
          nextCursor
        )}`
      );
      if (!res.ok) return;
      const data: {
        conversations: {
          conversationId: string;
          updatedAt: string;
          title?: string | null;
          pinned?: boolean;
          lastRole: string | null;
          lastContent: string | null;
        }[];
        nextCursor: string | null;
      } = await res.json();
      setConversations([...conversations, ...data.conversations]);
      setNextCursor(data.nextCursor);
    } catch {}
  };

  const getSystemPrompt = () => {
    switch (mode) {
      case "formal":
        return "你是一个正式的助手，请用专业、礼貌的中文回答问题。";
      case "funny":
        return "你是一个幽默的助手，请用风趣的中文回答问题，尽量让人开心。";
      default:
        return undefined;
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const newMessage: Message = {
      text: input,
      sender: "user",
    };
    setMessages((prev) => [...prev, newMessage]);
    const currentInput = input;
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: currentInput,
          systemPrompt: getSystemPrompt(),
          conversationId,
        }),
      });

      if (!res.ok) {
        throw new Error("API request failed");
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("无法读取流式数据");
      }
      const decoder = new TextDecoder();
      let botMessage = "";

      setMessages((prev) => [...prev, { text: "", sender: "bot" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        botMessage += chunk;

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            text: botMessage,
          };
          return updated;
        });
      }
    } catch (error) {
      console.error("Error fetching chat response:", error);
      toast.error("无法获取回复，请稍后再试。", {
        description: "发生了网络错误或 API 问题。",
      });
      setMessages((prev) => [
        ...prev,
        {
          text: "抱歉，出了点问题！",
          sender: "bot",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = async () => {
    setMessages([]);
    try {
      const res = await fetch("/api/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      });
      if (!res.ok) throw new Error("Failed to clear chat history");
      toast.success("聊天记录已清除", {
        description: "所有消息已成功删除。",
      });
      await refreshConversations();
    } catch (error) {
      console.error("Error clearing chat history:", error);
      toast.error("清除聊天记录失败", {
        description: "请稍后再试。",
      });
    }
  };

  return (
    <div className="min-h-[calc(100vh-5.5rem)] w-full gradient-hero">
      <div className="max-w-[1600px] mx-auto p-4 sm:p-6 h-[calc(100vh-5.5rem)] flex gap-4">
        {/* 左侧会话列表 */}
        <div className="w-[260px] sm:w-[280px] border border-border/80 rounded-2xl bg-card/80 dark:bg-card/90 backdrop-blur-sm shadow-ai flex flex-col shrink-0">
          <div className="p-4 border-b border-border/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <span className="font-semibold text-foreground">会话</span>
            </div>
            <Button size="small" onClick={handleNewConversation} type="primary">
              新建
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="p-2 space-y-1">
              {conversations.length === 0 && (
                <div className="text-sm text-muted-foreground p-4 text-center">
                  暂无会话
                </div>
              )}
              {conversations.map((c) => (
                <div
                  key={c.conversationId}
                  className={`w-full p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group ${
                    c.conversationId === conversationId
                      ? "bg-accent/80 border border-cyan-500/30"
                      : ""
                  }`}
                  onClick={() => handleSelectConversation(c.conversationId)}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate text-foreground flex items-center gap-1">
                        {c.pinned && (
                          <span className="text-xs shrink-0">📌</span>
                        )}
                        <span className="truncate">{c.title || "新对话"}</span>
                      </div>
                      {c.lastContent && (
                        <div className="text-xs text-muted-foreground truncate mt-1">
                          {c.lastContent}
                        </div>
                      )}
                    </div>
                    <div
                      className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="small"
                        type="text"
                        onClick={() => handleRename(c.conversationId)}
                        className="h-6 px-2 text-xs"
                      >
                        重命名
                      </Button>
                      <Button
                        size="small"
                        type="text"
                        danger
                        onClick={() => handleDelete(c.conversationId)}
                        className="h-6 px-2 text-xs"
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {nextCursor && (
                <div className="p-2">
                  <Button
                    type="default"
                    size="small"
                    onClick={handleLoadMore}
                    className="w-full"
                  >
                    加载更多
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右侧聊天区域 */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* 顶部工具栏 */}
          <div className="flex justify-between items-center mb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-linear-to-br from-cyan-500/20 to-violet-500/20 border border-white/40 dark:border-white/10">
                <Sparkles className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">智能对话</h1>
            </div>
            <div className="flex gap-2">
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="选择模式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly">友好模式</SelectItem>
                  <SelectItem value="formal">正式模式</SelectItem>
                  <SelectItem value="funny">幽默模式</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="default"
                size="small"
                icon={<Trash2 className="w-4 h-4" />}
                onClick={handleClear}
              >
                清空
              </Button>
            </div>
          </div>

          {/* 消息区域 - 使用原生 div 确保滚动正常 */}
          <div
            ref={messagesContainerRef}
            className="flex-1 min-h-0 border border-border/80 rounded-2xl bg-card/50 dark:bg-card/70 backdrop-blur-sm p-4 sm:p-6 mb-4 overflow-y-auto"
          >
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-linear-to-br from-cyan-500/20 to-violet-500/20 border border-white/40 dark:border-white/10 mb-4">
                  <Sparkles className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  开始对话
                </h2>
                <p className="text-muted-foreground text-base max-w-md">
                  输入你的问题，获取即时的 AI
                  回答。支持多轮对话，智能理解上下文。
                </p>
              </div>
            )}

            <div className="space-y-6">
              {messages.map((msg, index) => (
                <div key={index} className="w-full">
                  {msg.sender === "user" ? (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl bg-linear-to-r from-cyan-600/20 to-violet-600/20 border border-cyan-500/30 p-4 backdrop-blur-sm">
                        <p className="text-foreground whitespace-pre-wrap wrap-break-word">
                          {msg.text}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-start">
                      <div
                        className="max-w-[85%] sm:max-w-[75%] rounded-2xl border border-border/80 bg-card/80 dark:bg-card/90 p-5 sm:p-6 shadow-ai prose prose-slate dark:prose-invert
                          prose-headings:text-foreground prose-p:text-foreground/90 prose-li:text-foreground/90
                          prose-code:bg-muted/80 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                          prose-pre:bg-muted/60 prose-pre:border prose-pre:border-border/60 prose-pre:overflow-x-auto"
                      >
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight]}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isLoading && messages.length > 0 && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl border border-border/80 bg-card/80 dark:bg-card/90 p-5 sm:p-6">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-cyan-600 dark:text-cyan-400" />
                      <span className="text-sm text-muted-foreground">
                        正在思考中...
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} className="h-1" />
          </div>

          {/* 输入区域 */}
          <div className="rounded-2xl bg-card/80 dark:bg-card/90 border border-border/80 shadow-ai p-2 shrink-0">
            <div className="flex gap-2 sm:gap-3">
              <Input
                placeholder="输入你的问题..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={isLoading}
                size="large"
                className="flex-1 rounded-xl border-border/80 bg-background/50 text-base placeholder:text-muted-foreground"
                allowClear
              />
              <Button
                type="primary"
                onClick={handleSend}
                loading={isLoading}
                size="large"
                className="h-12! px-5! rounded-xl! bg-linear-to-r! from-cyan-600! to-violet-600! border-0! hover:opacity-90! transition-opacity shadow-lg shadow-cyan-500/20"
                icon={!isLoading ? <Send className="w-4 h-4" /> : undefined}
              >
                {isLoading ? "思考中" : "发送"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

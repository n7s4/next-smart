"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Send, User, Bot, Trash2, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown"; // 引入 Markdown 渲染
import remarkGfm from "remark-gfm"; // 支持 GFM
import rehypeHighlight from "rehype-highlight";

// 定义消息类型
interface Message {
  text: string;
  sender: "user" | "bot";
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [mode, setMode] = useState<string>("friendly"); // 动态模式
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
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // 可选：登记元信息，便于命名
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
        return undefined; // 使用默认提示
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const newMessage: Message = {
      text: input,
      sender: "user",
    };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          systemPrompt: getSystemPrompt(),
          conversationId,
        }),
      });

      if (!res.ok) {
        throw new Error("API request failed");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let botMessage = "";

      setMessages((prev) => [...prev, { text: "", sender: "bot" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        console.log("Received chunk:", chunk);
        botMessage += chunk;
        setIsLoading(false);

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
    <div>
      <div className="max-w-[1200px] mx-auto p-4 h-screen flex">
        {/* 左侧会话列表 */}
        <div className="w-[280px] border rounded-md mr-4 flex flex-col">
          <div className="p-3 border-b flex items-center justify-between">
            <span className="font-semibold">会话</span>
            <Button size="sm" onClick={handleNewConversation}>
              新建
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {conversations.length === 0 && (
                <div className="text-sm text-muted-foreground p-2">
                  暂无会话
                </div>
              )}
              {conversations.map((c) => (
                <div
                  key={c.conversationId}
                  className={`w-full p-2 rounded hover:bg-accent ${
                    c.conversationId === conversationId ? "bg-accent" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <button
                      className="flex-1 text-left"
                      onClick={() => handleSelectConversation(c.conversationId)}
                      title={c.lastContent || ""}
                    >
                      <div className="text-sm font-medium truncate">
                        {c.title || c.conversationId}
                        {c.pinned ? (
                          <span className="ml-1 text-xs">📌</span>
                        ) : null}
                      </div>
                      {c.lastContent && (
                        <div className="text-xs text-muted-foreground truncate">
                          {c.lastContent}
                        </div>
                      )}
                    </button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRename(c.conversationId)}
                    >
                      重命名
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        handleTogglePin(c.conversationId, c.pinned)
                      }
                    >
                      置顶
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(c.conversationId)}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              ))}
              {nextCursor && (
                <div className="p-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadMore}
                    className="w-full"
                  >
                    加载更多
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* 右侧聊天区域 */}
        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">简易聊天机器人</h1>
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
              <Button variant="ghost" size="icon" onClick={handleClear}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <ScrollArea
            className="flex-1 border rounded-md p-4 mb-4"
            ref={scrollAreaRef}
          >
            {messages.length === 0 && !isLoading && (
              <p className="text-center text-muted-foreground">开始聊天吧！</p>
            )}
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                } mb-4`}
              >
                {msg.sender === "bot" && (
                  <Avatar className="mr-2">
                    <AvatarFallback>
                      <Bot className="w-6 h-6 flex-shrink-0" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`flex flex-wrap items-start gap-2 max-w-[70%] p-3 rounded-lg ${
                    msg.sender === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                </div>
                {msg.sender === "user" && (
                  <Avatar className="ml-2">
                    <AvatarImage
                      src="https://github.com/shadcn.png"
                      alt="@shadcn"
                    />
                    <AvatarFallback>
                      <User className="w-5 h-5 flex-shrink-0" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isLoading && messages.length > 0 && (
              <div className="flex justify-start mb-4">
                <Avatar className="mr-2">
                  <AvatarFallback>
                    <Bot className="w-6 h-6 flex-shrink-0" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-start gap-2 max-w-[70%] p-3 rounded-lg bg-muted">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">
                      思考中...
                    </span>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setInput(e.target.value)
              }
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                e.key === "Enter" && !isLoading && handleSend()
              }
              placeholder="输入消息..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={isLoading}
              className="w-[50px]"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

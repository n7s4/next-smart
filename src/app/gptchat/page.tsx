"use client";

import { FC, useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, Loader2, Sparkles, Plus, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Avatar, Layout, Menu, Popconfirm, message } from "antd";
import {
  EditOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import userAvatar from "@/assets/images/cat.jpg";

const { Sider, Content } = Layout;

interface Message {
  sender: "user" | "ai";
  text: string;
}

interface Conversation {
  conversationId: string;
  title: string | null;
  pinned: boolean;
  updatedAt: string;
}

const GptChat: FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userMessage, setUserMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [conversationId, setConversationId] = useState<string>(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messageApi, contextHolder] = message.useMessage();

  // 防止页面滚动
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  // 加载会话列表
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/gptchat/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    }
  }, []);

  // 加载指定会话的消息
  const fetchMessages = useCallback(async (cid: string) => {
    try {
      const res = await fetch(`/api/gptchat/messages?conversationId=${cid}`);
      if (res.ok) {
        const data = await res.json();
        const mappedMessages: Message[] = data.messages.map((m: any) => ({
          sender: m.role === "user" ? "user" : "ai",
          text: m.content,
        }));
        setMessages(mappedMessages);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // 处理发送消息
  const handleSendMessage = async () => {
    if (!userMessage.trim() || isLoading) return;

    const currentMessage = userMessage.trim();
    setUserMessage("");

    // 添加用户消息
    setMessages((prevMessages) => [
      ...prevMessages,
      { sender: "user", text: currentMessage },
    ]);

    setIsLoading(true);

    try {
      const res = await fetch("/api/gptchat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userMessage: currentMessage,
          conversationId,
        }),
      });

      if (!res.ok) {
        throw new Error("请求失败");
      }

      // 检查是否是流式响应
      const contentType = res.headers.get("content-type");
      if (
        contentType?.includes("text/plain") ||
        contentType?.includes("text/stream")
      ) {
        // 流式响应
        const reader = res.body?.getReader();
        if (!reader) {
          throw new Error("无法读取流式数据");
        }

        const decoder = new TextDecoder();
        let aiMessage = "";

        // 添加空的 AI 消息占位符
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: "ai", text: "" },
        ]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          aiMessage += chunk;

          // 更新最后一条 AI 消息
          setMessages((prevMessages) => {
            const updated = [...prevMessages];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              text: aiMessage,
            };
            return updated;
          });
        }
      } else {
        // JSON 响应（兼容旧版本）
        const data = await res.json();
        if (data.response) {
          setMessages((prevMessages) => [
            ...prevMessages,
            { sender: "ai", text: data.response },
          ]);
        }
      }
      // 发送成功后刷新会话列表
      fetchConversations();
    } catch (error) {
      console.error("Error:", error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: "ai", text: "抱歉，发生了错误，请稍后重试。" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 切换会话
  const handleSelectConversation = (cid: string) => {
    setConversationId(cid);
    fetchMessages(cid);
  };

  // 新建会话
  const handleNewChat = () => {
    const newId = crypto.randomUUID();
    setConversationId(newId);
    setMessages([]);
  };

  // 删除会话
  const handleDeleteConversation = async (cid: string) => {
    try {
      const res = await fetch(
        `/api/gptchat/conversations?conversationId=${cid}`,
        {
          method: "DELETE",
        }
      );
      if (res.ok) {
        message.success("会话已删除");
        fetchConversations();
        if (conversationId === cid) {
          handleNewChat();
        }
      }
    } catch (error) {
      message.error("删除失败");
    }
  };

  const hasConversation = messages.length > 0 || isLoading;

  return (
    <Layout
      className="w-full overflow-hidden gradient-hero"
      style={{
        background: "var(--gradient-hero)",
        position: "fixed",
        top: "64px", // header 高度
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10,
      }}
    >
      {contextHolder}
      <Sider
        collapsible
        collapsed={collapsed}
        collapsedWidth={72}
        onCollapse={setCollapsed}
        width={240}
        theme="light"
        className="border-r border-border gradient-hero"
        style={{
          background: "var(--gradient-hero)",
          overflow: "hidden",
          height: "100%",
        }}
        trigger={null}
      >
        <div className="h-full flex flex-col overflow-hidden">
          <div
            className={`flex items-center shrink-0 ${
              collapsed ? "justify-center" : "justify-between"
            } px-4 py-3`}
          >
            {!collapsed && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleNewChat}
              >
                <Plus className="w-4 h-4" />
                新聊天
              </Button>
            )}
            {collapsed ? (
              <MenuUnfoldOutlined
                className="text-xl cursor-pointer"
                onClick={() => setCollapsed((v) => !v)}
              />
            ) : (
              <MenuFoldOutlined
                className="text-xl cursor-pointer"
                onClick={() => setCollapsed((v) => !v)}
              />
            )}
          </div>

          <div className="flex-1 overflow-y-auto hide-scrollbar px-2">
            <div className="space-y-1">
              {conversations.map((conv) => (
                <div
                  key={conv.conversationId}
                  className={`group relative flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                    conversationId === conv.conversationId
                      ? "bg-accent/80"
                      : "hover:bg-accent/40"
                  }`}
                  onClick={() => handleSelectConversation(conv.conversationId)}
                >
                  <EditOutlined className="shrink-0 opacity-60" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate text-sm">
                        {conv.title || "新对话"}
                      </span>
                      <Popconfirm
                        title="确定删除此会话吗？"
                        onConfirm={(e) => {
                          e?.stopPropagation();
                          handleDeleteConversation(conv.conversationId);
                        }}
                        onCancel={(e) => e?.stopPropagation()}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Trash2
                          className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 hover:text-destructive transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Popconfirm>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Sider>

      <Content
        className="flex flex-col overflow-hidden"
        style={{
          maxWidth: "100%",
          background: "var(--gradient-hero)",
          padding: 0,
          height: "100%",
        }}
      >
        <div className="flex flex-col h-full min-h-0 relative">
          {!hasConversation ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-6 pl-0 pr-4 text-center w-full">
              <div className="p-4 bg-muted rounded-full">
                <Bot className="w-12 h-12 text-foreground" />
              </div>
              <div className="space-y-2 max-w-xl">
                <h2 className="text-2xl font-semibold text-foreground">
                  欢迎使用 AI 助手
                </h2>
                <p className="text-muted-foreground">
                  我是小羽，你的智能对话伙伴。有什么问题尽管问我吧！
                </p>
              </div>
              <div className="w-full max-w-2xl mx-auto px-4">
                <div className="gradient-hero rounded-2xl shadow-lg border border-border p-2">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 relative">
                      <Input
                        value={userMessage}
                        onChange={(e) => setUserMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="输入消息... (按 Enter 发送)"
                        disabled={isLoading}
                        className="pr-12 min-h-[44px] rounded-xl border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>
                    <Button
                      onClick={handleSendMessage}
                      disabled={!userMessage.trim() || isLoading}
                      size="lg"
                      className="h-[44px] w-[44px] rounded-xl bg-[#10a37f] hover:bg-[#0d8f6e] text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  小羽可以回答你的问题，帮助你解决问题
                </p>
              </div>
            </div>
          ) : (
            <>
              <div
                ref={messagesContainerRef}
                className="flex-1 min-h-0 pt-20 pb-24 overflow-y-auto overflow-x-hidden hide-scrollbar"
              >
                <div className="w-full max-w-4xl mx-auto pl-0 pr-4 space-y-6">
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
                        msg.sender === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {msg.sender === "ai" && (
                        <Avatar className="w-8 h-8 shrink-0">
                          <Bot className="w-4 h-4 text-foreground" />
                        </Avatar>
                      )}

                      <div
                        className={`group relative max-w-[90%] px-4 py-3 rounded-lg transition-all duration-200 ${
                          msg.sender === "user"
                            ? "bg-[#10a37f] text-white"
                            : "gradient-hero text-foreground border border-border"
                        }`}
                      >
                        <div
                          className={`prose prose-sm max-w-none ${
                            msg.sender === "user"
                              ? "prose-invert text-white"
                              : "dark:prose-invert prose-slate"
                          }`}
                        >
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeHighlight]}
                            components={{
                              p: ({ children }) => (
                                <p className="mb-2 last:mb-0">{children}</p>
                              ),
                              code: ({ className, children, ...props }) => {
                                const match = /language-(\w+)/.exec(
                                  className || ""
                                );
                                return match ? (
                                  <code className={className} {...props}>
                                    {children}
                                  </code>
                                ) : (
                                  <code
                                    className={`px-1.5 py-0.5 rounded text-sm bg-muted-foreground/10 text-foreground`}
                                    {...props}
                                  >
                                    {children}
                                  </code>
                                );
                              },
                            }}
                          >
                            {msg.text}
                          </ReactMarkdown>
                        </div>
                      </div>

                      {msg.sender === "user" && (
                        <Avatar
                          className="w-8 h-8 shrink-0"
                          src={userAvatar.src}
                        ></Avatar>
                      )}
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-4">
                      <Avatar className="w-8 h-8 shrink-0">
                        <Bot className="w-4 h-4 text-foreground" />
                      </Avatar>
                      <div className="gradient-hero border border-border rounded-lg px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-[#10a37f]" />
                          <span className="text-sm text-gray-600">
                            正在思考...
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              <div
                className="fixed bottom-0 gradient-hero pb-4 overflow-x-hidden"
                style={{
                  left: collapsed ? 72 : 240,
                  right: 0,
                  transition: "left 0.2s ease",
                }}
              >
                <div className="w-full max-w-4xl mx-auto pl-0 pr-4">
                  <div className="gradient-hero rounded-2xl shadow-lg border border-border p-2">
                    <div className="flex items-end gap-2">
                      <div className="flex-1 relative">
                        <Input
                          value={userMessage}
                          onChange={(e) => setUserMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="输入消息... (按 Enter 发送)"
                          disabled={isLoading}
                          className="pr-12 min-h-[44px] rounded-xl border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </div>
                      <Button
                        onClick={handleSendMessage}
                        disabled={!userMessage.trim() || isLoading}
                        size="lg"
                        className="h-[44px] w-[44px] rounded-xl bg-[#10a37f] hover:bg-[#0d8f6e] text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    小羽可以回答你的问题，帮助你解决问题
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </Content>
    </Layout>
  );
};

export default GptChat;

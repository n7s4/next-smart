"use client";

import { FC, useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, Loader2, Sparkles, Plus } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Avatar, Layout, Menu, message, Button as AntdButton } from "antd";
import {
  EditOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SearchOutlined,
  UploadOutlined,
  UserOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import userAvatar from "@/assets/images/cat.jpg";

const { Sider, Content } = Layout;

interface Message {
  sender: "user" | "ai";
  text: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
}

const GptChat: FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userMessage, setUserMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [historyList, setHistoryList] = useState<Conversation[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState<string>();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const didInitScroll = useRef(false);

  // 防止页面滚动
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  // 自动滚动到底部（首次进入不滚动）
  // useEffect(() => {
  //   if (!didInitScroll.current) {
  //     didInitScroll.current = true;
  //     return;
  //   }
  //   messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  // }, [messages, isLoading]);

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
        body: JSON.stringify({ userMessage: currentMessage }),
      });

      const data = await res.json();

      if (data.response) {
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: "ai", text: data.response },
        ]);
      } else if (data.error) {
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: "ai", text: `错误：${data.error}` },
        ]);
      }
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const saveCurrentConversation = () => {
    if (!messages.length) return;
    const title =
      messages[0]?.text.slice(0, 18) || `会话 ${historyList.length + 1}`;
    const nextConversation: Conversation = {
      id: activeHistoryId || `${Date.now()}`,
      title,
      messages,
      timestamp: Date.now(),
    };
    setHistoryList((prev) => {
      const existIdx = prev.findIndex(
        (item) => item.id === nextConversation.id
      );
      if (existIdx >= 0) {
        const clone = [...prev];
        clone[existIdx] = nextConversation;
        return clone;
      }
      return [nextConversation, ...prev];
    });
    setActiveHistoryId(nextConversation.id);
  };

  const handleNewConversation = () => {
    saveCurrentConversation();
    setMessages([]);
    setActiveHistoryId(undefined);
  };

  const handleSelectHistory = (id: string) => {
    saveCurrentConversation();
    const target = historyList.find((item) => item.id === id);
    if (!target) return;
    setMessages(target.messages);
    setActiveHistoryId(id);
  };

  const hasConversation = messages.length > 0 || isLoading;

  return (
    <Layout className="h-screen w-screen overflow-hidden bg-[#f7f7f8]">
      <Sider
        collapsible
        collapsed={collapsed}
        collapsedWidth={72}
        onCollapse={setCollapsed}
        width={240}
        theme="light"
        className="border-r border-border bg-white"
        trigger={null}
      >
        <div className="h-full flex flex-col">
          <div
            className={`flex items-center ${
              collapsed ? "justify-center" : "justify-end"
            } px-2 py-3`}
          >
            {collapsed ? (
              <MenuUnfoldOutlined
                className="text-2xl cursor-pointer"
                onClick={() => setCollapsed((v) => !v)}
              />
            ) : (
              <MenuFoldOutlined
                className="text-2xl cursor-pointer"
                onClick={() => setCollapsed((v) => !v)}
              />
            )}
          </div>

          <Menu
            mode="inline"
            defaultSelectedKeys={["1"]}
            items={[
              {
                key: "1",
                icon: <EditOutlined />,
                label: "新聊天",
              },
              {
                key: "2",
                icon: <SearchOutlined />,
                label: "搜索聊天",
              },
            ]}
            className="flex-1"
          ></Menu>
        </div>
      </Sider>

      <Content
        className="flex flex-col overflow-hidden"
        style={{
          marginLeft: collapsed ? 72 : 240,
          transition: "margin-left 0.2s ease",
          height: "100vh",
          maxWidth: "100%",
        }}
      >
        <div className="flex flex-col h-full relative pt-1.5">
          {!hasConversation ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 px-4 text-center w-full">
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
              <div className="w-full max-w-2xl mx-auto">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-2">
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
              <ScrollArea
                className="h-full pt-10 pb-24 overflow-x-hidden"
                ref={scrollAreaRef}
              >
                <div className="w-full max-w-4xl mx-auto px-4 space-y-6">
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
                        msg.sender === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {msg.sender === "ai" && (
                        <Avatar className="w-8 h-8">
                          <Bot className="w-4 h-4 text-foreground" />
                        </Avatar>
                      )}

                      <div
                        className={`group relative max-w-[90%] px-4 py-3 rounded-lg transition-all duration-200 ${
                          msg.sender === "user"
                            ? "bg-[#10a37f] text-white"
                            : "bg-white text-foreground border border-gray-200"
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
                          className="w-8 h-8"
                          src={userAvatar.src}
                        ></Avatar>
                      )}
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-4">
                      <Avatar className="w-8 h-8">
                        <Bot className="w-4 h-4 text-foreground" />
                      </Avatar>
                      <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
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
              </ScrollArea>

              <div
                className="fixed bottom-0 bg-[#f7f7f8] pb-4 overflow-x-hidden mt-[5]"
                style={{
                  left: collapsed ? 72 : 240,
                  right: 0,
                  transition: "left 0.2s ease",
                }}
              >
                <div className="w-full max-w-4xl mx-auto px-4">
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-2">
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

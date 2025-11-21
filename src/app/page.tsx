"use client";
import { Button, Input } from "antd";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { getTokenFromLocalStorage } from "@/lib/utils";

export default function HomePage() {
  const [question, setQuestion] = useState<string>("");
  const [answer, setAnswer] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSend = async () => {
    if (!question.trim()) return;

    setIsLoading(true);
    setAnswer("");

    try {
      const token = getTokenFromLocalStorage();
      const res = await fetch("/api/aiassistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        throw new Error("请求失败");
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("无法读取流式数据");
      }

      const decoder = new TextDecoder();
      let fullAnswer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullAnswer += chunk;
        setAnswer(fullAnswer);
      }
    } catch (error) {
      console.error("Error fetching response:", error);
      setAnswer("抱歉，发生了错误，请稍后再试。");
    } finally {
      setIsLoading(false);
      setQuestion("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>欢迎使用</h1>
      <p>这是首页内容区域示例。通过顶部导航切换其它页面。</p>
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Input
            placeholder="请输入问题"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
          <Button type="primary" onClick={handleSend} loading={isLoading}>
            发送
          </Button>
        </div>
        {answer && (
          <div className="border rounded-lg p-4 bg-white dark:bg-gray-800">
            <ReactMarkdown>{answer}</ReactMarkdown>
          </div>
        )}
        {isLoading && !answer && (
          <div className="text-gray-500">正在思考中...</div>
        )}
      </div>
    </div>
  );
}

"use client";

import { Button, Input } from "antd";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { getTokenFromLocalStorage } from "@/lib/utils";
import { Send, Sparkles, Loader2 } from "lucide-react";

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
    <div className="h-full w-full">
      <div className="max-w-3xl mx-auto pt-8 sm:pt-12 pb-8 px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-linear-to-br from-cyan-500/20 to-violet-500/20 border border-white/40 dark:border-white/10 mb-5">
            <Sparkles className="w-7 h-7 text-cyan-600 dark:text-cyan-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-2">
            智能助手
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-md mx-auto">
            输入你的问题，获取即时的 AI
            回答。通过顶部导航可切换羽说、博客、天气等更多功能。
          </p>
        </div>

        <div className="rounded-2xl bg-card/80 dark:bg-card/90 border border-border/80 shadow-ai p-2 mb-6">
          <div className="flex gap-2 sm:gap-3">
            <Input
              placeholder="例如：智绘彩标是什么？"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
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

        {isLoading && !answer && (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>正在思考中...</span>
          </div>
        )}

        {answer && (
          <div
            className="rounded-2xl border border-border/80 bg-card/80 dark:bg-card/90 p-5 sm:p-6 shadow-ai prose prose-slate dark:prose-invert max-w-none
              prose-headings:text-foreground prose-p:text-foreground/90 prose-li:text-foreground/90
              prose-code:bg-muted/80 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
              prose-pre:bg-muted/60 prose-pre:border prose-pre:border-border/60"
          >
            <ReactMarkdown>{answer}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

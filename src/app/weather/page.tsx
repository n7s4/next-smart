"use client";
import { fetchWeatherStream } from "@/lib/api/weather";
import { Button, Input } from "antd";
import { FC, useState } from "react";
import ReactMarkdown from "react-markdown";

const Weather: FC = () => {
  const [question, setQuestion] = useState<string>("");
  const [answer, setAnswer] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSend = async () => {
    if (!question.trim()) return;

    setIsLoading(true);
    setAnswer("");

    let fullAnswer = "";

    try {
      await fetchWeatherStream(
        question,
        (chunk) => {
          fullAnswer += chunk;
          setAnswer(fullAnswer);
        },
        (error) => {
          setAnswer(error);
        },
        () => {
          setQuestion("");
        }
      );
    } catch (error) {
      console.error("Error in handleSend:", error);
      setAnswer("抱歉，发生了错误，请稍后再试。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  return (
    <div style={{ padding: "20px" }}>
      <h3>墨迹天气 AI助理：</h3>
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
};

export default Weather;

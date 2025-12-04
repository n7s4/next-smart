import React, { FC, useState, memo, useCallback } from "react";
import { Affix, Avatar, Button } from "antd";
import { CloseCircleOutlined } from "@ant-design/icons";
import avatar from "@/assets/images/cat.jpg";
import Message from "./Message/index";
import { ChatMessage } from "./Message/index";

interface AIAssistantProps {}

const AIAssistant: FC<AIAssistantProps> = memo(() => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);
  const messages: ChatMessage = {
    message: [
      {
        content: "Hello, how are you?",
        sender: "user",
      },
      {
        content: "I'm fine, thank you!",
        sender: "assistant",
      },
      {
        content: "Hello, how are you?",
        sender: "user",
      },
      {
        content: "I'm fine, thank you!",
        sender: "assistant",
      },
      {
        content: "Hello, how are you?",
        sender: "user",
      },
      {
        content: "I'm fine, thank you!",
        sender: "assistant",
      },
      {
        content: "Hello, how are you?",
        sender: "user",
      },
      {
        content: "I'm fine, thank you!",
        sender: "assistant",
      },
    ],
    avatar: { url: avatar.src },
  };

  return (
    <div>
      {isExpanded ? (
        <Affix
          className="w-[300px] h-[500px] border bg-card rounded-lg shadow-md right-[20px]"
          offsetTop={120}
          onChange={() => handleToggle()}
        >
          <div className=" p-4 relative">
            <CloseCircleOutlined
              className="cursor-pointer absolute top-2 right-2"
              onClick={() => handleToggle()}
            />
            <h1 className="text-lg font-bold text-center mb-2">AI Assistant</h1>
            {/* 聊天结构 */}
            <Message message={messages.message} avatar={messages.avatar} />
          </div>
        </Affix>
      ) : (
        <div
          className="w-[40px] h-[40px] bg-amber-100 rounded-full shadow-md cursor-pointer"
          onClick={() => handleToggle()}
        ></div>
      )}
    </div>
  );
});

AIAssistant.displayName = "AIAssistant";

export default AIAssistant;

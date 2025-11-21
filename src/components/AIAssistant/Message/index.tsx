import React from "react";
import { Avatar } from "antd";
import assistantAvatar from "@/assets/images/gg.png";

export interface ChatMessage {
  message: { content: string; sender: "user" | "assistant" }[];
  avatar?: { [key: string]: any; url: string };
}

const Message: React.FC<ChatMessage> = ({ message, avatar }) => {
  // const isMe = message.sender === "user";
  return message.map((item, index) => {
    const isMe = item.sender === "user";
    return (
      <div className="flex justify-start flex-col gap-2" key={index}>
        {isMe ? (
          <div className="flex items-center gap-2">
            <Avatar src={assistantAvatar.src} />
            <span className="ml-2 text-sm">{item.content}</span>
          </div>
        ) : (
          <div className="flex justify-end gap-2" key={index}>
            <span className="text-sm">{item.content}</span>
            <Avatar src={avatar?.url || assistantAvatar.src} className="ml-2" />
          </div>
        )}
      </div>
    );
  });
};

export default Message;

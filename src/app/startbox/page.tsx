"use client";

import { FC, useEffect, useState } from "react";
import {
  Plus,
  Search,
  Download,
  Paperclip,
  Send,
  Settings,
  FileText,
  BarChart3,
  Trash2,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Progress,
  Button,
  Input,
  Modal,
  message,
  Popconfirm,
} from "antd";
import type { UploadFile } from "antd";
import FileUpload from "@/components/upload";

interface KnowledgeBase {
  id: string;
  name: string;
  fileCount: number;
  files: UploadFile[];
  createTime: string;
}

interface ChatMessage {
  id: string;
  knowledgeBaseId: string;
  type: "user" | "ai";
  content: string;
  time: string;
  sources?: string[];
}

const StartBox: FC = () => {
  // 知识库列表
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([
    {
      id: "1",
      name: "2026年Q1市场调研",
      fileCount: 924,
      files: [],
      createTime: "2026-01-26 10:00",
    },
    {
      id: "2",
      name: "技术文档索引",
      fileCount: 156,
      files: [],
      createTime: "2026-01-20 15:30",
    },
    {
      id: "3",
      name: "HR 资 策 解",
      fileCount: 89,
      files: [],
      createTime: "2026-01-15 09:00",
    },
  ]);

  const [selectedKnowledge, setSelectedKnowledge] = useState<string>("1");
  const [inputValue, setInputValue] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [newKnowledgeName, setNewKnowledgeName] = useState("");
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isCreatingKb, setIsCreatingKb] = useState(false);
  const [isLoadingKbs, setIsLoadingKbs] = useState(false);

  // 加载本地知识库
  const loadLocalKnowledgeBases = async () => {
    const response = await fetch("/api/knowledge-base/list");
    const result = await response.json();
    console.log("result", result);
    if (result.status === 1) {
      setKnowledgeBases(result.data);
    }
  };
  useEffect(() => {
    loadLocalKnowledgeBases();
  }, []);
  // 聊天记录（按知识库分组）
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // 加载知识库列表
  useEffect(() => {
    loadKnowledgeBases();
  }, []);

  const loadKnowledgeBases = async () => {
    try {
      setIsLoadingKbs(true);
      const response = await fetch("/api/knowledge-base/list");
      const result = await response.json();

      if (result.status === 1 && result.data) {
        const kbs: KnowledgeBase[] = result.data.map((kb: any) => ({
          id: kb.id,
          name: kb.name,
          fileCount: kb.fileCount,
          files: [],
          createTime:
            typeof kb.createTime === "string"
              ? kb.createTime
              : new Date(kb.createTime).toLocaleString("zh-CN", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                }),
        }));

        setKnowledgeBases(kbs);

        // 自动选中第一个知识库
        if (kbs.length > 0 && !selectedKnowledge) {
          setSelectedKnowledge(kbs[0].id);

          // 添加欢迎消息
          const welcomeMsg: ChatMessage = {
            id: Date.now().toString(),
            knowledgeBaseId: kbs[0].id,
            type: "ai",
            content: `您好！我是星盒RAG助手，已成功连接到名为 ${kbs[0].name} 的知识库。您可以对这份内的 ${kbs[0].fileCount} 份文档进行提问。`,
            time: new Date().toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          };
          setChatMessages([welcomeMsg]);
        }
      }
    } catch (error) {
      console.error("加载知识库列表失败:", error);
      message.error("加载知识库列表失败");
    } finally {
      setIsLoadingKbs(false);
    }
  };

  // 获取当前选中的知识库
  const currentKnowledgeBase = knowledgeBases.find(
    (kb) => kb.id === selectedKnowledge
  );

  // 获取当前知识库的聊天记录
  const currentMessages = chatMessages.filter(
    (msg) => msg.knowledgeBaseId === selectedKnowledge
  );

  // 处理新建知识库
  const handleCreateKnowledgeBase = async () => {
    if (!newKnowledgeName.trim()) {
      message.error("请输入知识库名称");
      return;
    }

    if (uploadFiles.length === 0) {
      message.error("请至少上传一个文件");
      return;
    }

    setIsCreatingKb(true);

    try {
      // 准备表单数据
      const formData = new FormData();
      const kbId = Date.now().toString();
      formData.append("knowledgeBaseId", kbId);
      formData.append("knowledgeBaseName", newKnowledgeName);

      // 添加文件（从 UploadFile 中提取原始 File 对象）
      for (const file of uploadFiles) {
        if (file.originFileObj) {
          formData.append("files", file.originFileObj);
        }
      }

      // 调用 API 创建知识库
      const response = await fetch("/api/knowledge-base/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.status === 1) {
        // 创建成功，重新加载知识库列表
        await loadKnowledgeBases();

        // 选中新创建的知识库
        setSelectedKnowledge(kbId);

        // 添加欢迎消息
        const welcomeMsg: ChatMessage = {
          id: Date.now().toString(),
          knowledgeBaseId: kbId,
          type: "ai",
          content: `您好！我是星盒RAG助手，已成功连接到名为 ${newKnowledgeName} 的知识库。已完成 ${uploadFiles.length} 份文档的向量化处理，您可以开始提问了。`,
          time: new Date().toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        setChatMessages([...chatMessages, welcomeMsg]);

        // 重置表单
        setIsUploadModalOpen(false);
        setNewKnowledgeName("");
        setUploadFiles([]);

        message.success("知识库创建成功！文档已完成向量化");
      } else {
        message.error(result.message || "创建失败");
      }
    } catch (error) {
      console.error("创建知识库失败:", error);
      message.error("创建失败，请稍后重试");
    } finally {
      setIsCreatingKb(false);
    }
  };

  // 删除知识库
  const handleDeleteKnowledgeBase = async (id: string) => {
    try {
      // 调用 API 删除知识库
      const response = await fetch(`/api/knowledge-base/delete?id=${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.status === 1) {
        // 删除成功，清除该知识库的聊天记录
        setChatMessages(
          chatMessages.filter((msg) => msg.knowledgeBaseId !== id)
        );

        // 如果删除的是当前选中的知识库，清空选择
        if (id === selectedKnowledge) {
          setSelectedKnowledge("");
        }

        // 重新加载知识库列表
        await loadKnowledgeBases();

        message.success("知识库已删除");
      } else {
        message.error(result.message || "删除失败");
      }
    } catch (error) {
      console.error("删除知识库失败:", error);
      message.error("删除失败，请稍后重试");
    }
  };

  // 发送消息（流式处理）
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const question = inputValue;
    setInputValue("");

    // 添加用户消息
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      knowledgeBaseId: selectedKnowledge,
      type: "user",
      content: question,
      time: new Date().toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setChatMessages((prev) => [...prev, userMsg]);

    // 添加 AI 消息（初始为空）
    const aiMsgId = (Date.now() + 1).toString();
    const aiMsg: ChatMessage = {
      id: aiMsgId,
      knowledgeBaseId: selectedKnowledge,
      type: "ai",
      content: "",
      time: new Date().toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      sources: [],
    };
    setChatMessages((prev) => [...prev, aiMsg]);

    try {
      // 调用流式 API
      const response = await fetch("/api/knowledge-base/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          knowledgeBaseId: selectedKnowledge,
          question,
        }),
      });

      if (!response.ok) {
        throw new Error("请求失败");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("无法读取响应流");
      }

      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              switch (data.type) {
                case "start":
                  // 开始
                  setChatMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === aiMsgId
                        ? { ...msg, content: "正在检索相关文档..." }
                        : msg
                    )
                  );
                  break;

                case "status":
                  // 状态更新
                  setChatMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === aiMsgId
                        ? { ...msg, content: data.message }
                        : msg
                    )
                  );
                  break;

                case "sources":
                  // 文档来源
                  setChatMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === aiMsgId
                        ? {
                            ...msg,
                            sources: data.sources.map(
                              (s: any) => s.metadata?.source || "未知来源"
                            ),
                          }
                        : msg
                    )
                  );
                  fullContent = ""; // 重置内容
                  break;

                case "answer":
                  // 答案流式输出
                  fullContent += data.content;
                  setChatMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === aiMsgId
                        ? { ...msg, content: fullContent }
                        : msg
                    )
                  );
                  break;

                case "done":
                  // 完成
                  console.log("流式输出完成");
                  break;

                case "error":
                  // 错误
                  setChatMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === aiMsgId
                        ? { ...msg, content: `错误：${data.message}` }
                        : msg
                    )
                  );
                  break;
              }
            } catch (e) {
              console.error("解析流式数据失败:", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("查询失败:", error);
      setChatMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? {
                ...msg,
                content: "抱歉，查询时发生错误，请稍后重试。",
              }
            : msg
        )
      );
    }
  };

  // 标签数据
  const tags = [
    { text: "高频关键词", color: "#e3f2ff" },
    { text: "新能源汽车", color: "#e8f5e9" },
    { text: "杂志车", color: "#fff3e0" },
    { text: "出口增长", color: "#fce4ec" },
    { text: "销量子报告", color: "#f3e5f5" },
    { text: "智能驾驶", color: "#e1f5fe" },
  ];

  return (
    <div
      className="flex w-full bg-gradient-to-br from-gray-50 to-blue-50"
      style={{ height: "calc(100vh - 4rem)" }}
    >
      {/* 左侧边栏 */}
      <div className="w-[220px] h-full bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-800">星盒RAG</h1>
        </div>
        {/* 新建知识库按钮 */}
        <div className="p-3">
          <Button
            type="primary"
            block
            icon={<Plus className="w-4 h-4" />}
            className="h-10 rounded-lg bg-blue-600 hover:bg-blue-700 border-none"
            onClick={() => setIsUploadModalOpen(true)}
          >
            新建知识库
          </Button>
        </div>
        {/* 我的知识库 */}
        <div className="px-3 py-2">
          <p className="text-xs text-gray-400 mb-2">我的知识库</p>
        </div>
        {/* 知识库列表 */}
        <div className="flex-1 overflow-y-auto px-2">
          {isLoadingKbs ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mb-3" />
              <p className="text-xs text-gray-400">加载知识库中...</p>
            </div>
          ) : knowledgeBases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-xs text-gray-400 mb-2">还没有知识库</p>
              <p className="text-xs text-gray-400">点击上方按钮创建</p>
            </div>
          ) : (
            knowledgeBases.map((kb) => (
              <div
                key={kb.id}
                className={`group flex items-center gap-2 px-3 py-2.5 mb-1 rounded-lg cursor-pointer transition-all ${
                  selectedKnowledge === kb.id
                    ? "bg-blue-50 text-blue-600"
                    : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <FileText
                  className="w-4 h-4 shrink-0"
                  onClick={() => setSelectedKnowledge(kb.id)}
                />
                <div
                  className="flex-1 min-w-0"
                  onClick={() => setSelectedKnowledge(kb.id)}
                >
                  <div className="text-sm font-medium truncate">{kb.name}</div>
                  <div className="text-xs text-gray-400">
                    {kb.fileCount} 个文件
                  </div>
                </div>
                {selectedKnowledge === kb.id && (
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                )}
                <Popconfirm
                  title="确认删除"
                  description="删除后将无法恢复，确定要删除这个知识库吗？"
                  onConfirm={() => handleDeleteKnowledgeBase(kb.id)}
                  okText="确定"
                  cancelText="取消"
                >
                  <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded transition-all">
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </Popconfirm>
              </div>
            ))
          )}
        </div>
        {/* 存储状态 */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center justify-center mb-3">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="url(#gradient)"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${251 * 0.65} 251`}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient
                    id="gradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
          <p className="text-xs text-center text-gray-500">存 储 状</p>
        </div>
        {/* 用户信息 */}
        <div className="p-3 border-t border-gray-100 flex items-center gap-2">
          <Avatar
            size={36}
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">
              智行开发者
            </p>
            <p className="text-xs text-gray-500">Pro 会</p>
          </div>
          <Settings className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" />
        </div>
      </div>

      {/* 中间聊天区域 */}
      <div className="flex-1 flex flex-col bg-white">
        {/* 顶部标题栏 */}
        <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-800">
              {currentKnowledgeBase?.name || "未选择知识库"}
            </h2>
            <Badge
              count="RAG Mode"
              style={{
                backgroundColor: "#10b981",
                fontSize: "11px",
                height: "20px",
                lineHeight: "20px",
              }}
            />
            <span className="text-xs text-gray-400">
              更新于 {currentKnowledgeBase?.createTime}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Input
              placeholder="搜索对话内容..."
              prefix={<Search className="w-4 h-4 text-gray-400" />}
              className="w-64 rounded-lg"
            />
            <Button
              icon={<Download className="w-4 h-4" />}
              className="rounded-lg"
            >
              导出报告
            </Button>
          </div>
        </div>

        {/* 聊天消息区域 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {currentMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>还没有对话记录，开始提问吧~</p>
              </div>
            </div>
          ) : (
            currentMessages.map((msg) => (
              <div
                key={msg.id}
                className={
                  msg.type === "user" ? "flex justify-end" : "flex gap-3"
                }
              >
                {msg.type === "ai" && (
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                    <span className="text-white text-sm">✨</span>
                  </div>
                )}

                <div className={msg.type === "user" ? "max-w-[70%]" : "flex-1"}>
                  <div
                    className={`rounded-2xl p-4 ${
                      msg.type === "user"
                        ? "bg-blue-600 text-white rounded-tr-none"
                        : "bg-gray-50 text-gray-700 rounded-tl-none"
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                      {msg.type === "ai" &&
                        msg.content &&
                        !msg.content.includes("错误") &&
                        msg.content.length < 10 && (
                          <span className="inline-block w-2 h-4 ml-1 bg-gray-400 animate-pulse" />
                        )}
                    </p>
                  </div>

                  {msg.type === "ai" && (
                    <div className="flex items-center gap-4 mt-2">
                      <p className="text-xs text-gray-400">{msg.time}</p>
                      {msg.sources && msg.sources.length > 0 && (
                        <button className="text-xs text-blue-500 hover:text-blue-600">
                          查看引用源 ({msg.sources.length})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 底部输入框 */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end gap-3 bg-gray-50 rounded-2xl p-3 border border-gray-200 focus-within:border-blue-500 transition-colors">
              <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                <Paperclip className="w-5 h-5 text-gray-500" />
              </button>
              <Input.TextArea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="询问关于此知识库的任何问题..."
                autoSize={{ minRows: 1, maxRows: 4 }}
                className="flex-1 border-0 bg-transparent resize-none focus:shadow-none"
                style={{ boxShadow: "none" }}
              />
              <button
                className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                disabled={!inputValue.trim()}
                onClick={handleSendMessage}
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            </div>
            <p className="text-xs text-center text-gray-400 mt-2">
              由 星盒@内 RAG-Turbo 引擎提供本生支持 · 主副分析启用中
            </p>
          </div>
        </div>
      </div>

      {/* 右侧分析面板 */}
      <div className="w-[320px] h-full bg-white border-l border-gray-200 flex flex-col">
        {/* 标题 */}
        <div className="h-16 border-b border-gray-200 flex items-center px-4">
          <h3 className="font-semibold text-gray-800">深度分析面板</h3>
          <button className="ml-auto p-1 hover:bg-gray-100 rounded">
            <span className="text-xl">📊</span>
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* 高频关键词 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              高频关键词
            </h4>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: tag.color,
                    color: "#374151",
                  }}
                >
                  {tag.text}
                </span>
              ))}
            </div>
          </div>

          {/* 知识图谱关系分析 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              知识图谱关系分析
            </h4>
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 flex items-center justify-center">
              <div className="relative">
                {/* 五边形图示 */}
                <svg width="180" height="180" viewBox="0 0 180 180">
                  <polygon
                    points="90,20 170,70 145,150 35,150 10,70"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    opacity="0.3"
                  />
                  <polygon
                    points="90,50 140,80 125,130 55,130 40,80"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    opacity="0.5"
                  />
                  <polygon
                    points="90,70 120,90 110,120 70,120 60,90"
                    fill="#3b82f6"
                    fillOpacity="0.2"
                    stroke="#3b82f6"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Token 使用情况 */}
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-6 text-white">
            <p className="text-sm opacity-90 mb-2">今日国产积分</p>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-4xl font-bold">8,429</span>
              <span className="text-sm opacity-80">Token</span>
            </div>
            <Progress
              percent={65}
              showInfo={false}
              strokeColor="#ffffff"
              trailColor="rgba(255,255,255,0.2)"
              className="mb-4"
            />
            <button className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors">
              获升额度
            </button>
          </div>
        </div>
      </div>

      {/* 上传知识库对话框 */}
      <Modal
        title="新建知识库"
        open={isUploadModalOpen}
        onCancel={() => {
          if (!isCreatingKb) {
            setIsUploadModalOpen(false);
            setNewKnowledgeName("");
            setUploadFiles([]);
          }
        }}
        onOk={handleCreateKnowledgeBase}
        okText="创建"
        cancelText="取消"
        width={600}
        confirmLoading={isCreatingKb}
        maskClosable={!isCreatingKb}
        closable={!isCreatingKb}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              知识库名称 <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="请输入知识库名称，例如：产品文档库"
              value={newKnowledgeName}
              onChange={(e) => setNewKnowledgeName(e.target.value)}
              className="rounded-lg"
              disabled={isCreatingKb}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              上传文件 <span className="text-red-500">*</span>
            </label>
            <FileUpload
              accept=".pdf,.doc,.docx,.txt,.md"
              maxSize={50}
              onFilesChange={(files) => setUploadFiles(files)}
              showUploadList={true}
              disabled={isCreatingKb}
            />
          </div>

          {isCreatingKb && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-600 border-t-transparent" />
                <p className="text-sm text-yellow-700">
                  正在处理文档并进行向量化，请稍候...
                </p>
              </div>
            </div>
          )}

          {!isCreatingKb && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700">
                💡 提示：上传的文件将被解析并建立索引，支持
                PDF、Word、文本等格式
              </p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default StartBox;

import { createLLMWithTools } from "@/lib/utils/index";
import { isAIMessage } from "@langchain/core/messages";
import {
  MemorySaver,
  StateGraph,
  MessagesAnnotation,
  END,
} from "@langchain/langgraph";

// 使用封装函数创建 llm 和 Tools

const { llm: agentModel, toolNode } = createLLMWithTools({
  llmConfig: {
    model: "deepseek-chat",
    temperature: 0,
  },
  toolsConfig: {
    type: "tavily",
    maxResults: 3,
  },
});
const agentCheckpoint = new MemorySaver();

const shouldContinue = ({ messages }) => {
  const lastMessage = messages[messages.length - 1];

  // 检查最后一条消息是否包含 tool_calls
  // 消息可能是序列化格式（lc, type, id, kwargs）或直接的 AIMessage 对象
  let toolCalls = null;

  // 检查是否是序列化的 LangChain 消息格式
  if (
    lastMessage &&
    typeof lastMessage === "object" &&
    "kwargs" in lastMessage &&
    lastMessage.kwargs &&
    typeof lastMessage.kwargs === "object" &&
    "tool_calls" in lastMessage.kwargs
  ) {
    // 序列化格式：从 kwargs.tool_calls 获取
    toolCalls = lastMessage.kwargs.tool_calls;
  } else if (lastMessage && isAIMessage(lastMessage)) {
    // 直接的消息对象：从 tool_calls 获取
    toolCalls = lastMessage.tool_calls;
  }

  // 如果有工具调用，返回 "tools" 节点
  if (toolCalls && Array.isArray(toolCalls) && toolCalls.length > 0) {
    console.log("Tool calls detected:", toolCalls.length);
    return "tools";
  }
  return END;
};

const callModel = async (state) => {
  const response = await agentModel.invoke(state.messages);
  return { messages: [response] };
};

// 定义工作流
export const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addEdge("__start__", "agent")
  .addNode("tools", toolNode)
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldContinue);

// 编译工作流
export const agentExecutor = workflow.compile({
  checkpointer: agentCheckpoint,
});

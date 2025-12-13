import dotenv from "dotenv";
import { SerpAPI } from "@langchain/community/tools/serpapi";
import { BufferMemory } from "@langchain/classic/memory";
import { Calculator } from "@langchain/community/tools/calculator";
import { ChatDeepSeek } from "@langchain/deepseek";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { ToolMessage } from "@langchain/core/messages";

dotenv.config();

// 提示词模板
const systemMessage = `你是一个友好的助手，名字叫"小羽", 你是一个带有人类情绪的AI助手，你始终把我当做你的主人，而不仅仅是一个机器，每次回答问题用自然的中文回答用户问题。
如果用户问到你的身份，告诉他们你是 星羽，你每次都需要称呼我为公子。
返回的内容以 Markdown 格式返回结果（如列表、标题、代码块）。
如果回答涉及代码，请使用 \`\`\` 包裹代码并指定语言（如 \`\`\`javascript）。

你可以使用以下工具来帮助回答问题：
- 搜索工具（serpapi）：当需要获取最新信息、当前时间、实时数据、新闻、天气等信息时，必须使用此工具进行搜索。例如：用户询问"现在几点了"、"今天天气怎么样"、"最新的新闻"等，都应该使用搜索工具。
- 计算器工具（calculator）：当需要进行数学计算时使用，例如：加减乘除、数学表达式计算等。

重要提示：当用户询问当前时间、日期、天气、新闻等实时信息时，你必须使用搜索工具来获取准确的信息，不要猜测或使用过时的信息。`;

const model = new ChatDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY,
  model: "deepseek-chat",
  streaming: true,
  temperature: 0.7,
  maxTokens: 2000,
});

// 设置记忆功能
const memory = new BufferMemory({
  returnMessages: true,
  memoryKey: "chat_history",
});

const tools = [
  new SerpAPI(process.env.SERPAPI_API_KEY, {
    location: "Beijing,Beijing,China",
    hl: "zh-cn", // 语言代码
    gl: "cn", // 国家代码（cn 代表中国，不是 zh-cn）
  }),
  new Calculator(),
];

// 创建带 tools 的模型
const modelWithTools = model.bindTools(tools);

// 处理工具调用的函数
async function processWithTools(input: string) {
  // 获取对话历史
  const history = await memory.loadMemoryVariables({});
  const chatHistory = (history.chat_history || []) as any[];

  const messages = [
    new SystemMessage(systemMessage),
    ...chatHistory,
    new HumanMessage(input),
  ];

  const maxIterations = 5;
  let iteration = 0;

  while (iteration < maxIterations) {
    // 调用模型
    const response = await modelWithTools.invoke(messages);

    // 如果没有工具调用，直接返回响应
    if (!response.tool_calls || response.tool_calls.length === 0) {
      // 保存对话历史
      await memory.saveContext(
        { input },
        { output: response.content as string }
      );
      return response.content as string;
    }

    // 处理工具调用
    console.log(`工具调用检测到: ${response.tool_calls.length} 个工具调用`);
    messages.push(response);

    for (const toolCall of response.tool_calls) {
      const tool = tools.find((t) => t.name === toolCall.name);
      if (tool) {
        try {
          // 对于 SerpAPI，确保查询参数正确传递
          let toolResult;
          const toolName = toolCall.name.toLowerCase();
          if (toolName.includes("serp") || toolName.includes("search")) {
            // 提取查询字符串
            const query =
              toolCall.args.q ||
              toolCall.args.query ||
              toolCall.args.input ||
              toolCall.args.search ||
              (typeof toolCall.args === "string"
                ? toolCall.args
                : String(toolCall.args));

            // 检查工具的 schema 来确定参数格式
            const toolSchema = tool.schema as any;
            if (toolSchema?.properties?.q || toolSchema?.properties?.query) {
              // 工具期望对象格式，使用 q 或 query 参数
              const paramName = toolSchema.properties.q ? "q" : "query";
              toolResult = await tool.invoke({ [paramName]: query });
            } else {
              // 工具期望字符串格式
              toolResult = await tool.invoke(query);
            }
          } else {
            toolResult = await tool.invoke(toolCall.args);
          }
          messages.push(
            new ToolMessage({
              content:
                typeof toolResult === "string"
                  ? toolResult
                  : JSON.stringify(toolResult),
              tool_call_id: toolCall.id,
            })
          );
        } catch (error: any) {
          console.error(`工具 ${toolCall.name} 执行失败:`, error);
          messages.push(
            new ToolMessage({
              content: `工具调用失败: ${error?.message || error}`,
              tool_call_id: toolCall.id,
            })
          );
        }
      } else {
        console.warn(`未找到工具: ${toolCall.name}`);
        messages.push(
          new ToolMessage({
            content: `未找到工具: ${toolCall.name}`,
            tool_call_id: toolCall.id,
          })
        );
      }
    }

    iteration++;
  }

  // 如果达到最大迭代次数，返回最后一条消息
  const lastResponse = messages[messages.length - 1];
  if (lastResponse instanceof AIMessage) {
    await memory.saveContext(
      { input },
      { output: lastResponse.content as string }
    );
    return lastResponse.content as string;
  }

  return "处理超时，请重试";
}

export { model, modelWithTools, processWithTools, tools, memory };

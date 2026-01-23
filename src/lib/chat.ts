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
import prisma from "@/lib/prisma";

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

// 流式处理工具调用的函数
async function processWithToolsStream(
  input: string,
  conversationId?: string,
  userId?: number
): Promise<ReadableStream> {
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

  return new ReadableStream({
    async start(controller) {
      try {
        // 异步保存用户消息
        const cid = conversationId || "default";
        prisma.$executeRaw`INSERT INTO ChatMessage (conversationId, role, content, userId, createdAt) VALUES (${cid}, ${"user"}, ${input}, ${
          userId ?? null
        }, ${new Date().toISOString()})`.catch((e) => {
          console.error("Failed to persist user message:", e);
        });

        while (iteration < maxIterations) {
          // 先检查是否需要工具调用
          const response = await modelWithTools.invoke(messages);

          // 如果没有工具调用，使用流式输出最终响应
          if (!response.tool_calls || response.tool_calls.length === 0) {
            // 重新构建消息列表用于流式输出（不包含工具绑定）
            const streamMessages = [
              new SystemMessage(systemMessage),
              ...chatHistory,
              new HumanMessage(input),
              ...messages.slice(chatHistory.length + 1),
            ];

            const stream = await model.stream(streamMessages);
            let responseContent = "";

            for await (const chunk of stream) {
              const content = chunk.content as string;
              if (content) {
                responseContent += content;
                controller.enqueue(new TextEncoder().encode(content));
              }
            }

            // 保存对话历史到内存
            await memory.saveContext({ input }, { output: responseContent });

            // 保存 AI 回复到数据库
            try {
              await prisma.$executeRaw`INSERT INTO ChatMessage (conversationId, role, content, userId, createdAt) VALUES (${cid}, ${"bot"}, ${responseContent}, ${
                userId ?? null
              }, ${new Date().toISOString()})`;

              // 更新或创建会话元信息
              const title = input.slice(0, 30);
              await prisma.$executeRaw`INSERT OR IGNORE INTO Conversation (conversationId, title, pinned, createdAt, updatedAt) VALUES (${cid}, ${title}, ${0}, ${new Date().toISOString()}, ${new Date().toISOString()})`;
              await prisma.$executeRaw`UPDATE Conversation SET updatedAt = ${new Date().toISOString()} WHERE conversationId = ${cid}`;
            } catch (e) {
              console.error("Failed to persist bot message/conversation:", e);
            }

            controller.close();
            return;
          }

          // 处理工具调用
          console.log(
            `工具调用检测到: ${response.tool_calls.length} 个工具调用`
          );
          messages.push(response);

          // 执行工具调用
          for (const toolCall of response.tool_calls) {
            const tool = tools.find((t) => t.name === toolCall.name);
            if (tool) {
              try {
                let toolResult;
                const toolName = toolCall.name.toLowerCase();
                if (toolName.includes("serp") || toolName.includes("search")) {
                  const query =
                    toolCall.args.q ||
                    toolCall.args.query ||
                    toolCall.args.input ||
                    toolCall.args.search ||
                    (typeof toolCall.args === "string"
                      ? toolCall.args
                      : String(toolCall.args));

                  const toolSchema = tool.schema as any;
                  if (
                    toolSchema?.properties?.q ||
                    toolSchema?.properties?.query
                  ) {
                    const paramName = toolSchema.properties.q ? "q" : "query";
                    toolResult = await tool.invoke({ [paramName]: query });
                  } else {
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
            }
          }

          iteration++;
        }

        // 如果达到最大迭代次数，流式输出最后一条消息
        const lastResponse = messages[messages.length - 1];
        if (lastResponse instanceof AIMessage) {
          const finalContent = lastResponse.content as string;
          await memory.saveContext({ input }, { output: finalContent });
          // 逐字符发送（模拟流式）
          for (const char of finalContent) {
            controller.enqueue(new TextEncoder().encode(char));
          }
        } else {
          controller.enqueue(new TextEncoder().encode("处理超时，请重试"));
        }
        controller.close();
      } catch (error: any) {
        console.error("Stream error:", error);
        const errorMessage = "抱歉，流式处理出错！";
        controller.enqueue(new TextEncoder().encode(errorMessage));
        controller.close();
      }
    },
  });
}

export {
  model,
  modelWithTools,
  processWithTools,
  processWithToolsStream,
  tools,
  memory,
};

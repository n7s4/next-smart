import { ChatDeepSeek } from "@langchain/deepseek";
import { TavilySearch } from "@langchain/tavily";
import { ToolNode } from "@langchain/langgraph/prebuilt";

/**
 * 创建 llm 实例, 这里是直接创建 DeepSeek 的 llm 实例
 */
interface CreateLLMOptions {
  model: string;
  temperature: number;
  [key: string]: any;
}
interface ToolsOptions {
  tools: any[];
}
export const createLLM = (
  options?: CreateLLMOptions,
  toolsOptions?: ToolsOptions
) => {
  const { model = "deepseek-chat", temperature = 0.7, ...rest } = options || {};
  const llm = new ChatDeepSeek({
    model,
    temperature,
  });
  if (toolsOptions?.tools && toolsOptions.tools.length > 0) {
    return llm.bindTools(toolsOptions.tools);
  }
  return llm;
};

/**
 * @description 创建工具实例
 * @param options 工具配置
 * @returns
 */
interface ToolsOptions {
  type: "tavily";
  maxResults?: number;
  tavilyApiKey?: string;
  [key: string]: any;
}
export const createTools = (options: ToolsOptions) => {
  const tools: any[] = [];
  if (options.type === "tavily") {
    tools.push(
      new TavilySearch({
        tavilyApiKey: process.env.TAVILY_API_KEY,
        maxResults: options.maxResults || 5,
      })
    );
  }
  return tools;
};

export const createToolNode = (
  props: ConstructorParameters<typeof ToolNode>[0],
  options?: ConstructorParameters<typeof ToolNode>[1]
) => {
  return new ToolNode(props, options || {});
};

interface CreateLLMWithToolsOptions {
  llmConfig: CreateLLMOptions;
  toolsConfig: ToolsOptions;
}
export const createLLMWithTools = (options: CreateLLMWithToolsOptions) => {
  const { llmConfig, toolsConfig } = options;

  // 先创建 llm
  const tools = createTools(toolsConfig);

  // 创建 llm 并绑定 tools
  const llm = createLLM({
    ...llmConfig,
    tools,
  });

  // 创建 toolNode
  const toolNode = createToolNode(tools);

  return {
    llm,
    tools,
    toolNode,
  };
};

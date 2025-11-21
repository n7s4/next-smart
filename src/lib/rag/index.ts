import path from "path";
import { pull } from "langchain/hub";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { AlibabaTongyiEmbeddings } from "@langchain/community/embeddings/alibaba_tongyi";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { createLLM } from "@/lib/utils/index";
import { Annotation, StateGraph } from "@langchain/langgraph";

// 从 langChain hub 中获取 promptTemplate
export const promptTemplate = await pull("rlm/rag-prompt");

// 获取文档路径（从项目根目录开始）
const pdfPath = path.join(process.cwd(), "src", "assets", "docs", "EZSort.pdf");

// 加载 PDF 文件
const loader = new PDFLoader(pdfPath);
const docs = await loader.load();

// 分割文档
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});
const allSplits = await splitter.splitDocuments(docs);

const embeddings = new AlibabaTongyiEmbeddings({});
export const vectorStore = new MemoryVectorStore(embeddings);
await vectorStore.addDocuments(allSplits);

// 创建 llm
const llmConfig = {
  model: "deepseek-chat",
  temperature: 0.7,
};
export const llm = createLLM(llmConfig);

// 定义 agent 工作流
const StateAnnotation = Annotation.Root({
  question: Annotation<string>,
  answer: Annotation<string>,
  sources: Annotation,
  context: Annotation<any[]>, // 添加 context 字段用于存储检索到的文档
});

// 定义检索方法
const retrieve = async (state: typeof StateAnnotation.State) => {
  console.log("retrieve... question: ", state.question);
  const retrievedDocs = await vectorStore.similaritySearch(state.question);
  return { context: retrievedDocs };
};
const generate = async (state: typeof StateAnnotation.State) => {
  // 安全检查：确保 context 存在且是数组
  if (!state.context || !Array.isArray(state.context)) {
    throw new Error(
      "Context is missing or invalid. Please ensure retrieve node runs before generate."
    );
  }

  const docsContent = state.context.map((doc) => doc.pageContent).join("\n");
  const messages = await promptTemplate.invoke({
    question: state.question,
    context: docsContent,
  });
  const response = await llm.invoke(messages);
  return { answer: response.content };
};

// 定义 workflow 工作流
export const graph = new StateGraph(StateAnnotation)
  .addNode("retrieve", retrieve)
  .addNode("generate", generate)
  .addEdge("__start__", "retrieve")
  .addEdge("retrieve", "generate")
  .addEdge("generate", "__end__")
  .compile();

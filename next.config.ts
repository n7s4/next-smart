import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  compress: false,
  // 配置页面重定向位置
  // async redirects() {
  //   return [
  //     {
  //       source: "/", // 匹配根路径
  //       destination: "/home", // 重定向的目标路径
  //       permanent: true, // 设置为true表示永久重定向（308），false表示临时（307）
  //     },
  //   ];
  // },
  /* config options here */
  sassOptions: {
    // 指定 SCSS 文件的查找路径，例如你的全局样式目录
    includePaths: [path.join(__dirname, "styles")],
    // 你可以在这里添加其他 Sass 编译器选项
    // precision: 3,
    // outputStyle: 'compressed',
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@images": path.resolve(__dirname, "path/to/images"),
    };

    // ========== Webpack 代码分割策略 ==========
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: "all",
        minSize: 20000, // 最小分包大小 20KB
        maxSize: 244000, // 最大分包大小 244KB（超过会尝试继续分割）
        minChunks: 1,
        maxAsyncRequests: 30, // 按需加载最大并行请求数
        maxInitialRequests: 30, // 入口点最大并行请求数
        automaticNameDelimiter: "~",
        enforceSizeThreshold: 50000,
        cacheGroups: {
          // ========== React 核心库 ==========
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            name: "vendor.react",
            priority: 30,
            reuseExistingChunk: true,
          },

          // ========== Ant Design 核心 ==========
          antdCore: {
            test: /[\\/]node_modules[\\/](antd|@ant-design[\\/]cssinjs|@ant-design[\\/]icons|@rc-component)[\\/]/,
            name: "vendor.antd-core",
            priority: 25,
            reuseExistingChunk: true,
          },

          // ========== Ant Design Pro 组件 ==========
          antdPro: {
            test: /[\\/]node_modules[\\/]@ant-design[\\/]pro-components[\\/]/,
            name: "vendor.antd-pro",
            priority: 24,
            reuseExistingChunk: true,
          },

          // ========== LangChain 核心库 ==========
          langchainCore: {
            test: /[\\/]node_modules[\\/](@langchain[\\/]core|@langchain[\\/]langgraph)[\\/]/,
            name: "vendor.langchain-core",
            priority: 22,
            reuseExistingChunk: true,
          },

          // ========== LangChain 社区库 ==========
          langchainCommunity: {
            test: /[\\/]node_modules[\\/](@langchain[\\/]community|@langchain[\\/]classic)[\\/]/,
            name: "vendor.langchain-community",
            priority: 21,
            reuseExistingChunk: true,
          },

          // ========== LangChain 集成库 ==========
          langchainIntegrations: {
            test: /[\\/]node_modules[\\/](@langchain[\\/]openai|@langchain[\\/]deepseek|@langchain[\\/]textsplitters)[\\/]/,
            name: "vendor.langchain-integrations",
            priority: 20,
            reuseExistingChunk: true,
          },

          // ========== Lucide 图标库 ==========
          lucide: {
            test: /[\\/]node_modules[\\/](lucide|lucide-react)[\\/]/,
            name: "vendor.lucide-icons",
            priority: 18,
            reuseExistingChunk: true,
          },

          // ========== AI SDK 相关 ==========
          aiSdk: {
            test: /[\\/]node_modules[\\/](ai|@ai-sdk)[\\/]/,
            name: "vendor.ai-sdk",
            priority: 17,
            reuseExistingChunk: true,
          },

          // ========== PDF 处理相关 ==========
          pdfTools: {
            test: /[\\/]node_modules[\\/](pdf-parse|pdfjs-dist)[\\/]/,
            name: "vendor.pdf-tools",
            priority: 16,
            reuseExistingChunk: true,
          },

          // ========== 工具库 ==========
          utilities: {
            test: /[\\/]node_modules[\\/](axios|lodash|dayjs|date-fns|clsx|class-variance-authority)[\\/]/,
            name: "vendor.utilities",
            priority: 15,
            reuseExistingChunk: true,
          },

          // ========== 自定义工具函数 ==========
          appUtils: {
            test: /[\\/]src[\\/](utils|lib[\\/]utils)[\\/]/,
            name: "app.utils",
            priority: 12,
            minChunks: 2,
            reuseExistingChunk: true,
          },

          // ========== 其他第三方库 ==========
          commons: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendor.commons",
            priority: 5,
            minChunks: 2,
            reuseExistingChunk: true,
          },

          // ========== 默认分组 ==========
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
        },
      };

      // 模块 ID 确定性命名（便于长期缓存）
      config.optimization.moduleIds = "deterministic";

      // 运行时代码单独提取
      config.optimization.runtimeChunk = {
        name: "runtime",
      };
    }

    // ========== 性能优化 ==========

    // 忽略不需要的模块（减小打包体积）
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
    }

    // ========== Tree Shaking 优化 ==========
    // 确保标记为 sideEffects: false 的包能正确 tree shaking
    config.optimization.usedExports = true;
    config.optimization.sideEffects = true;

    // ========== 压缩优化 ==========
    if (!dev) {
      config.optimization.minimize = true;
    }

    return config;
  },

  // ========== 编译优化 ==========
  compiler: {
    // 生产环境移除 console
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"], // 保留 error 和 warn
          }
        : false,
  },

  // ========== 实验性功能 ==========
  experimental: {
    // 优化包导入
    optimizePackageImports: [
      "antd",
      "@ant-design/icons",
      "lucide-react",
      "react-markdown",
    ],
  },

  // ========== 图片优化 ==========
  images: {
    domains: ["api.dicebear.com"],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60, // 图片缓存时间（秒）
  },

  // ========== 生产环境优化 ==========
  productionBrowserSourceMaps: false, // 禁用生产环境 source maps（减小体积）
};

export default nextConfig;

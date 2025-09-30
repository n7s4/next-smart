import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
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
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@images": path.resolve(__dirname, "path/to/images"),
    };
    return config;
  },
};

export default nextConfig;

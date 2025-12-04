"use client";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import Layout from "../Layout";

// 不需要 Layout 组件的路由
const routesWithoutLayout = ["/login", "/register"];

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const shouldShowLayout = useMemo(
    () => !routesWithoutLayout.includes(pathname),
    [pathname]
  );

  if (shouldShowLayout) {
    return <Layout>{children}</Layout>;
  }

  return <>{children}</>;
}

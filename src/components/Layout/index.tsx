"use client";
import React, { useMemo, useCallback } from "react";
import { Menu } from "antd";
import type { MenuProps } from "antd";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Avatar } from "../ui/avatar";
import GAvatar from "../gavatar";
import AIAssistant from "../AIAssistant";

type MenuItem = Required<MenuProps>["items"][number];

const defaultNavItems: MenuItem[] = [
  { label: "首页", key: "/" },
  { label: "羽说", key: "/gptchat" },
  { label: "加载示例", key: "/load" },
  { label: "博客", key: "/blog" },
  { label: "星羽天气", key: "/weather" },
  { label: "星羽楼", key: "/foods" },
];

export default function Layout({
  children,
  navItems = defaultNavItems,
  footerText = "© 2025 Smart App. All rights reserved.",
}: {
  children: React.ReactNode;
  navItems?: MenuItem[];
  footerText?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

  const onClick: MenuProps["onClick"] = useCallback(
    (e) => {
      if (e.key && e.key !== pathname) {
        router.push(String(e.key));
      }
    },
    [router, pathname]
  );

  const username = useMemo(
    () => session?.user?.name || session?.user?.email || "未登录",
    [session?.user?.name, session?.user?.email]
  );

  return (
    <div className="min-h-screen flex flex-col gradient-hero text-foreground overflow-x-hidden">
      <header className="fixed top-0 inset-x-0 z-50 glass shadow-ai">
        <div className="w-full px-4 sm:px-6">
          <div className="h-14 sm:h-16 flex items-center justify-between gap-4">
            <a
              href="/"
              className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground hover:opacity-90 transition-opacity"
            >
              <span className="bg-linear-to-r from-cyan-600 to-violet-600 bg-clip-text text-transparent">
                Smart
              </span>
              <span className="text-muted-foreground font-medium">App</span>
            </a>
            <nav className="flex-1 flex justify-center">
              <Menu
                onClick={onClick}
                mode="horizontal"
                items={navItems}
                selectedKeys={[pathname]}
                className="border-none bg-transparent min-w-0 w-full max-w-xl [&_.ant-menu-item]:rounded-lg [&_.ant-menu-item-selected]:bg-primary/10 [&_.ant-menu-item-selected]:text-primary [&_.ant-menu-item]:text-muted-foreground [&_.ant-menu-item:hover]:text-foreground [&_.ant-menu-item]:transition-colors"
              />
            </nav>
            <div className="flex items-center shrink-0">
              <GAvatar username={username} />
            </div>
          </div>
        </div>
      </header>
      {/* <div className="fixed top-[40%] -right-[20px] z-50 transition-transform duration-300 hover:-translate-x-[30px]">
        <AIAssistant />
      </div> */}
      <main className="flex-1 pt-16 sm:pt-20 w-full">
        <div className="w-full min-h-[calc(100vh-4rem)] pt-6 sm:pt-8 px-0">
          {children}
        </div>
      </main>

      {/* <div className="border-t border-border bg-card">
        <div className="mx-auto w-full max-w-7xl px-4">
          <div className="h-12 flex items-center text-sm text-muted-foreground">
            {footerText}
          </div>
        </div>
      </div> */}
    </div>
  );
}

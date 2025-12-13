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
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden">
      <div className="fixed top-0 inset-x-0 z-50 border-b border-border bg-card">
        <div className="mx-auto w-full max-w-7xl px-4">
          <div className="h-14 flex items-center justify-between">
            <div className="text-base font-medium">Smart App</div>
            <nav className="flex-1 pl-6 border-none">
              <Menu
                onClick={onClick}
                mode="horizontal"
                items={navItems}
                selectedKeys={[pathname]}
                className=" border-none bg-transparent"
              />
            </nav>
            <div className="text-base font-medium">
              <div>
                <GAvatar username={username} />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* <div className="fixed top-[40%] -right-[20px] z-50 transition-transform duration-300 hover:-translate-x-[30px]">
        <AIAssistant />
      </div> */}
      <div className="flex-1 mt-10">
        <div className="mx-auto w-full px-4 py-6">{children}</div>
      </div>

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

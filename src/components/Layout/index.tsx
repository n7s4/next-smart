"use client";
import React from "react";
import { Menu } from "antd";
import type { MenuProps } from "antd";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Avatar } from "../ui/avatar";
import GAvatar from "../gavatar";

type MenuItem = Required<MenuProps>["items"][number];

const defaultNavItems: MenuItem[] = [
  { label: "首页", key: "/" },
  { label: "AI 盒子", key: "/chat" },
  { label: "加载示例", key: "/load" },
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
  const { data: session } = useSession();

  const onClick: MenuProps["onClick"] = (e) => {
    if (e.key) router.push(String(e.key));
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <div className="fixed top-0 inset-x-0 z-50 border-b border-border bg-card">
        <div className="mx-auto w-full max-w-7xl px-4">
          <div className="h-14 flex items-center justify-between">
            <div className="text-base font-medium">Smart App</div>
            <nav className="flex-1 pl-6 border-none">
              <Menu
                onClick={onClick}
                mode="horizontal"
                items={navItems}
                className="border-none"
              />
            </nav>
            <div className="text-base font-medium">
              <div>
                <GAvatar
                  username={
                    session?.user?.name || session?.user?.email || "未登录"
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 pt-14">
        <div className="mx-auto w-full max-w-7xl px-4 py-6">{children}</div>
      </div>

      <div className="border-t border-border bg-card">
        <div className="mx-auto w-full max-w-7xl px-4">
          <div className="h-12 flex items-center text-sm text-muted-foreground">
            {footerText}
          </div>
        </div>
      </div>
    </div>
  );
}

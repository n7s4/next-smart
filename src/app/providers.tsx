"use client";

import { SessionProvider } from "next-auth/react";
import { App, ConfigProvider } from "antd";
import React from "react";

const antdTheme = {
  token: {
    colorPrimary: "#0891b2",
    colorPrimaryHover: "#0e7490",
    borderRadius: 12,
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
  },
  components: {
    Input: {
      borderRadius: 12,
      activeBorderColor: "#0891b2",
      hoverBorderColor: "rgba(8, 145, 178, 0.5)",
    },
    Button: {
      borderRadius: 12,
      primaryShadow: "0 2px 8px rgba(8, 145, 178, 0.25)",
    },
    Menu: {
      itemBorderRadius: 8,
      itemSelectedBg: "rgba(8, 145, 178, 0.1)",
      itemSelectedColor: "#0891b2",
      itemHoverColor: "inherit",
    },
  },
};

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ConfigProvider theme={antdTheme}>
        <App>{children}</App>
      </ConfigProvider>
    </SessionProvider>
  );
}

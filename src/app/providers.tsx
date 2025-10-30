"use client";
import { SessionProvider } from "next-auth/react";
import { App } from "antd";
import React from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <App>{children}</App>
    </SessionProvider>
  );
}

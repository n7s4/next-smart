"use client";
import { useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Form, Input } from "antd";

export default function Login() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/home");
    }
  }, [status, router]);

  const onSubmit = () => {};

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold">登录</h1>
          <div className=" mt-2.5">
            <Form onFinish={onSubmit}>
              <Form.Item>
                <Input placeholder="请输入用户名" />
              </Form.Item>
              <Form.Item>
                <Input placeholder="请输入密码" />
              </Form.Item>
              <Form.Item>
                <Button className="w-full">登录</Button>
              </Form.Item>
            </Form>
          </div>
        </div>
        <div className="flex justify-center">
          <p className="mt-1 text-sm text-muted-foreground">第三方登录方式</p>
          <Button
            className="w-full"
            onClick={() => signIn("github", { callbackUrl: "/home" })}
          >
            使用 GitHub 登录
          </Button>
        </div>
      </div>
    </div>
  );
}

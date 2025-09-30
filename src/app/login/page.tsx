"use client";
import { useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Form, Input } from "antd";
import { GithubOutlined } from "@ant-design/icons";

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
        <div className="mt-6">
          <p className="text-center text-sm text-muted-foreground mb-4">
            第三方登录方式
          </p>

          <div className="flex justify-center">
            <GithubOutlined
              className="text-2xl cursor-pointer hover:text-primary transition-colors"
              onClick={() => signIn("github", { callbackUrl: "/home" })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

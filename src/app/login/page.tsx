"use client";
import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { Space, Tabs, theme, App, Button, message } from "antd";
import {
  AlipayCircleOutlined,
  LockOutlined,
  MobileOutlined,
  TaobaoCircleOutlined,
  UserOutlined,
  WeiboCircleOutlined,
  GithubOutlined,
} from "@ant-design/icons";
import {
  LoginForm,
  ProConfigProvider,
  ProFormCaptcha,
  ProFormCheckbox,
  ProFormText,
  setAlpha,
} from "@ant-design/pro-components";
import { loginUser, createUser, ResType } from "@/lib/api/user";
import { setTokenToLocalStorage } from "@/lib/utils";
type LoginType = "phone" | "account";

export default function Login() {
  const { status } = useSession();
  const router = useRouter();
  const { message: message1 } = App.useApp();
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [status, router]);

  const { token } = theme.useToken();
  const [loginType, setLoginType] = useState<LoginType>("account");
  const [loading, setLoading] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);

  // 处理登录表单提交
  const handleLogin = async (values: any) => {
    setLoading(true);
    try {
      const res = await loginUser(values);
      console.log("res", res);
      if (res.success) {
        // 本地存储一下 token
        setTokenToLocalStorage(res.data!.token);
        messageApi.success("登录成功");
        // 登录成功后跳转到首页
        router.push("/");
      } else {
        const errorMsg = res.data?.error || "登录失败";
        messageApi.error(errorMsg);
      }
    } catch (error: any) {
      console.error("登录错误:", error);
      const errorMsg =
        error.response?.data?.error || "登录失败，请检查网络连接";
      messageApi.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // 创建测试用户
  const handleCreateUser = async () => {
    setCreatingUser(true);
    try {
      const testUser = {
        username: `testuser_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
        password: "testpassword123",
      };

      const res = await createUser(testUser);
      console.log("res", res);
      if (res.success) {
        messageApi.success(
          `用户创建成功！用户名: ${testUser.username}, 密码: ${testUser.password}`
        );
      } else {
        messageApi.error("用户创建失败");
      }
    } catch (error: any) {
      console.error("创建用户错误:", error);
      const errorMsg = error.response?.data?.error || "创建用户失败";
      messageApi.error(errorMsg);
    } finally {
      setCreatingUser(false);
    }
  };

  const iconStyles: CSSProperties = {
    marginInlineStart: "16px",
    color: setAlpha(token.colorTextBase, 0.2),
    fontSize: "24px",
    verticalAlign: "middle",
    cursor: "pointer",
  };

  return (
    <ProConfigProvider hashed={false}>
      <div
        className="text-cente mt-[100px]"
        style={{
          backgroundColor: token.colorBgContainer,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <LoginForm
          onFinish={handleLogin}
          submitter={{
            searchConfig: {
              submitText: "登录",
            },
            submitButtonProps: {
              loading: loading,
              size: "large",
              style: {
                width: "100%",
              },
            },
          }}
          actions={
            <div className="flex flex-col gap-y-2">
              <div>
                其他登录方式
                <AlipayCircleOutlined style={iconStyles} />
                <TaobaoCircleOutlined style={iconStyles} />
                <WeiboCircleOutlined style={iconStyles} />
                <GithubOutlined
                  style={iconStyles}
                  onClick={() => signIn("github", { callbackUrl: "/" })}
                />
              </div>
              <div>
                还没有账号吗？
                <a onClick={() => router.push("/register")}>去注册</a>
              </div>
            </div>
          }
        >
          <div className=" text-center mt-[100px] mb-[20px]">星途</div>
          {loginType === "account" && (
            <>
              <ProFormText
                name="username"
                fieldProps={{
                  size: "large",
                  prefix: <UserOutlined className={"prefixIcon"} />,
                }}
                placeholder={"用户名: admin or user"}
                rules={[
                  {
                    required: true,
                    message: "请输入用户名!",
                  },
                ]}
              />
              <ProFormText.Password
                name="password"
                fieldProps={{
                  size: "large",
                  prefix: <LockOutlined className={"prefixIcon"} />,
                  strengthText:
                    "Password should contain numbers, letters and special characters, at least 8 characters long.",
                  statusRender: (value) => {
                    const getStatus = () => {
                      if (value && value.length > 12) {
                        return "ok";
                      }
                      if (value && value.length > 6) {
                        return "pass";
                      }
                      return "poor";
                    };
                    const status = getStatus();
                    if (status === "pass") {
                      return (
                        <div style={{ color: token.colorWarning }}>
                          强度：中
                        </div>
                      );
                    }
                    if (status === "ok") {
                      return (
                        <div style={{ color: token.colorSuccess }}>
                          强度：强
                        </div>
                      );
                    }
                    return (
                      <div style={{ color: token.colorError }}>强度：弱</div>
                    );
                  },
                }}
                placeholder={"密码: ant.design"}
                rules={[
                  {
                    required: true,
                    message: "请输入密码！",
                  },
                ]}
              />
            </>
          )}
          <div
            style={{
              marginBlockEnd: 24,
            }}
          >
            <ProFormCheckbox noStyle name="autoLogin">
              自动登录
            </ProFormCheckbox>
            <a
              style={{
                float: "right",
              }}
            >
              忘记密码
            </a>
          </div>
        </LoginForm>
      </div>
      <div style={{ marginTop: 16, textAlign: "center" }}>
        <Button onClick={handleCreateUser} loading={creatingUser} type="dashed">
          创建测试用户
        </Button>
      </div>
    </ProConfigProvider>
  );
}

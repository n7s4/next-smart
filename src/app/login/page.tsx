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
import { loginUser, createUser } from "@/lib/api/user";
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
  const [loginType, setLoginType] = useState<LoginType>("phone");
  const [loading, setLoading] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);

  // 处理登录表单提交
  const handleLogin = async (values: any) => {
    setLoading(true);
    try {
      const res = await loginUser(values);
      if (res.status === 200 && res.data.success) {
        // 本地存储一下 token
        setTokenToLocalStorage(res.data.data.token);
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
      if (res.status === 201 && res.data.success) {
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
                还没有账号吗？<a>去注册</a>
              </div>
            </div>
          }
        >
          <div className=" text-center mt-[100px] mb-[20px]">星途</div>
          <Tabs
            centered
            activeKey={loginType}
            onChange={(activeKey) => setLoginType(activeKey as LoginType)}
          >
            <Tabs.TabPane key={"account"} tab={"账号密码登录"} />
            <Tabs.TabPane key={"phone"} tab={"手机号登录"} />
          </Tabs>
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
          {loginType === "phone" && (
            <>
              <ProFormText
                fieldProps={{
                  size: "large",
                  prefix: <MobileOutlined className={"prefixIcon"} />,
                }}
                name="mobile"
                placeholder={"手机号"}
                rules={[
                  {
                    required: true,
                    message: "请输入手机号！",
                  },
                  {
                    pattern: /^1\d{10}$/,
                    message: "手机号格式错误！",
                  },
                ]}
              />
              <ProFormCaptcha
                fieldProps={{
                  size: "large",
                  prefix: <LockOutlined className={"prefixIcon"} />,
                }}
                captchaProps={{
                  size: "large",
                }}
                placeholder={"请输入验证码"}
                captchaTextRender={(timing, count) => {
                  if (timing) {
                    return `${count} ${"获取验证码"}`;
                  }
                  return "获取验证码";
                }}
                name="captcha"
                rules={[
                  {
                    required: true,
                    message: "请输入验证码！",
                  },
                ]}
                onGetCaptcha={async () => {
                  // 模拟获取验证码
                  setTimeout(() => {
                    message1.success("获取验证码成功！验证码为：1234");
                  }, 100);
                }}
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

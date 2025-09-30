"use client";
import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { Space, Tabs, theme, App, Button } from "antd";
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
type LoginType = "phone" | "account";
import { createUser } from "@/lib/api/user";

export default function Login() {
  const { status } = useSession();
  const router = useRouter();
  const { message } = App.useApp();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [status, router]);

  const { token } = theme.useToken();
  const [loginType, setLoginType] = useState<LoginType>("phone");
  const [loading, setLoading] = useState(false);

  // 处理登录表单提交
  const handleLogin = async (values: any) => {
    // setLoading(true);
    // try {
    //   if (loginType === "account") {
    //     // 用户名密码登录
    //     const result = await signIn("credentials", {
    //       username: values.username,
    //       password: values.password,
    //       redirect: false,
    //     });
    //     console.log("result", result);
    //     if (result?.error) {
    //       message.error("用户名或密码错误");
    //     } else if (result?.ok) {
    //       message.success("登录成功");
    //       // 登录成功后跳转到主页
    //       router.push("/");
    //     } else {
    //       message.error("登录失败，请重试");
    //     }
    //   } else if (loginType === "phone") {
    //     // 手机号验证码登录
    //     const result = await signIn("phone", {
    //       mobile: values.mobile,
    //       captcha: values.captcha,
    //       redirect: false,
    //     });

    //     if (result?.error) {
    //       message.error("验证码错误或手机号不存在");
    //     } else if (result?.ok) {
    //       message.success("登录成功");
    //       // 登录成功后跳转到主页
    //       router.push("/");
    //     } else {
    //       message.error("登录失败，请重试");
    //     }
    //   }
    // } catch (error) {
    //   message.error("登录失败，请重试");
    //   console.error("Login error:", error);
    // } finally {
    //   setLoading(false);
    // }

    setLoading(true);
    try {
    } catch (error) {}
    fetch("/api/user", {
      method: "GET",
    })
      .then((res) => res.json())
      .then((data) => console.log(data));
  };

  const iconStyles: CSSProperties = {
    marginInlineStart: "16px",
    color: setAlpha(token.colorTextBase, 0.2),
    fontSize: "24px",
    verticalAlign: "middle",
    cursor: "pointer",
  };
  // test create
  const create = () => {
    createUser();
  };
  return (
    <ProConfigProvider hashed={false}>
      <div
        style={{
          backgroundColor: token.colorBgContainer,
          minHeight: "100vh",
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
            <Space>
              其他登录方式
              <AlipayCircleOutlined style={iconStyles} />
              <TaobaoCircleOutlined style={iconStyles} />
              <WeiboCircleOutlined style={iconStyles} />
              <GithubOutlined
                style={iconStyles}
                onClick={() => signIn("github", { callbackUrl: "/" })}
              />
            </Space>
          }
        >
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
                  message.success("获取验证码成功！验证码为：1234");
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
      <div>
        <Button onClick={create}>创建一个用户</Button>
      </div>
    </ProConfigProvider>
  );
}

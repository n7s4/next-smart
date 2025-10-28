"use client";
import React, { useState } from "react";
import type { FormItemProps, FormProps } from "antd";
import { Button, Form, Input, message } from "antd";
import { useRouter } from "next/navigation";
import "@ant-design/v5-patch-for-react-19";
import { createUser } from "@/lib/api/user";

const formItemLayout: FormProps = {
  labelCol: {
    xs: { span: 24 },
    sm: { span: 8 },
  },
  wrapperCol: {
    xs: { span: 24 },
    sm: { span: 16 },
  },
};

const tailFormItemLayout: FormItemProps = {
  wrapperCol: {
    xs: {
      span: 24,
      offset: 0,
    },
    sm: {
      span: 16,
      offset: 8,
    },
  },
};

interface RegisterForm {
  email: string;
  password: string;
  username: string;
}

const Register: React.FC = () => {
  const [form] = Form.useForm();
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();

  const onFinish = async (values: RegisterForm) => {
    try {
      const res = await createUser(values);
      if (res.success) {
        message.open({
          type: "success",
          content: `用户创建成功！用户名: ${values.username}, 即将跳转至登录页`,
          duration: 3,
        });
        router.push("/login");
      } else {
        message.open({
          type: "error",
          content: "用户创建失败",
          duration: 3,
        });
      }
    } catch (error) {
      message.open({
        type: "error",
        content: `创建用户错误${error}}`,
        duration: 3,
      });
      const errorMsg = error.response?.data?.error || "创建用户失败";
      messageApi.error(errorMsg);
    }
  };

  return (
    <div className="flex justify-center items-center h-[100vh]">
      <Form
        {...formItemLayout}
        form={form}
        name="register"
        onFinish={onFinish}
        style={{ maxWidth: 600 }}
        scrollToFirstError
      >
        <Form.Item
          name="username"
          label="用户名"
          tooltip="What do you want others to call you?"
          rules={[
            {
              required: true,
              message: "Please input your username!",
              whitespace: true,
            },
          ]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="email"
          label="E-mail"
          rules={[
            {
              type: "email",
              message: "The input is not valid E-mail!",
            },
            {
              required: true,
              message: "Please input your E-mail!",
            },
          ]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="password"
          label="密码"
          rules={[
            {
              required: true,
              message: "请输入密码",
            },
          ]}
          hasFeedback
        >
          <Input.Password />
        </Form.Item>

        {/* <Form.Item
          name="confirm"
          label="确认密码"
          dependencies={["password"]}
          hasFeedback
          rules={[
            {
              required: true,
              message: "确认密码",
            },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("password") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error("The new password that you entered do not match!")
                );
              },
            }),
          ]}
        >
          <Input.Password />
        </Form.Item> */}

        <Form.Item {...tailFormItemLayout}>
          <div className="flex gap-3">
            <Button type="primary" htmlType="submit" className="flex-1">
              注册
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              className="flex-3"
              onClick={() => router.push("/login")}
            >
              返回至登录页
            </Button>
          </div>
        </Form.Item>
      </Form>
    </div>
  );
};

export default Register;

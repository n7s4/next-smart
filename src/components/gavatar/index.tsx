import { FC } from "react";
import { Avatar } from "antd";
import { DownOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Dropdown, Space } from "antd";
import { logoutUser } from "@/lib/api/user/index";
import { removeTokenFromLocalStorage } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

interface GAvatarProps {
  username: string;
  src?: string;
}

const items: MenuProps["items"] = [
  { label: "个人中心", key: "profile" },
  { label: "设置", key: "settings" },
  { label: "退出登录", key: "logout" },
];

const GAvatar: FC<GAvatarProps> = (props: GAvatarProps) => {
  const { src, username } = props;
  const router = useRouter();

  // 点击下拉菜单
  const handleMenuClick: MenuProps["onClick"] = async (e) => {
    if (e.key === "logout") {
      // 退出登录
      const res = await logoutUser();
      if (res.success) {
        await signOut();

        // 清除客户端存储的token
        removeTokenFromLocalStorage();
        // 跳转到登录页
        router.push("/login");
      }
    }
  };

  return (
    <div className="flex items-center">
      <Avatar
        src={src}
        alt="avatar"
        className="w-full h-full object-cover"
      ></Avatar>
      <Dropdown className="ml-2" menu={{ items, onClick: handleMenuClick }}>
        <a onClick={(e) => e.preventDefault()}>
          <Space>
            {username}
            <DownOutlined />
          </Space>
        </a>
      </Dropdown>
    </div>
  );
};
export default GAvatar;

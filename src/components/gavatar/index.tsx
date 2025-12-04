import { FC, useCallback, memo } from "react";
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

const GAvatar: FC<GAvatarProps> = memo((props: GAvatarProps) => {
  const { src, username } = props;
  const router = useRouter();

  // 点击下拉菜单
  const handleMenuClick: MenuProps["onClick"] = useCallback(
    async (e) => {
      if (e.key === "logout") {
        // 退出登录
        const res = await logoutUser();
        if (res.success) {
          // 清除客户端存储的token
          removeTokenFromLocalStorage();
          await signOut({
            callbackUrl: "/login",
          });
        }
      }
    },
    [router]
  );

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
});

GAvatar.displayName = "GAvatar";

export default GAvatar;

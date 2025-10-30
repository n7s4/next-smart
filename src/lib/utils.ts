import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 存储token
export const setTokenToLocalStorage = (token: string) => {
  localStorage.setItem("token", token);
};

// 读取token
export const getTokenFromLocalStorage = () => {
  return localStorage.getItem("token");
};

// 移除token
export const removeTokenFromLocalStorage = () => {
  localStorage.removeItem("token");
};

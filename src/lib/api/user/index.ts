/**
 * user 用户相关的所有接口
 */
import apiFetch from "@/lib/http";
import { ApiResponse } from "@/lib/definitions";
const BASE_URL = "/user";

// 用户登录接口参数类型
export interface LoginParams {
  username: string;
  password: string;
}

// 用户创建接口参数类型
export interface CreateUserParams {
  username: string;
  email: string;
  password: string;
}

export interface ResType<T> {
  data: T;
  message: string;
  success: boolean;
}

// 登录成功返回结构（与 /api/user/login 对齐）
export interface LoginSuccessData {
  user: Record<string, unknown>;
  token: string;
  tokenType: "Bearer";
  expiresIn: string; // e.g. "7d"
}

/**
 * 用户登录
 */
export const loginUser = async (
  params: LoginParams
): Promise<ApiResponse<LoginSuccessData>> => {
  const res = await apiFetch.post<ApiResponse<LoginSuccessData>, LoginParams>(
    `${BASE_URL}/login`,
    params
  );
  return res.data;
};

/**
 * 创建一个用户
 */
export const createUser = async (
  params: CreateUserParams
): Promise<ApiResponse<Record<string, unknown>>> => {
  const res = await apiFetch.post<
    ApiResponse<Record<string, unknown>>,
    CreateUserParams
  >(`${BASE_URL}`, params);
  return res.data;
};

/**
 * 根据id查找用户
 */
export const findUserById = async (
  id: string
): Promise<ApiResponse<Record<string, unknown>>> => {
  const res = await apiFetch.get<ApiResponse<Record<string, unknown>>>(
    `${BASE_URL}/${id}`
  );
  return res.data;
};

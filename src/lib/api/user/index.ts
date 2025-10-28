/**
 * user 用户相关的所有接口
 */
import axios from "axios";
const BASE_URL = "/api";

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

/**
 * 用户登录
 */
export const loginUser = async (params: LoginParams) => {
  const res = await axios.post(`${BASE_URL}/user/login`, params, {
    headers: {
      "Content-Type": "application/json",
    },
  });
  return res;
};

/**
 * 创建一个用户
 */
export const createUser = async (params: CreateUserParams) => {
  const res = await axios.post(`${BASE_URL}/user`, params);
  return res;
};

/**
 * 根据id查找用户
 */
export const findUserById = async (id: string) => {
  const res = await axios.get(`${BASE_URL}/user/${id}`);
  return res;
};

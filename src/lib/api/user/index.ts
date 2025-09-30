/**
 * user 用户相关的所有接口
 */
import axios from "axios";
const BASE_URL = "/api";

/**
 * 创建一个用户
 */
export const createUser = async () => {
  const res = await axios.get(`${BASE_URL}/user`);
  return res;
};

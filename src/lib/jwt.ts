import jwt from "jsonwebtoken";

// JWT密钥，在生产环境中应该从环境变量获取
const JWT_SECRET = process.env.JWT_SECRET || "20250712wxwithjmfopengoodday";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d"; // 默认7天过期

// Token载荷接口
export interface TokenPayload {
  userId: number;
  username: string;
  email?: string;
  isActive: boolean;
  isSuperuser: boolean;
  iat?: number; // 签发时间
  exp?: number; // 过期时间
}

// 生成JWT token
export function generateToken(
  payload: Omit<TokenPayload, "iat" | "exp">
): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: "smart-app", // 签发者
    audience: "smart-users", // 受众
  } as jwt.SignOptions);
}

// 验证JWT token
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: "smart-app",
      audience: "smart-users",
    }) as TokenPayload;
    return decoded;
  } catch (error) {
    console.error("Token验证失败:", error);
    return null;
  }
}

// 从请求头中提取token
export function extractTokenFromHeader(
  authHeader: string | null
): string | null {
  if (!authHeader) return null;

  // 支持 "Bearer <token>" 格式
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // 也支持直接传递token
  return authHeader;
}

// 检查token是否即将过期（在24小时内过期）
export function isTokenExpiringSoon(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as TokenPayload;
    if (!decoded || !decoded.exp) return false;

    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = decoded.exp - now;
    const oneDayInSeconds = 24 * 60 * 60;

    return timeUntilExpiry <= oneDayInSeconds;
  } catch {
    return false;
  }
}

// 刷新token（生成新的token，保持相同的载荷但更新过期时间）
export function refreshToken(oldToken: string): string | null {
  try {
    const decoded = jwt.decode(oldToken) as TokenPayload;
    if (!decoded) return null;

    // 移除时间相关字段，重新生成
    const { iat: _iat, exp: _exp, ...payload } = decoded;
    return generateToken(payload);
  } catch {
    return null;
  }
}

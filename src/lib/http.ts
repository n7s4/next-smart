// 轻量封装全局 fetch，自动附带通用请求头与 token
import { getTokenFromLocalStorage, removeTokenFromLocalStorage } from "./utils";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiResponseShape<T = unknown> {
  status: number;
  data: T;
  ok: boolean;
}

export interface FetchOptions<TBody = unknown> {
  headers?: Record<string, string>;
  body?: TBody;
  method?: HttpMethod;
  // 允许传入绝对路径或以 / 开头的相对 API 路径
}

export interface ApiFetch {
  get<T = unknown>(
    url: string,
    opts?: Omit<FetchOptions, "method" | "body">
  ): Promise<ApiResponseShape<T>>;
  post<T = unknown, TBody = unknown>(
    url: string,
    body?: TBody,
    opts?: Omit<FetchOptions<TBody>, "method">
  ): Promise<ApiResponseShape<T>>;
  put<T = unknown, TBody = unknown>(
    url: string,
    body?: TBody,
    opts?: Omit<FetchOptions<TBody>, "method">
  ): Promise<ApiResponseShape<T>>;
  patch<T = unknown, TBody = unknown>(
    url: string,
    body?: TBody,
    opts?: Omit<FetchOptions<TBody>, "method">
  ): Promise<ApiResponseShape<T>>;
  delete<T = unknown>(
    url: string,
    opts?: Omit<FetchOptions, "method" | "body">
  ): Promise<ApiResponseShape<T>>;
}

const BASE_URL = "/api";

function buildUrl(input: string) {
  if (
    input.startsWith("http://") ||
    input.startsWith("https://") ||
    input.startsWith("/api")
  ) {
    return input;
  }
  // 其他相对路径统一拼到 /api 下
  return `${BASE_URL}${input.startsWith("/") ? input : `/${input}`}`;
}

let refreshingPromise: Promise<string | null> | null = null;

async function requestRefreshToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getTokenFromLocalStorage() || ""}`,
      },
      credentials: "same-origin",
    });
    if (!res.ok) return null;
    const data = await res.json();
    const token = (data && data.data && data.data.token) || null;
    if (token) {
      try {
        localStorage.setItem("token", token);
      } catch {}
      return token;
    }
    return null;
  } catch {
    return null;
  }
}

async function coreFetch<T = unknown, TBody = unknown>(
  input: string,
  options: FetchOptions<TBody> = {}
): Promise<ApiResponseShape<T>> {
  const url = buildUrl(input);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // 客户端环境自动附带 token
  try {
    if (typeof window !== "undefined") {
      const token = getTokenFromLocalStorage();
      if (token && !headers.Authorization) {
        headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch {
    // 读取 token 失败时静默处理
  }

  const fetchInit: RequestInit = {
    method: options.method || "GET",
    headers,
    body:
      options.body !== undefined && options.body !== null
        ? typeof options.body === "string"
          ? (options.body as unknown as BodyInit)
          : (JSON.stringify(options.body) as unknown as BodyInit)
        : undefined,
    credentials: "same-origin",
  };

  let res = await fetch(url, fetchInit);

  // 401：尝试刷新 token 并重试一次
  if (res.status === 401 && typeof window !== "undefined") {
    if (!refreshingPromise) {
      refreshingPromise = requestRefreshToken().finally(() => {
        setTimeout(() => {
          refreshingPromise = null;
        }, 0);
      });
    }
    const newToken = await refreshingPromise;
    if (newToken) {
      const retryHeaders: Record<string, string> = {
        ...headers,
        Authorization: `Bearer ${newToken}`,
      };
      const retryInit: RequestInit = { ...fetchInit, headers: retryHeaders };
      res = await fetch(url, retryInit);
    } else {
      try {
        removeTokenFromLocalStorage();
      } catch {}
      try {
        const loginUrl = "/login";
        window.location.href = loginUrl;
      } catch {}
    }
  }
  let data: T = undefined as unknown as T;
  const contentType = res.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) {
    try {
      data = (await res.json()) as T;
    } catch {
      data = undefined as unknown as T;
    }
  } else {
    try {
      data = (await res.text()) as unknown as T;
    } catch {
      data = undefined as unknown as T;
    }
  }

  return { status: res.status, data, ok: res.ok };
}

export const apiFetch: ApiFetch = {
  get: <T = unknown>(
    url: string,
    opts?: Omit<FetchOptions, "method" | "body">
  ) => coreFetch<T>(url, { ...opts, method: "GET" }),
  post: <T = unknown, TBody = unknown>(
    url: string,
    body?: TBody,
    opts?: Omit<FetchOptions<TBody>, "method">
  ) => coreFetch<T, TBody>(url, { ...opts, method: "POST", body }),
  put: <T = unknown, TBody = unknown>(
    url: string,
    body?: TBody,
    opts?: Omit<FetchOptions<TBody>, "method">
  ) => coreFetch<T, TBody>(url, { ...opts, method: "PUT", body }),
  patch: <T = unknown, TBody = unknown>(
    url: string,
    body?: TBody,
    opts?: Omit<FetchOptions<TBody>, "method">
  ) => coreFetch<T, TBody>(url, { ...opts, method: "PATCH", body }),
  delete: <T = unknown>(
    url: string,
    opts?: Omit<FetchOptions, "method" | "body">
  ) => coreFetch<T>(url, { ...opts, method: "DELETE" }),
};

export default apiFetch;

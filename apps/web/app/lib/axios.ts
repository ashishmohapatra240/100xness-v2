import axios from "axios";
import { queryClient } from "./queryClient";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.100xness.ashishmohapatra.in";

const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

export const publicAxios = axios.create({
  baseURL: API_URL,
  withCredentials: false,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    const requestUrl =
      typeof originalRequest?.url === "string" ? originalRequest.url : "";
    const public401SafePaths = ["/candles"];
    const isPublicPath = public401SafePaths.some((p) =>
      requestUrl.startsWith(p)
    );

    const isAuthPage =
      typeof window !== "undefined" &&
      (window.location.pathname.includes("/login") ||
        window.location.pathname.includes("/register"));

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthPage &&
      !isPublicPath
    ) {
      originalRequest._retry = true;

      if (typeof window !== "undefined") {
        queryClient.clear();
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;

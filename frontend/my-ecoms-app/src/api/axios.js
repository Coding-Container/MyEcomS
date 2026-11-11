import axios from "axios";
import { toast } from "react-toastify";
import { getToken, logout } from "../auth";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV
      ? "http://localhost:5000"
      : "https://myecoms-api.onrender.com"),
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || "";
    const hasBearerToken = Boolean(
      error.config?.headers?.Authorization ||
        error.config?.headers?.get?.("Authorization"),
    );
    const isAuthenticationRequest =
      /\/api\/users\/(login|signup|verify-otp|forgot-password|verify-reset-otp|reset-password)/.test(
        requestUrl,
      );
    if (
      error.response?.status === 401 &&
      hasBearerToken &&
      !isAuthenticationRequest
    ) {
      if (localStorage.getItem("userInfo")) {
        logout();
        toast.error("Session expired. Please login again.");
        window.dispatchEvent(new Event("auth:expired"));
      }
    }

    return Promise.reject(error);
  },
);

export default api;

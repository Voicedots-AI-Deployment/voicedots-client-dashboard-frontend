import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const setAuthHeader = (token: string | null) => {
  if (token) {
    localStorage.setItem("access_token", token);
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    localStorage.removeItem("access_token");
    delete apiClient.defaults.headers.common.Authorization;
  }
};

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
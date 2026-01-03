import axios from "axios";

const apiClient = axios.create({
  baseURL: "http://localhost/HackMe/server/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Unexpected network error";
    return Promise.reject(new Error(message));
  }
);

export default apiClient;






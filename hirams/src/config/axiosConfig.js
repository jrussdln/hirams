import axios from "axios";
import { ENV } from "./env";
import { getItem } from "../utils/storage/localStorage";
import { clearClientState } from "../utils/auth/clearClientState";

const BASE_PATH = import.meta.env.MODE === "production" ? "/hirams" : "/";

// Create Axios instance
const apiClient = axios.create({
  baseURL: ENV.API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 120000, // optional: 30s timeout
});

// ── Request Interceptor → Attach Token ───────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ── Helpers ────────────────────────────────────────────
const isSessionExpired = (status, data, endpoint = "") => {
  if (endpoint?.includes("login")) return false;
  return (
    status === 401 ||
    status === 419 ||
    (status === 500 &&
      typeof data === "string" &&
      data.includes("Route [login] not defined"))
  );
};

const createError = (data, status) => {
  const message = data?.message || data?.warning || "Request failed";
  const error = new Error(message);
  error.status = status;
  error.data = data;
  return error;
};

/** Silently wipes state and redirects to login — no confirmation prompt,
 *  since this fires automatically on an expired/invalid session, not on
 *  a user-initiated sign-out (that's what useLogout is for). The
 *  `?reason=expired` flag is what lets the login form say WHY the user is
 *  staring at it again instead of just showing a blank form. */
const handleSessionExpired = async () => {
  await clearClientState();
  window.location.href = `${BASE_PATH}?reason=expired`;
};

// ── Response Interceptor → Handle Errors & Session ────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const endpoint = error.config?.url || "";
    const status = error.response?.status;
    const data = error.response?.data;

    // Auto-logout on expired session
    if (isSessionExpired(status, data, endpoint)) {
      await handleSessionExpired();
      return Promise.reject(createError("Session expired", status));
    }

    // Re-throw consistent error shape
    if (error.response) {
      return Promise.reject(createError(data, status));
    }
    return Promise.reject(error); // network / no response
  },
);

export default apiClient;

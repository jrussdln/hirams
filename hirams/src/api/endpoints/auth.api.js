import api from "../axios";

export const AuthAPI = {
  login: (payload) => api.post("auth/login", payload),
  register: (payload) => api.post("auth/register", payload),
  logout: (userId) => api.post("logout", { nUserId: userId }),
  logoutAll: () => api.post("auth/logout-all"),
  checkUsername: (payload) => api.post("auth/check-username", payload),
  forgotPassword: (payload) => api.post("auth/forgot-password", payload),
  sendOtp: (payload) => api.post("auth/send-otp", payload),
  verifyOtp: (payload) => api.post("auth/verify-otp", payload),
  validateResetToken: (payload) => api.post("auth/validate-reset-token", payload),
  resetPassword: (payload) => api.post("auth/reset-password", payload),
  verifyPassword: (payload) => api.post("auth/verify-password", payload),
};

export default AuthAPI;
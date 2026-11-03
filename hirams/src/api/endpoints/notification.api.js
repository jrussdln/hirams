import api from "../axios.js";

export const NotificationAPI = {
  list: async () => {
    const response = await api.get("/notifications");
    return response; // { data: [...], unreadCount: n }
  },
  markRead: async (id) => {
    const response = await api.put(`/notifications/${id}/read`);
    return response;
  },
  markAllRead: async () => {
    const response = await api.put("/notifications/read-all");
    return response;
  },
  remove: async (id) => {
    const response = await api.delete(`/notifications/${id}`);
    return response;
  },
};

export default NotificationAPI;

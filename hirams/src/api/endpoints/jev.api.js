import api from "../axios.js";

export const JevAPI = {
  getAll: () => api.get("/jev"),
  // { V: 12, R: 3, … } — grouped totals for the sidebar sub-items.
  getCounts: () => api.get("/jev/counts"),
  getById: (id, config) => api.get(`/jev/${id}`, config),
  getByLink: (link) => api.get(`/jev/by-link/${link}`),
  create: (data) => api.post("/jev", data),
  update: (id, data) => api.put(`/jev/${id}`, data),
  delete: (id) => api.delete(`/jev/${id}`),
};

export default JevAPI;
import api from "../axios.js";

export const JevEntriesAPI = {
  getAll: () => api.get("/jev-entries"),
  getById: (id) => api.get(`/jev-entries/${id}`),
  getByJevId: (jevId, config) => api.get(`/jev-entries/by-jev/${jevId}`, config),
  create: (data, config) => api.post("/jev-entries", data, config),
  update: (id, data, config) => api.put(`/jev-entries/${id}`, data, config),
  delete: (id) => api.delete(`/jev-entries/${id}`),
};

export default JevEntriesAPI;
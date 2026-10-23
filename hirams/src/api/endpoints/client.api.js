import api from "../axios.js";

export const ClientAPI = {
  getClients: () => api.get("clients"),
  getActiveClients: () => api.get("client/active"),
  createClient: (payload) => api.post("clients", payload),
  updateClient: (id, payload) => api.put(`clients/${id}`, payload),
  updateStatus: (id, payload) => api.patch(`clients/${id}/status`, payload),
  deleteClient: (id) => api.delete(`clients/${id}`),
  // The transactions this client is the buyer on.
  getTransactions: (id) => api.get(`clients/${id}/transactions`),
  // Hands those transactions over to another (active) client.
  transferTransactions: (id, payload) => api.post(`clients/${id}/transfer`, payload),
};

export default ClientAPI;
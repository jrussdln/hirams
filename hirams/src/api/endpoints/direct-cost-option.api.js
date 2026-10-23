import api from "../axios.js";

export const DirectCostOptionAPI = {
  // getDirectCosts: () => api.get("direct-cost-options"),
  getDirectCostOptions: () => api.get("direct-cost-options"),
  createDirectCostOption: (payload) => api.post("direct-cost-options", payload),
  updateDirectCostOption: (id, payload) => api.put(`direct-cost-options/${id}`, payload),
  deleteDirectCostOption: (id) => api.delete(`direct-cost-options/${id}`),
  // The transactions charging a direct cost to this option.
  getCosts: (id) => api.get(`direct-cost-options/${id}/costs`),
  // Hands those cost lines over to another option.
  transferCosts: (id, payload) => api.post(`direct-cost-options/${id}/transfer`, payload),
};

export default DirectCostOptionAPI;
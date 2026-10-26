import api from "../axios.js";

export const PurchaseOptionAPI = {
  createOption: (payload) => api.post("purchase-options", payload),
  updateOption: (id, payload) => api.put(`purchase-options/${id}`, payload),
  updateSpecs: (id, payload) =>
    api.put(`purchase-options/${id}/update-specs`, payload, {
      headers: { "Content-Type": "application/json" },
    }),
  getSuggestions: (params) => api.get(`purchase-options/suggestions?${params}`),
  calculateEWT: (payload) =>
    api.post("purchase-options/calculate-ewt", payload),
  // ── Purchase price change requests (the price-change panel) ──
  getPriceChangeRequests: () =>
    api.get("purchase-options/price-change-requests"),
  approvePriceChange: (id) =>
    api.put(`purchase-options/${id}/approve-price-change`),
  rejectPriceChange: (id) =>
    api.put(`purchase-options/${id}/reject-price-change`),
  syncPriceChange: (id) =>
    api.put(`purchase-options/${id}/sync-price-change`),
  delete: (id) => api.delete(`purchase-options/${id}`),
};

export default PurchaseOptionAPI;

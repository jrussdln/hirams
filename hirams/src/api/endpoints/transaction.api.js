import api from "../axios.js";

export const TransactionAPI = {
  getAll: () => api.get("transactions"),
  getFinance: (params) => api.get(`transaction/finance?${params}`),
  getProcurement: (params) => api.get(`transaction/procurement?${params}`),
  getAccountOfficer: (params) =>
    api.get(`transaction/account_officer?${params}`),
  createTransaction: (payload) => api.post("transactions", payload),
  updateTransaction: (id, payload) => api.put(`transactions/${id}`, payload),
  getItems: (id) => api.get(`transactions/${id}/items`),
  getHistory: (id) => api.get(`transactions/${id}/history`),
  deleteTransaction: (id) => api.delete(`transactions/${id}`),
  revertTransaction: (id, payload) =>
    api.put(`transactions/${id}/revert`, payload),
  assignTransaction: (id, payload) =>
    api.put(`transactions/${id}/assign`, payload), // new
  approvePricing: (id, payload) =>
    api.put(`transactions/${id}/approve-pricing`, payload), // new
  getProcurementById: (id) => api.get(`transactions/${id}`), // new
  assignProcurement: (id, payload) =>
    api.post(`transactions/${id}/assign-procurement`, payload), // new
  // Archive views
  getArchived: () => api.get("transactions/archive"),
  getArchivedProcurement: (params) =>
    api.get(`transactions/archive/procurement?${params}`),
  getArchivedAccountOfficer: (params) =>
    api.get(`transactions/archive/account_officer?${params}`),

  // Archive actions
  archiveTransaction: (id, payload) =>
    api.post(`transactions/${id}/archive`, payload),
  unarchiveTransaction: (id, payload) =>
    api.post(`transactions/${id}/unarchive`, payload),
  completeTransaction: (id, payload) =>
    api.post(`transactions/${id}/completed`, payload),

  // Verify / finalize / approve action endpoints
  verifyAoCanvas: (id, payload) =>
    api.put(`transactions/${id}/verify-ao-canvas`, payload),
  verifyAo: (id, payload) => api.put(`transactions/${id}/verify-ao`, payload),
  finalizeAoCanvas: (id, payload) =>
    api.put(`transactions/${id}/finalize-ao-canvas`, payload),
  finalizeAo: (id, payload) =>
    api.put(`transactions/${id}/finalize-ao`, payload),
  verifyPricing: (id, payload) =>
    api.put(`transactions/${id}/verify-pricing`, payload),
  verify: (id, payload) => api.put(`transactions/${id}/verify`, payload),
  forceFinalize: (id, payload) =>
    api.put(`transactions/${id}/force-finalize`, payload),
  finalizePricing: (id, payload) =>
    api.put(`transactions/${id}/finalize-pricing`, payload),
  finalize: (id, payload) => api.put(`transactions/${id}/finalize`, payload),
  forCollection: (id, payload) =>
    api.put(`transactions/${id}/for-collection`, payload),
  getJev: (id) => api.get(`transactions/${id}/jev`),
  createJev: (id) => api.post(`transactions/${id}/jev`),
};

export default TransactionAPI;

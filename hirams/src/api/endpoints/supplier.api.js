import api from "../axios.js";

export const SupplierAPI = {
  getAll: () => api.get("suppliers/all"),
  getSuppliers: () => api.get("suppliers"),
  create: (payload) => api.post("suppliers", payload),
  update: (id, payload) => api.put(`suppliers/${id}`, payload),
  updateStatus: (id, payload) => api.patch(`suppliers/${id}/status`, payload),
  delete: (id) => api.delete(`suppliers/${id}`),
  // The purchase options (canvass results) that name this supplier.
  getOptions: (id) => api.get(`suppliers/${id}/options`),
  // Hands those options over to another (active) supplier.
  transferOptions: (id, payload) => api.post(`suppliers/${id}/transfer`, payload),
};

export default SupplierAPI;
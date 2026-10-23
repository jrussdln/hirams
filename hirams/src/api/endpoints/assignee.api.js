import api from "../axios.js";

export const AssigneeAPI = {
  checkExists: (payload) => api.post("assignees/check-exist", payload),
  getAssignees: (params = "") => api.get(`assignees${params ? `?${params}` : ""}`),
  createAssignee: (payload) => api.post("assignees", payload),
  updateAssignee: (id, payload) => api.put(`assignees/${id}`, payload),
  updateStatus: (id, payload) => api.patch(`assignees/${id}/status`, payload),
  deleteAssignee: (id) => api.delete(`assignees/${id}`),
  // The vouchers this assignee is on.
  getVouchers: (id) => api.get(`assignees/${id}/vouchers`),
  // Hands those vouchers over to another (active) assignee.
  transferVouchers: (id, payload) => api.post(`assignees/${id}/transfer`, payload),
};

export default AssigneeAPI;
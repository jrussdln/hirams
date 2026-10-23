import api from "../axios.js";

export const CompanyAPI = {
  getAll: () => api.get("companies"),
  getCompanies: (params) => api.get(`companies?${params}`),
  createCompany: (payload) => api.post("companies", payload),
  updateCompany: (id, payload) => api.put(`companies/${id}`, payload),
  deleteCompany: (id) => api.delete(`companies/${id}`),
  search: (query = "") =>
    api.get(`companies?search=${encodeURIComponent(query)}`),
  uploadLogo: (id, formData) =>
    api.post(`companies/${id}/logo`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  // The transactions and vouchers this company carries.
  getLinks: (id) => api.get(`companies/${id}/links`),
  // Hands them over to another company.
  transferLinks: (id, payload) => api.post(`companies/${id}/transfer`, payload),
};

export default CompanyAPI;

import api from "../axios.js";

export const VoucherAPI = {
  getVouchers: (config) => api.get("vouchers", config),
  createVoucher: (payload) => api.post("vouchers", payload),
  // Edits the voucher INFO (title, company, payee, payment terms). The
  // update endpoint nulls every omitted column, so the caller must send the
  // untouched fields along with their current values.
  updateVoucher: (nVoucherId, payload) => api.put(`vouchers/${nVoucherId}`, payload),
  updateVoucherStatus: (nVoucherId, cStatus, extra = {}) =>
    api.patch(`vouchers/${nVoucherId}/status`, { cStatus, ...extra }),
  updateVoucherForJevStatus: (nVoucherId, bIsForJev) =>
    api.patch(`vouchers/${nVoucherId}/voucher-jev-status`, { bIsForJev }),
  // Removes the voucher and the journal it raised — used when a PO is taken
  // over from an ACTIVE voucher.
  deleteVoucher: (nVoucherId) => api.delete(`vouchers/${nVoucherId}`),
  
  createJev: (nVoucherId, data) =>
    api.post(`vouchers/${nVoucherId}/create-jev`, data),
};

export default VoucherAPI;

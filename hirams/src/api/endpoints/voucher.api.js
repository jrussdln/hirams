import api from "../axios.js";

export const VoucherAPI = {
  getVouchers: () => api.get("vouchers"),
  createVoucher: (payload) => api.post("vouchers", payload),
  updateVoucherStatus: (nVoucherId, cStatus, extra = {}) =>
    api.patch(`vouchers/${nVoucherId}/status`, { cStatus, ...extra }),
  updateVoucherForJevStatus: (nVoucherId, bIsForJev) =>
    api.patch(`vouchers/${nVoucherId}/voucher-jev-status`, { bIsForJev }),
  
  createJev: (nVoucherId, data) =>
    api.post(`vouchers/${nVoucherId}/create-jev`, data),
};

export default VoucherAPI;

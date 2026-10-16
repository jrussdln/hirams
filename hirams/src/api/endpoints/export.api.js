import api from "../axios.js";

export const ExportAPI = {
  exportPricingReport: (payload, options) =>
    api.postBlob("export-pricing-report", payload, options),
};

export default ExportAPI;
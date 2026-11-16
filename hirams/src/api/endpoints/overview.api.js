import api from "../axios.js";

export const OverviewAPI = {
  getTotalMetrics: () => api.get("dashboard/total-metrics"),
  getEmployeePerformance: (year) =>
    api.get(`dashboard/employee-performance?year=${year}`),
  getOngoingTransactions: () => api.get("dashboard/ongoing-transactions"),
  getCollectiblesCollection: () =>
    api.get("dashboard/collectibles-collection"),
  getProfitByMonth: (year) => api.get(`dashboard/profit-by-month?year=${year}`),
};

export default OverviewAPI;
// utils/helpers/pendingJevGroups.js
// How many PENDING JEV "groups" an inventory list holds — the same
// grouping the Inventory page's Pending JEV screen shows: per supplier
// (qty > 0) / client (qty < 0) WITHIN a company. A plain Account Officer
// (not the team lead) only sees the groups of transactions assigned to
// them, so counting must be able to scope to one AO to agree with the
// cards on screen. Management, finance and the banner pills count
// globally (no aoUserId).

export const countPendingJevGroups = (items = [], { aoUserId } = {}) => {
  const seen = new Set();
  items.forEach((i) => {
    const qty = Number(i.nQuantity ?? 0);
    if (qty === 0) return;
    if (aoUserId !== undefined && aoUserId !== null && aoUserId !== "") {
      // Laravel snake-cases relation keys in JSON ("transaction_item").
      const txn =
        i.purchaseOption?.transactionItem?.transaction ??
        i.purchaseOption?.transaction_item?.transaction;
      if (Number(txn?.nAssignedAO) !== Number(aoUserId)) return;
    }
    const scope = qty > 0 ? "supplier" : "client";
    const name =
      (scope === "supplier" ? i.strSupplierNickName : i.strClientNickName) ||
      "—";
    const company = i.strCompanyNickName || "—";
    seen.add(`${scope}\u0000${name}\u0000${company}`);
  });
  return seen.size;
};

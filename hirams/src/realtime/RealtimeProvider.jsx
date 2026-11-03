import { useEffect } from "react";
import { subscribeUsersChannel } from "./channels/usersChannel.js";
import { subscribeVouchersChannel } from "./channels/vouchersChannel.js";
import { subscribeSuppliersChannel } from "./channels/suppliersChannel.js";
import { subscribeSupplierBanksChannel } from "./channels/supplierBanksChannel.js";
import { subscribeSupplierContactsChannel } from "./channels/supplierContactsChannel.js";
import { subscribeClientsChannel } from "./channels/clientsChannel.js";
import { subscribeAssigneesChannel } from "./channels/assigneesChannel.js";
import { subscribeCompaniesChannel } from "./channels/companiesChannel.js";
import { subscribeDirectCostOptionsChannel } from "./channels/directCostOptionsChannel.js";
import { subscribeInventoriesChannel } from "./channels/inventoriesChannel.js";
// ✅ NEW IMPORTS
import { subscribePurchaseOrdersChannel } from "./channels/purchaseordersChannel.js";
import { subscribePurchaseOrderOptionsChannel } from "./channels/purchaseOrderOptionsChannel.js";
import { subscribeTransactionsChannel } from "./channels/transactionsChannel.js";
import { subscribeTransactionItemsChannel } from "./channels/transactionItemsChannel.js";
import { subscribePurchaseOptionsChannel } from "./channels/purchaseOptionsChannel.js";
import { subscribeJournalAccountChannel } from "./channels/journalAccountChannel.js";
import { subscribeJournalEntryChannel } from "./channels/journalEntryChannel.js";
import { subscribeJevsChannel } from "./channels/jevsChannel.js";
import { subscribeNotificationsChannel } from "./channels/notificationsChannel.js";
function RealtimeProvider({ children }) {
  useEffect(() => {
    const unsubscribers = [
      subscribeUsersChannel(),
      subscribeVouchersChannel(),
      subscribeSuppliersChannel(),
      subscribeSupplierBanksChannel(),
      subscribeSupplierContactsChannel(),
      subscribeClientsChannel(),
      subscribeAssigneesChannel(),
      subscribeCompaniesChannel(),
      subscribeDirectCostOptionsChannel(),
      subscribeInventoriesChannel(),
      subscribePurchaseOrdersChannel(),
      subscribePurchaseOrderOptionsChannel(),
      subscribeTransactionsChannel(),
      // ✅ NEW
      subscribeTransactionItemsChannel(),
      subscribePurchaseOptionsChannel(),
      subscribeJournalAccountChannel(),
      subscribeJournalEntryChannel(),
      subscribeJevsChannel(),
      subscribeNotificationsChannel(),
    ];
    return () => unsubscribers.forEach((unsub) => unsub());
  }, []);

  return children;
}

export default RealtimeProvider;

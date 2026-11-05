
-- ---------- FOREIGN KEY / LOOKUP INDEXES ----------
-- transactions
ALTER TABLE `tbltransactions` ADD INDEX `idx_txn_client`     (`nClientId`);
ALTER TABLE `tbltransactions` ADD INDEX `idx_txn_ao`         (`nAssignedAO`);
ALTER TABLE `tbltransactions` ADD INDEX `idx_txn_company`    (`nCompanyId`);
ALTER TABLE `tbltransactions` ADD INDEX `idx_txn_jev`       (`nJEVId`);
ALTER TABLE `tbltransactions` ADD INDEX `idx_txn_itemtype`   (`cItemType`);
ALTER TABLE `tbltransactions` ADD INDEX `idx_txn_code`       (`strCode`);
ALTER TABLE `tbltransactions` ADD INDEX `idx_txn_ref`        (`strRefNumber`);

-- transaction items
ALTER TABLE `tbltransactionitems` ADD INDEX `idx_ti_txn`     (`nTransactionId`);

-- transaction histories
ALTER TABLE `tbltransactionhistories` ADD INDEX `idx_th_txn`   (`nTransactionId`);
ALTER TABLE `tbltransactionhistories` ADD INDEX `idx_th_user`  (`nUserId`);
ALTER TABLE `tbltransactionhistories` ADD INDEX `idx_th_status` (`nStatus`);
ALTER TABLE `tbltransactionhistories` ADD INDEX `idx_th_txn_dt` (`nTransactionId`, `dtOccur`);

-- purchase items
ALTER TABLE `tblpurchaseitems` ADD INDEX `idx_pi_txnitem` (`nTransactionItemId`);
ALTER TABLE `tblpurchaseitems` ADD INDEX `idx_pi_supplier` (`nSupplierId`);

-- purchase orders
ALTER TABLE `tblpurchaseorders` ADD INDEX `idx_po_status` (`nStatus`);
ALTER TABLE `tblpurchaseorders` ADD UNIQUE INDEX `uq_po_no` (`strPurchaseOrderNo`);

-- purchase order items (cart)
ALTER TABLE `tblpurchaseorder_items` ADD INDEX `idx_poi_po`   (`nPurchaseOrderId`);
ALTER TABLE `tblpurchaseorder_items` ADD INDEX `idx_poi_pi`   (`nPurchaseItemId`);
ALTER TABLE `tblpurchaseorder_items` ADD INDEX `idx_poi_po_pi` (`nPurchaseOrderId`, `nPurchaseItemId`);

-- purchase item histories
ALTER TABLE `tblpurchaseitemhistories` ADD INDEX `idx_pih_item` (`nPurchaseOrder_ItemId`);
ALTER TABLE `tblpurchaseitemhistories` ADD INDEX `idx_pih_user` (`nUserId`);
ALTER TABLE `tblpurchaseitemhistories` ADD INDEX `idx_pih_status` (`nStatus`);

-- inventories
ALTER TABLE `tblinventories` ADD INDEX `idx_inv_pi`     (`nPurchaseItemId`);
ALTER TABLE `tblinventories` ADD INDEX `idx_inv_jev`    (`nJEVId`);
ALTER TABLE `tblinventories` ADD INDEX `idx_inv_status`  (`cStatus`);
ALTER TABLE `tblinventories` ADD INDEX `idx_inv_pi_status` (`nPurchaseItemId`, `cStatus`);

-- serial numbers
ALTER TABLE `tblserialnumbers` ADD INDEX `idx_sn_inv` (`nInventoryId`);

-- JEV
ALTER TABLE `tbljevs` ADD INDEX `idx_jev_user`   (`nUserId`);
ALTER TABLE `tbljevs` ADD INDEX `idx_jev_type`   (`cJEVLinkType`);
ALTER TABLE `tbljevs` ADD INDEX `idx_jev_status` (`cStatus`);
ALTER TABLE `tbljevs` ADD UNIQUE INDEX `uq_jev_no` (`strJEVNumber`);

-- JEV entries
ALTER TABLE `tbljeventries` ADD INDEX `idx_je_njev` (`nJEVId`);
ALTER TABLE `tbljeventries` ADD INDEX `idx_je_acct` (`nJournalAccountId`);

-- journal accounts (tree)
ALTER TABLE `tbljournalaccounts` ADD INDEX `idx_ja_parent` (`nParentAccountId`);
ALTER TABLE `tbljournalaccounts` ADD INDEX `idx_ja_record` (`nRecordId`);

-- vouchers
ALTER TABLE `tblvouchers` ADD INDEX `idx_v_company` (`nCompanyId`);
ALTER TABLE `tblvouchers` ADD INDEX `idx_v_jev`     (`nJEVId`);
ALTER TABLE `tblvouchers` ADD INDEX `idx_v_user`    (`nUserId`);
ALTER TABLE `tblvouchers` ADD INDEX `idx_v_typeid`  (`nTypeId`);
ALTER TABLE `tblvouchers` ADD INDEX `idx_v_type`    (`cType`);
ALTER TABLE `tblvouchers` ADD INDEX `idx_v_status`  (`cStatus`);
ALTER TABLE `tblvouchers` ADD UNIQUE INDEX `uq_v_no` (`strNumber`);
ALTER TABLE `tblvouchers` ADD INDEX `idx_v_created` (`dtCreated`);

-- voucher assignees / suppliers
ALTER TABLE `tblvoucher_assignees` ADD INDEX `idx_va_voucher`  (`nVoucherId`);
ALTER TABLE `tblvoucher_assignees` ADD INDEX `idx_va_assignee` (`nAssigneeId`);
ALTER TABLE `tblvoucher_suppliers` ADD INDEX `idx_vs_voucher`  (`nVoucherId`);
ALTER TABLE `tblvoucher_suppliers` ADD INDEX `idx_vs_po`       (`nPurchaseOrderId`);

-- item pricing
ALTER TABLE `tblitempricings` ADD INDEX `idx_ip_set`  (`nPricingSetId`);
ALTER TABLE `tblitempricings` ADD INDEX `idx_ip_item` (`nTransactionItemId`);

-- pricing sets
ALTER TABLE `tblpricingsets` ADD INDEX `idx_ps_txn` (`nTransactionId`);

-- direct costs
ALTER TABLE `tbldirectcosts` ADD INDEX `idx_dc_txn`    (`nTransactionID`);
ALTER TABLE `tbldirectcosts` ADD INDEX `idx_dc_option` (`nDirectCostOptionID`);

-- users
ALTER TABLE `tblusers` ADD UNIQUE INDEX `uq_user_name`  (`strUserName`);
ALTER TABLE `tblusers` ADD UNIQUE INDEX `uq_user_email` (`strEmail`);
ALTER TABLE `tblusers` ADD INDEX `idx_user_type`       (`cUserType`);
ALTER TABLE `tblusers` ADD INDEX `idx_user_status`     (`cStatus`);

-- suppliers / clients / companies / assignees (nickname search)
ALTER TABLE `tblsuppliers`  ADD INDEX `idx_sup_nick`   (`strSupplierNickName`);
ALTER TABLE `tblsuppliers`  ADD INDEX `idx_sup_status` (`cStatus`);
ALTER TABLE `tblclients`    ADD INDEX `idx_cli_nick`   (`strClientNickName`);
ALTER TABLE `tblclients`    ADD INDEX `idx_cli_status` (`cStatus`);
ALTER TABLE `tblcompanies`  ADD INDEX `idx_com_nick`   (`strCompanyNickName`);
ALTER TABLE `tblassignees`  ADD INDEX `idx_asg_nick`   (`strAssigneeNickName`);
ALTER TABLE `tblassignees`  ADD INDEX `idx_asg_status` (`cStatus`);

-- notifications
ALTER TABLE `tblnotifications` ADD INDEX `idx_notif_user` (`nUserId`);
ALTER TABLE `tblnotifications` ADD INDEX `idx_notif_read` (`bIsRead`);
ALTER TABLE `tblnotifications` ADD INDEX `idx_notif_user_read` (`nUserId`, `bIsRead`);

-- supplier banks / contacts
ALTER TABLE `tblsupplierbanks`    ADD INDEX `idx_sbank_supplier` (`nSupplierId`);
ALTER TABLE `tblsuppliercontacts` ADD INDEX `idx_scontact_supplier` (`nSupplierId`);

-- Adminer 5.4.2 MariaDB 10.6.28-MariaDB dump

SET NAMES utf8;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

SET NAMES utf8mb4;

DROP TABLE IF EXISTS `failed_jobs`;
CREATE TABLE `failed_jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) NOT NULL,
  `connection` text NOT NULL,
  `queue` text NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `jobs`;
CREATE TABLE `jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) NOT NULL,
  `payload` longtext NOT NULL,
  `attempts` tinyint(3) unsigned NOT NULL,
  `reserved_at` int(10) unsigned DEFAULT NULL,
  `available_at` int(10) unsigned NOT NULL,
  `created_at` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `job_batches`;
CREATE TABLE `job_batches` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `total_jobs` int(11) NOT NULL,
  `pending_jobs` int(11) NOT NULL,
  `failed_jobs` int(11) NOT NULL,
  `failed_job_ids` longtext NOT NULL,
  `options` mediumtext DEFAULT NULL,
  `cancelled_at` int(11) DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  `finished_at` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `migrations`;
CREATE TABLE `migrations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `personal_access_tokens`;
CREATE TABLE `personal_access_tokens` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) NOT NULL,
  `tokenable_id` bigint(20) unsigned NOT NULL,
  `name` text NOT NULL,
  `token` varchar(64) NOT NULL,
  `abilities` text DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`),
  KEY `personal_access_tokens_expires_at_index` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `tblassignees`;
CREATE TABLE `tblassignees` (
  `nAssigneeId` int(11) NOT NULL AUTO_INCREMENT,
  `strAssigneeName` varchar(100) DEFAULT NULL,
  `strAssigneeNickName` varchar(25) DEFAULT NULL,
  `strAddress` varchar(200) DEFAULT NULL,
  `strTIN` varchar(17) DEFAULT NULL,
  `cStatus` char(1) DEFAULT NULL,
  PRIMARY KEY (`nAssigneeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


DROP TABLE IF EXISTS `tblclients`;
CREATE TABLE `tblclients` (
  `nClientId` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `strClientName` varchar(100) NOT NULL,
  `strClientNickName` varchar(25) NOT NULL,
  `strTIN` varchar(17) DEFAULT NULL,
  `strAddress` varchar(200) DEFAULT NULL,
  `strBusinessStyle` varchar(20) DEFAULT NULL,
  `strContactPerson` varchar(40) DEFAULT NULL,
  `strContactNumber` varchar(50) DEFAULT NULL,
  `cStatus` char(1) NOT NULL DEFAULT 'A',
  PRIMARY KEY (`nClientId`),
  UNIQUE KEY `strTIN` (`strTIN`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `tblcompanies`;
CREATE TABLE `tblcompanies` (
  `nCompanyId` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `strCompanyName` varchar(50) NOT NULL,
  `strCompanyNickName` varchar(20) NOT NULL,
  `strTIN` varchar(17) DEFAULT NULL,
  `strAddress` varchar(200) DEFAULT NULL,
  `strEmail` varchar(50) DEFAULT NULL,
  `strPhoneNo` varchar(100) DEFAULT NULL,
  `strLogo` varchar(50) DEFAULT NULL,
  `bVAT` tinyint(4) NOT NULL,
  `bEWT` tinyint(4) NOT NULL,
  PRIMARY KEY (`nCompanyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `tbldirectcostoptions`;
CREATE TABLE `tbldirectcostoptions` (
  `nDirectCostOptionID` int(11) NOT NULL AUTO_INCREMENT,
  `strName` varchar(20) NOT NULL,
  PRIMARY KEY (`nDirectCostOptionID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


DROP TABLE IF EXISTS `tbldirectcosts`;
CREATE TABLE `tbldirectcosts` (
  `nDirectCostID` int(11) NOT NULL AUTO_INCREMENT,
  `nTransactionID` int(11) NOT NULL,
  `nDirectCostOptionID` int(11) NOT NULL,
  `dAmount` double NOT NULL,
  PRIMARY KEY (`nDirectCostID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


DROP TABLE IF EXISTS `tblinventories`;
CREATE TABLE `tblinventories` (
  `nInventoryId` int(11) NOT NULL AUTO_INCREMENT,
  `nPurchaseItemId` int(11) NOT NULL,
  `nQuantity` int(11) NOT NULL,
  `cStatus` char(1) DEFAULT NULL,
  `strReceiptNumber` varchar(20) DEFAULT NULL,
  `nJEVId` int(11) DEFAULT NULL,
  `dtLog` datetime NOT NULL,
  PRIMARY KEY (`nInventoryId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


DROP TABLE IF EXISTS `tblitempricings`;
CREATE TABLE `tblitempricings` (
  `nItemPriceId` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `nPricingSetId` int(11) NOT NULL,
  `nTransactionItemId` int(11) NOT NULL,
  `dUnitSellingPrice` double NOT NULL,
  `bPricingLocked` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`nItemPriceId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `tbljeventries`;
CREATE TABLE `tbljeventries` (
  `nJEVEntryId` int(11) NOT NULL AUTO_INCREMENT,
  `nJEVId` int(11) NOT NULL,
  `nJournalAccountId` int(11) NOT NULL,
  `dAmount` double NOT NULL,
  PRIMARY KEY (`nJEVEntryId`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;


DROP TABLE IF EXISTS `tbljevs`;
CREATE TABLE `tbljevs` (
  `nJEVId` int(11) NOT NULL AUTO_INCREMENT,
  `strTitle` varchar(100) DEFAULT NULL,
  `cJEVLinkType` char(1) DEFAULT NULL,
  `cStatus` char(1) DEFAULT NULL,
  `strJEVNumber` varchar(20) DEFAULT NULL,
  `dtOccur` datetime DEFAULT NULL,
  PRIMARY KEY (`nJEVId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


DROP TABLE IF EXISTS `tbljournalaccounts`;
CREATE TABLE `tbljournalaccounts` (
  `nJournalAccountId` int(11) NOT NULL AUTO_INCREMENT,
  `nParentAccountId` int(11) DEFAULT NULL,
  `strAccountName` varchar(50) DEFAULT NULL,
  `cAccountType` char(1) DEFAULT NULL,
  `nRecordId` int(11) DEFAULT NULL,
  PRIMARY KEY (`nJournalAccountId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


DROP TABLE IF EXISTS `tblpayees`;
CREATE TABLE `tblpayees` (
  `nPayeeId` int(11) NOT NULL,
  `strPayeeName` varchar(100) DEFAULT NULL,
  `nSupplierId` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


DROP TABLE IF EXISTS `tblpricingsets`;
CREATE TABLE `tblpricingsets` (
  `nPricingSetId` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `nTransactionId` bigint(20) unsigned NOT NULL,
  `strName` varchar(20) NOT NULL,
  `bChosen` tinyint(4) NOT NULL DEFAULT 0,
  PRIMARY KEY (`nPricingSetId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `tblpurchaseitems`;
CREATE TABLE `tblpurchaseitems` (
  `nPurchaseItemId` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `nTransactionItemId` int(10) unsigned NOT NULL,
  `nSupplierId` int(10) unsigned NOT NULL,
  `nSupplierContactId` int(10) unsigned DEFAULT NULL,
  `nQuantity` int(11) NOT NULL,
  `strUOM` varchar(20) NOT NULL,
  `strBrand` varchar(100) DEFAULT NULL,
  `strModel` varchar(100) DEFAULT NULL,
  `strSpecs` mediumtext DEFAULT NULL,
  `dUnitPrice` double NOT NULL,
  `dEWT` double DEFAULT NULL,
  `strProductCode` varchar(30) DEFAULT NULL,
  `bAddOn` tinyint(1) NOT NULL DEFAULT 0,
  `bIncluded` tinyint(1) NOT NULL,
  `bPurchaseIncluded` tinyint(1) DEFAULT NULL,
  `cPurchaseUnitPriceStatus` char(1) DEFAULT NULL,
  `dPurchaseUnitPrice` double DEFAULT NULL,
  `dtCanvass` datetime DEFAULT NULL,
  PRIMARY KEY (`nPurchaseItemId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `tblpurchaseorders`;
CREATE TABLE `tblpurchaseorders` (
  `nPurchaseOrderId` int(11) NOT NULL AUTO_INCREMENT,
  `strPurchaseOrderNo` varchar(20) NOT NULL,
  `strShippingDetails` longtext DEFAULT NULL,
  `cPaymentTerms` varchar(1) DEFAULT NULL,
  `cStatus` varchar(1) DEFAULT NULL,
  `nStatus` int(11) DEFAULT NULL,
  `dtProceedToPayment` datetime DEFAULT NULL,
  `dtPurchaseOrderCreated` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`nPurchaseOrderId`),
  KEY `cStatus` (`cStatus`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


DROP TABLE IF EXISTS `tblpurchaseorder_items`;
CREATE TABLE `tblpurchaseorder_items` (
  `nPurchaseOrder_ItemId` int(11) NOT NULL AUTO_INCREMENT,
  `nPurchaseOrderId` int(11) NOT NULL,
  `nPurchaseItemId` int(11) unsigned NOT NULL,
  `dtAddedToCart` datetime NOT NULL,
  PRIMARY KEY (`nPurchaseOrder_ItemId`),
  UNIQUE KEY `nPurchaseOrderId` (`nPurchaseOrderId`,`nPurchaseItemId`),
  KEY `nPurchaseOptionId` (`nPurchaseItemId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


DROP TABLE IF EXISTS `tblserialnumbers`;
CREATE TABLE `tblserialnumbers` (
  `nSNId` int(11) NOT NULL AUTO_INCREMENT,
  `nInventoryId` int(11) NOT NULL,
  `strSerialNumber` varchar(50) NOT NULL,
  `dtLog` datetime NOT NULL,
  PRIMARY KEY (`nSNId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


DROP TABLE IF EXISTS `tblsqlerrors`;
CREATE TABLE `tblsqlerrors` (
  `nErrorId` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `dtDate` datetime NOT NULL DEFAULT current_timestamp(),
  `strError` longtext NOT NULL,
  PRIMARY KEY (`nErrorId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `tblsupplierbanks`;
CREATE TABLE `tblsupplierbanks` (
  `nSupplierBankId` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `nSupplierId` int(11) NOT NULL,
  `strBankName` varchar(50) NOT NULL,
  `strAccountName` varchar(100) NOT NULL,
  `strAccountNumber` varchar(50) NOT NULL,
  PRIMARY KEY (`nSupplierBankId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `tblsuppliercontacts`;
CREATE TABLE `tblsuppliercontacts` (
  `nSupplierContactId` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `nSupplierId` int(11) NOT NULL,
  `strName` varchar(50) NOT NULL,
  `strNumber` varchar(50) NOT NULL,
  `strPosition` varchar(50) DEFAULT NULL,
  `strDepartment` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`nSupplierContactId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `tblsuppliers`;
CREATE TABLE `tblsuppliers` (
  `nSupplierId` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `strSupplierName` varchar(100) NOT NULL,
  `strSupplierNickName` varchar(25) NOT NULL,
  `strAddress` varchar(200) DEFAULT NULL,
  `strTIN` varchar(17) DEFAULT NULL,
  `bVAT` tinyint(4) NOT NULL DEFAULT 0,
  `bEWT` tinyint(4) NOT NULL DEFAULT 0,
  `cStatus` char(1) DEFAULT NULL,
  PRIMARY KEY (`nSupplierId`),
  UNIQUE KEY `strTIN` (`strTIN`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `tbltransactionhistories`;
CREATE TABLE `tbltransactionhistories` (
  `nTransactionHistoryId` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `nTransactionId` int(11) NOT NULL,
  `dtOccur` datetime NOT NULL,
  `nStatus` int(11) NOT NULL,
  `nUserId` int(11) DEFAULT NULL,
  `strRemarks` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`nTransactionHistoryId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `tbltransactionitems`;
CREATE TABLE `tbltransactionitems` (
  `nTransactionItemId` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `nTransactionId` int(11) NOT NULL,
  `nItemNumber` int(11) NOT NULL,
  `nQuantity` int(11) NOT NULL,
  `strUOM` varchar(10) NOT NULL,
  `strName` varchar(200) NOT NULL,
  `strSpecs` mediumtext DEFAULT NULL,
  `dUnitABC` double DEFAULT NULL,
  PRIMARY KEY (`nTransactionItemId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `tbltransactions`;
CREATE TABLE `tbltransactions` (
  `nTransactionId` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `nCompanyId` int(11) DEFAULT NULL,
  `nClientId` int(11) NOT NULL,
  `nAssignedAO` int(11) DEFAULT NULL,
  `nJEVId` int(11) DEFAULT NULL,
  `dtAODueDate` datetime DEFAULT NULL,
  `strTitle` longtext NOT NULL,
  `strRefNumber` varchar(255) DEFAULT NULL,
  `dTotalABC` double DEFAULT NULL,
  `cProcMode` varchar(20) DEFAULT NULL,
  `cItemType` char(1) NOT NULL,
  `strCode` varchar(30) DEFAULT NULL,
  `cProcSource` char(1) DEFAULT NULL,
  `dtPreBid` datetime DEFAULT NULL,
  `strPreBid_Venue` varchar(70) DEFAULT NULL,
  `dtDocIssuance` datetime DEFAULT NULL,
  `strDocIssuance_Venue` longtext DEFAULT NULL,
  `dtDocSubmission` datetime DEFAULT NULL,
  `strDocSubmission_Venue` longtext DEFAULT NULL,
  `dtDocOpening` datetime DEFAULT NULL,
  `strDocOpening_Venue` longtext DEFAULT NULL,
  `dtDelivery` datetime DEFAULT NULL,
  `strDeliveryPlace` longtext DEFAULT NULL,
  PRIMARY KEY (`nTransactionId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `tblusers`;
CREATE TABLE `tblusers` (
  `nUserId` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `strFName` varchar(50) NOT NULL,
  `strMName` varchar(50) DEFAULT NULL,
  `strLName` varchar(50) NOT NULL,
  `strNickName` varchar(20) NOT NULL,
  `cUserType` char(1) NOT NULL,
  `strProfileImage` varchar(255) DEFAULT NULL,
  `cSex` char(1) DEFAULT NULL,
  `strEmail` varchar(50) NOT NULL,
  `strUserName` varchar(50) NOT NULL,
  `strPassword` varchar(100) NOT NULL,
  `strPhoneNo` varchar(100) NOT NULL,
  `remember_token` varchar(100) DEFAULT NULL,
  `bIsActive` tinyint(1) NOT NULL DEFAULT 1,
  `cStatus` char(1) NOT NULL,
  `dtLoggedIn` timestamp NULL DEFAULT NULL,
  `dtCreatedAt` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`nUserId`),
  UNIQUE KEY `strUserName` (`strUserName`),
  UNIQUE KEY `strEmail` (`strEmail`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `tblvouchers`;
CREATE TABLE `tblvouchers` (
  `nVoucherId` int(11) NOT NULL AUTO_INCREMENT,
  `nCompanyId` bigint(20) unsigned DEFAULT NULL,
  `nJEVId` int(11) DEFAULT NULL,
  `cType` char(1) DEFAULT NULL,
  `cPaymentTerms` char(1) DEFAULT NULL,
  `nTypeId` int(11) DEFAULT NULL,
  `strNumber` varchar(20) DEFAULT NULL,
  `cStatus` char(1) DEFAULT NULL,
  `dtCreated` datetime DEFAULT NULL,
  PRIMARY KEY (`nVoucherId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


DROP TABLE IF EXISTS `tblvoucher_assignees`;
CREATE TABLE `tblvoucher_assignees` (
  `nVoucherAssigneeId` int(11) NOT NULL AUTO_INCREMENT,
  `nVoucherId` int(11) DEFAULT NULL,
  `nAssigneeId` int(11) NOT NULL,
  `strParticular` varchar(300) DEFAULT NULL,
  `nQuantity` int(11) DEFAULT NULL,
  `strUOM` varchar(20) DEFAULT NULL,
  `dAmount` double DEFAULT NULL,
  `dEWT` double DEFAULT NULL,
  PRIMARY KEY (`nVoucherAssigneeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


DROP TABLE IF EXISTS `tblvoucher_suppliers`;
CREATE TABLE `tblvoucher_suppliers` (
  `nVoucherSupplierId` int(11) NOT NULL AUTO_INCREMENT,
  `nVoucherId` int(11) DEFAULT NULL,
  `nPurchaseOrderId` int(11) DEFAULT NULL,
  PRIMARY KEY (`nVoucherSupplierId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- 2026-10-14 07:29:27 UTC

<?php

use App\Http\Controllers\Api\Reports\AIChatBotController;
use App\Http\Controllers\Api\Masters\AssigneeController;
use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Masters\ClientController;
use App\Http\Controllers\Api\Masters\CompanyController;
use App\Http\Controllers\Api\Reports\DashboardController;
use App\Http\Controllers\Api\Purchasing\DirectCostController;
use App\Http\Controllers\Api\Purchasing\DirectCostOptionsController;
use App\Http\Controllers\Api\Reports\ExportController;
use App\Http\Controllers\Api\Purchasing\InventoryController;
use App\Http\Controllers\Api\Purchasing\ItemPricingController;
use App\Http\Controllers\Api\Finance\JevController;
use App\Http\Controllers\Api\Finance\JevEntriesController;
use App\Http\Controllers\Api\Finance\JournalAccountController;
use App\Http\Controllers\Api\Masters\MappingController;
use App\Http\Controllers\Api\Masters\PricingSetController;
use App\Http\Controllers\Api\Purchasing\PurchaseOptionsController;
use App\Http\Controllers\Api\Purchasing\PurchaseOrderController;
use App\Http\Controllers\Api\Purchasing\PurchaseOrderOptionsController;
use App\Http\Controllers\Api\Masters\SerialNumberController;
use App\Http\Controllers\Api\Masters\SupplierBankController;
use App\Http\Controllers\Api\Masters\SupplierContactController;
use App\Http\Controllers\Api\Masters\SupplierController;
use App\Http\Controllers\Api\Transactions\TransactionController;
use App\Http\Controllers\Api\Transactions\TransactionItemsController;
use App\Http\Controllers\Api\Masters\UserController;
use App\Http\Controllers\Api\Vouchers\VoucherAssigneeController;
use App\Http\Controllers\Api\Vouchers\VoucherController;
use App\Http\Controllers\Api\Vouchers\VoucherSupplierController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| NOTE: Within each prefix group, custom/static routes are declared BEFORE
| the apiResource so that e.g. `transactions/archive` is not swallowed by
| `transactions/{transaction}`. Keep it that way when adding new routes.
|--------------------------------------------------------------------------
*/

// ══════════════════════════════════════════════════════════════
//  PUBLIC
// ══════════════════════════════════════════════════════════════
Route::get('mappings/{type?}', [MappingController::class, 'getMappings']);

Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::post('register', [AuthController::class, 'register']);
    Route::post('check-username', [AuthController::class, 'checkUsername']);
    Route::post('forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('validate-reset-token', [AuthController::class, 'validateResetToken']);
    Route::post('reset-password', [AuthController::class, 'resetPassword']);
    Route::post('send-otp', [AuthController::class, 'sendOtp']);
    Route::post('verify-otp', [AuthController::class, 'verifyOtp']);
});

Route::prefix('users')->group(function () {
    Route::post('check-exist', [UserController::class, 'checkExist']);
    Route::patch('{id}/status', [UserController::class, 'updateStatus']);
});

// ══════════════════════════════════════════════════════════════
//  PROTECTED (auth:sanctum)
// ══════════════════════════════════════════════════════════════
Route::middleware(['auth:sanctum', 'active'])->group(function () {

    // ── AUTH ────────────────────────────────────────────────
    Route::post('auth/verify-password', [AuthController::class, 'verifyPassword']);
    Route::post('logout', [AuthController::class, 'logout']);

    // ── DASHBOARD ───────────────────────────────────────────
    Route::prefix('dashboard')->group(function () {
        Route::get('profit-by-month', [DashboardController::class, 'profitByMonth']);
        Route::get('employee-performance', [DashboardController::class, 'employeePerformance']);
        Route::get('total-metrics', [DashboardController::class, 'totalMetrics']);
        Route::get('ongoing-transactions', [DashboardController::class, 'ongoingTransactions']);
    });

    // ── USERS ───────────────────────────────────────────────
    // (PATCH users/{id}/status is registered in the public section above)
    Route::prefix('users')->group(function () {
        Route::get('active-account-officers', [UserController::class, 'activeAccountOfficers']);
        Route::get('active-procurement', [UserController::class, 'activeProcurement']);
        Route::patch('{id}/password', [UserController::class, 'updatePassword']);
        Route::post('{id}/profile-image', [UserController::class, 'uploadProfileImage']);
    });
    Route::apiResource('users', UserController::class);

    // ── COMPANIES ───────────────────────────────────────────
    Route::prefix('companies')->group(function () {
        Route::post('{id}/logo', [CompanyController::class, 'uploadLogo']);
    });
    Route::apiResource('companies', CompanyController::class);

    // ── CLIENTS ─────────────────────────────────────────────
    Route::get('client/active', [ClientController::class, 'activeClients']);
    Route::prefix('clients')->group(function () {
        Route::patch('{id}/status', [ClientController::class, 'updateStatus']);
    });
    Route::apiResource('clients', ClientController::class);

    // ── SUPPLIERS ───────────────────────────────────────────
    Route::prefix('suppliers')->group(function () {
        Route::get('all', [SupplierController::class, 'allSuppliers']);
        Route::patch('{id}/status', [SupplierController::class, 'updateStatus']);
        Route::get('{supplierId}/banks', [SupplierBankController::class, 'bySupplier']);
        Route::get('{supplierId}/contacts', [SupplierContactController::class, 'bySupplier']);
    });
    Route::apiResource('suppliers', SupplierController::class);

    Route::apiResource('supplier-banks', SupplierBankController::class);

    Route::prefix('supplier-contacts')->group(function () {
        Route::get('by-supplier/{supplierId}', [SupplierContactController::class, 'bySupplier']);
    });
    Route::apiResource('supplier-contacts', SupplierContactController::class);

    // ── TRANSACTIONS ────────────────────────────────────────
    Route::prefix('transactions')->group(function () {
        // Archive
        Route::get('archive', [TransactionController::class, 'indexArchive']);
        Route::get('archive/account_officer', [TransactionController::class, 'indexAccountOfficerArchive']);
        Route::get('archive/procurement', [TransactionController::class, 'indexProcurementArchive']);

        // Transaction items (bulk / ordering)
        Route::put('items/update-order', [TransactionItemsController::class, 'updateOrder']);
        Route::get('{transactionId}/items', [TransactionItemsController::class, 'getItemsByTransaction']);
        Route::post('{transactionId}/items/bulk', [TransactionItemsController::class, 'bulkStore']);

        // JEV
        Route::get('{id}/jev', [TransactionController::class, 'getJev']);
        Route::post('{id}/jev', [TransactionController::class, 'createJev']);

        // Assignment
        Route::put('{id}/assign', [TransactionController::class, 'assignAO']);
        Route::post('{id}/assign-procurement', [TransactionController::class, 'assignProcurement']);

        // Status / workflow
        Route::post('{id}/archive', [TransactionController::class, 'archive']);
        Route::post('{id}/unarchive', [TransactionController::class, 'unarchive']);
        Route::post('{id}/completed', [TransactionController::class, 'completed']);
        Route::put('{id}/for-collection', [TransactionController::class, 'forCollection']);
        Route::put('{id}/finalize', [TransactionController::class, 'finalizetransaction']);
        Route::put('{id}/verify', [TransactionController::class, 'verifytransaction']);
        Route::put('{id}/revert', [TransactionController::class, 'revert']);
        Route::put('{id}/force-finalize', [TransactionController::class, 'forceFinalizeManagement']);
        Route::get('{id}/history', [TransactionController::class, 'getHistory']);

        // Account officer workflow
        Route::put('{id}/finalize-ao', [TransactionController::class, 'finalizetransactionAO']);
        Route::put('{id}/finalize-ao-canvas', [TransactionController::class, 'finalizetransactionAOC']);
        Route::put('{id}/verify-ao', [TransactionController::class, 'verifytransactionAO']);
        Route::put('{id}/verify-ao-canvas', [TransactionController::class, 'verifytransactionAOC']);

        // Pricing
        Route::get('{id}/pricing', [TransactionController::class, 'getPricingModalData']);
        Route::put('{id}/approve-pricing', [TransactionController::class, 'approveTransactionPricing']);
        Route::put('{id}/finalize-pricing', [TransactionController::class, 'finalizeTransactionPricing']);
        Route::put('{id}/verify-pricing', [TransactionController::class, 'verifyTransactionPricing']);
    });
    Route::apiResource('transactions', TransactionController::class);

    // Singular "transaction" listing endpoints (kept as-is to preserve URLs)
    Route::prefix('transaction')->group(function () {
        Route::get('finance', [TransactionController::class, 'indexFinance']);
        Route::get('procurement', [TransactionController::class, 'indexProcurement']);
        Route::get('account_officer', [TransactionController::class, 'indexAccountOfficer']);
    });

    // ── TRANSACTION ITEMS ───────────────────────────────────
    Route::put('transaction-item/{id}/update-specs', [TransactionItemsController::class, 'updateSpecs']);

    Route::prefix('transaction-items')->group(function () {
        Route::get('suggestions', [TransactionItemsController::class, 'getSuggestions']);
        Route::get('{itemId}/purchase-options', [PurchaseOptionsController::class, 'getByItem']);
        Route::get('{itemId}/addons', [PurchaseOptionsController::class, 'getAddOnsByItem']);
    });
    Route::apiResource('transaction-items', TransactionItemsController::class);

    // ── PURCHASE OPTIONS ────────────────────────────────────
    Route::prefix('purchase-options')->group(function () {
        Route::get('suggestions', [PurchaseOptionsController::class, 'getSuggestions']);
        Route::post('calculate-ewt', [PurchaseOptionsController::class, 'calculateEWT']);
        Route::put('{id}/update-specs', [PurchaseOptionsController::class, 'updateSpecs']);
    });
    Route::apiResource('purchase-options', PurchaseOptionsController::class);

    // ── PRICING SETS ────────────────────────────────────────
    Route::prefix('pricing-sets')->group(function () {
        Route::patch('{id}/choose', [PricingSetController::class, 'choose']);
    });
    Route::apiResource('pricing-sets', PricingSetController::class);

    // ── ITEM PRICINGS ───────────────────────────────────────
    Route::prefix('item-pricings')->group(function () {
        Route::post('bulkStore', [ItemPricingController::class, 'bulkStore']);
        Route::get('tax', [ItemPricingController::class, 'getTax']);
        Route::get('pricing-set/{pricingSetId}', [ItemPricingController::class, 'getByPricingSet']);
        Route::delete('pricing-set/{pricingSetId}', [ItemPricingController::class, 'deleteByPricingSet']);
    });
    Route::apiResource('item-pricings', ItemPricingController::class);

    // ── DIRECT COSTS ────────────────────────────────────────
    Route::apiResource('direct-cost-options', DirectCostOptionsController::class);
    Route::apiResource('direct-cost', DirectCostController::class);

    // ── EXPORTS ─────────────────────────────────────────────
    Route::post('export-transaction', [ExportController::class, 'downloadTransactionExcel']);
    Route::post('export-pricing-report', [ExportController::class, 'exportSellingPriceReport']);

    // ── PURCHASE ORDERS ─────────────────────────────────────
    // Singular "purchase-order" (kept as-is to preserve URLs)
    Route::prefix('purchase-order')->group(function () {
        Route::post('sync-status', [PurchaseOrderController::class, 'syncPurchaseOrderStatus']);
        Route::post('add-to-cart', [PurchaseOrderOptionsController::class, 'addToCart']);
        Route::post('remove-from-cart', [PurchaseOrderOptionsController::class, 'removeFromCart']);
    });

    Route::prefix('purchase-orders')->group(function () {
        Route::get('get-all-purchase-orders', [PurchaseOrderController::class, 'getAllPurchaseOrders']);
        Route::get('by-supplier', [PurchaseOrderController::class, 'getBySupplier']);
        Route::patch('update-cart-status', [PurchaseOrderController::class, 'updateCartStatus']);
        Route::patch('update-cart-status-bulk', [PurchaseOrderController::class, 'updateCartStatusBulk']);
        Route::patch('proceed-to-po-details', [PurchaseOrderController::class, 'proceedToPODetails']);
        // The freight charge on the PO (the Freight / EWT editor).
        Route::patch('{id}/freight', [PurchaseOrderController::class, 'updateFreight']);
    });

    // ── PURCHASE ORDER OPTIONS (extra routes) ───────────────
    Route::prefix('purchase-order')->group(function () {
        Route::post('latest-history', [PurchaseOrderOptionsController::class, 'latestPurchaseOrderOptionsHistory']);
        Route::get('option/{nPurchaseItemId}/all-history', [PurchaseOrderOptionsController::class, 'allOptionHistory']);
    });

    // ── ASSIGNEES ───────────────────────────────────────────
    Route::prefix('assignees')->group(function () {
        Route::post('check-exist', [AssigneeController::class, 'checkExist']);
        Route::patch('{id}/status', [AssigneeController::class, 'updateStatus']);
    });
    Route::apiResource('assignees', AssigneeController::class);

    // ── VOUCHERS ────────────────────────────────────────────
    Route::prefix('vouchers')->group(function () {
        Route::post('{id}/create-jev', [VoucherController::class, 'createJev']);
        Route::patch('{id}/status', [VoucherController::class, 'updateStatus']);
        Route::patch('{id}/paid-status', [VoucherController::class, 'updatePaidStatus']);
    });
    Route::apiResource('vouchers', VoucherController::class);
    Route::apiResource('voucher-suppliers', VoucherSupplierController::class);
    Route::apiResource('voucher-assignees', VoucherAssigneeController::class);

    // ── INVENTORY ───────────────────────────────────────────
    Route::prefix('inventory')->group(function () {
        // Reads
        Route::get('all', [InventoryController::class, 'getInventory']);
        Route::get('get-inventory', [InventoryController::class, 'getInventory']); // duplicate of `all`
        Route::get('history', [InventoryController::class, 'history']);
        Route::get('latest-delivered-receipt', [InventoryController::class, 'latestDeliveredReceipt']);
        Route::get('suggested-delivered-receipt', [InventoryController::class, 'suggestedDeliveredReceipt']);

        // Bulk actions
        Route::post('bulk', [InventoryController::class, 'bulkReceiveDeliver']);
        Route::post('history-bulk', [InventoryController::class, 'historyBulk']);
        Route::post('bulk-status', [InventoryController::class, 'bulkUpdateStatus']);

        // JEV
        Route::post('create-jev', [InventoryController::class, 'createJevForPending']);
        Route::post('create-jev-delivered', [InventoryController::class, 'createJevForPendingDelivered']);
        Route::post('bulk-create-jev', [InventoryController::class, 'bulkCreateJev']);
    });
    Route::apiResource('inventory', InventoryController::class);

    // ── SERIAL NUMBERS ──────────────────────────────────────
    Route::prefix('serial-numbers')->group(function () {
        Route::get('by-inventory/{inventoryId}', [SerialNumberController::class, 'byInventory']);
        Route::post('check-exist', [SerialNumberController::class, 'checkExist']);
    });
    Route::apiResource('serial-numbers', SerialNumberController::class);

    // ── JEV & JEV ENTRIES ───────────────────────────────────
    Route::prefix('jev')->group(function () {
        Route::get('counts', [JevController::class, 'counts']);
        Route::get('by-link/{link}', [JevController::class, 'getByLink']);
    });
    Route::apiResource('jev', JevController::class);

    Route::prefix('jev-entries')->group(function () {
        Route::get('by-jev/{jevId}', [JevEntriesController::class, 'getByJevId']);
    });
    Route::apiResource('jev-entries', JevEntriesController::class);

    // ── JOURNAL ACCOUNTS ────────────────────────────────────
    Route::prefix('journal-accounts')->group(function () {
        Route::get('unlinked-records', [JournalAccountController::class, 'unlinkedRecords']);
        Route::patch('{journalAccount}/move', [JournalAccountController::class, 'move']);

        Route::get('{journalAccount}/available-clients-for-import', [JournalAccountController::class, 'availableClientsForImport']);
        Route::post('{journalAccount}/flash-import-clients', [JournalAccountController::class, 'flashImportClients']);

        Route::get('{journalAccount}/available-suppliers-for-import', [JournalAccountController::class, 'availableSuppliersForImport']);
        Route::post('{journalAccount}/flash-import-suppliers', [JournalAccountController::class, 'flashImportSuppliers']);
    });
    Route::apiResource('journal-accounts', JournalAccountController::class);

    // ── AI CHATBOT ──────────────────────────────────────────
    Route::prefix('ai-chatbot')->group(function () {
        Route::post('send', [AIChatBotController::class, 'send']);
    });
});

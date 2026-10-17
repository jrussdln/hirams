# Graph Report - hirams  (2026-10-16)

## Corpus Check
- Large corpus: 723 files · ~491,311 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 4254 nodes · 12993 edges · 226 communities (118 shown, 108 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 170 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Frontend API Clients & Modals
- Layouts & UI Controls
- Form Requests & Controllers
- Adminer Database Tool Core
- Adminer Database Tool Copy
- Broadcast Events
- DB Panel Admin Script
- Adminer Query Engine
- DB Panel Login Security
- Export & Content Views
- Adminer Table Operations
- Database Driver Layer
- Auth Controller & OTP
- Transaction Page Modals
- Domain Models
- Pricing Models & Formulas
- Purchase Options API
- Database Drivers Copy
- Sidebar Navigation
- Purchase Option Row UI
- Auth Pages & Login UI
- Progress & Card Components
- Exceptions & Controllers
- Inventory Controller
- Assignee Models
- Supplier Lookup Modal
- Journal Account Broadcasts
- App Root & Providers
- Query Builder Internals
- Laravel Framework Docs
- Inventory Cart Delivery UI
- Login & Route Guards
- Voucher Controller
- Base API Controller
- SQL DDL Helpers
- Axios API Modules
- Frontend Package Config
- Pricing Formula Engine
- Inventory Model & Service
- Mapping Service
- Journal Entry Voucher Model
- Purchase Order Service
- Frontend Dependencies
- Confirmation Modals
- Supplier Bank Models
- Laravel Service Providers
- Journal Account Tree UI
- Assignee Controller
- Pricing Set Broadcasts
- Auth & Role Middleware
- Adminer Select Printing
- Sales Invoice Preview
- AO & Finance Views
- Journal Entry Broadcasts
- Axios Config & Session
- Items Table UI
- DataTable Component
- Supplier Controller
- Purchase Order Controller
- Item Purchasing Updates
- Amount Picker Modal
- Delivery Receipt Preview
- DB Panel Auth Helpers
- Pricing & Direct Cost APIs
- Purchase Cart Navigation
- Editable Cell Component
- Client Controller
- Serial Number Controller
- Voucher Assignee Controller
- OTP & Reset Emails
- Export Controller
- Package Manifest
- User Service
- Direct Cost Controller
- Direct Cost Options API
- Cheque Preview
- Voucher Preview
- Layout Action Helpers
- Button Color Variants
- Account Report Panel
- PO Option Broadcasts
- PDO Result Wrapper
- Account Chain Selector
- Supplier Bank Controller
- Export Spinner Animation
- Company Controller
- Supplier Contact Controller
- Dashboard Controller
- Voucher Supplier Model
- Jobs Table Migration
- Companies & Supplier Migrations
- Inventory Broadcasts
- Page Layout & Sidebar
- Date Filter Component
- Inventory Details Panel
- Voucher Supplier Controller
- Adminer Select Helpers
- ESLint Dependencies
- JEV Entries Modal
- Composer Manifest
- Composer Dev Dependencies
- Composer Scripts
- Token & Client Migrations
- DB Panel Misc Helpers
- User API Page
- Route Provider & Web Routes
- Purchase Options Service
- Theme Mode & Design Tokens
- Serial Number Broadcasts
- Composer Plugin Config
- Composer Runtime Dependencies
- Backend Frontend Dependencies
- Assignee API Page
- Client API Page
- Wifi Loader Animation
- Cart Row Panel
- Brand Icons
- Pricing Set Realtime Channel
- App Bootstrap Config
- Adminer Index Helpers
- User Avatars 42 & 44
- Test Base Classes
- NPM Scripts
- Route Permission Guard
- Session Storage Utility
- Users Table Migration
- Clients Table Migration
- Suppliers Table Migration
- Supplier Banks Migration
- SQL Errors Migration
- Transactions Table Migration
- Transaction Items Migration
- Pricing Sets Migration
- Item Pricings Migration
- Purchase Options Migration
- Transaction Histories Migration
- Direct Cost Options Migration
- Direct Costs Migration
- Purchase Orders Migration
- Assignees Table Migration
- Brand Logos & Screenshot
- Plugin Include System
- Ambiguous Chrome Logos
- User Avatars 103 & 30
- User Avatars 104 & 106
- Default Avatars
- Personal Access Tokens Migration
- Users Table Migration Copy
- Suppliers Migration Copy
- Supplier Banks Migration Copy
- Supplier Contacts Migration
- SQL Errors Migration Copy
- Transactions Migration Copy
- Transaction Items Migration Copy
- Pricing Sets Migration Copy
- Item Pricings Migration Copy
- Purchase Options Migration Copy
- Transaction Histories Migration Copy
- Direct Cost Options Migration Copy
- Direct Costs Migration Copy
- Plugin Include System Copy
- Sidebar Skeletons
- Company API Page
- HTTP Kernel
- PSR-4 Autoloading
- Test Autoloading
- Package Discovery Config
- HIRAMS Brand Logos
- User 108 Avatars
- Email Layout Components
- SABP Check Script
- User 107 Avatar
- User 45 Avatar
- OTP Email Template
- Reset Password Email
- Reaction Meme Image
- Personal Photo Asset
- Vite Logo Asset
- React Logo Asset

## God Nodes (most connected - your core abstractions)
1. `getThemeColors()` - 372 edges
2. `react` - 243 edges
3. `@mui/material` - 171 edges
4. `@mui/icons-material` - 128 edges
5. `ApiRequest` - 117 edges
6. `ModalContainer()` - 108 edges
7. `adminer()` - 102 edges
8. `adminer()` - 102 edges
9. `BaseButton()` - 89 edges
10. `getItem()` - 84 edges

## Surprising Connections (you probably didn't know these)
- `src/main.jsx Entry Script` --conceptually_related_to--> `Frontend Architecture (React SPA)`  [INFERRED]
  hirams/index.html → README.md
- `index.html - HiRAMS Frontend Entry` --conceptually_related_to--> `HIRAMS - LGU Procurement & Transaction Management System`  [INFERRED]
  hirams/index.html → README.md
- `Laravel 12 (PHP 8.2)` --conceptually_related_to--> `Laravel Framework`  [EXTRACTED]
  README.md → apiHirams/README.md
- `robots.txt (apiHirams/storage/public)` --conceptually_related_to--> `Production Deployment`  [INFERRED]
  apiHirams/storage/public/robots.txt → README.md
- `buildNavItems()` --indirect_call--> `ItemPurchasingNavSection()`  [INFERRED]
  hirams/src/components/layouts/page/structure/Layout2/sidebar-content/BuildNavItems.jsx → hirams/src/components/layouts/page/structure/Layout2/sidebar-content/navigations/ItemPurchasingNav.jsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Token Authentication and Role Authorization Flow** — readme_authentication, readme_laravel_sanctum, readme_role_system [EXTRACTED 1.00]
- **Real-Time Broadcast Update Flow (24 events)** — readme_realtime_communication, readme_pusher_laravel_echo, readme_frontend_architecture [EXTRACTED 1.00]

## Communities (226 total, 108 thin omitted)

### Community 0 - "Frontend API Clients & Modals"
Cohesion: 0.06
Nodes (101): CompanyAPI, PurchaseOptionAPI, TransactionItemAPI, ModalContainer(), useColors(), Toast, useColors(), TransacVerificationModalContent() (+93 more)

### Community 1 - "Layouts & UI Controls"
Cohesion: 0.07
Nodes (82): PricingSetAPI, LAYOUTS, PageLayout(), BaseButton(), buildActionColors(), ResponsiveLabel(), useColors(), FormControlFilter() (+74 more)

### Community 2 - "Form Requests & Controllers"
Cohesion: 0.04
Nodes (21): ApiRequest, ItemPricingRequest, UpdateItemPricingRequest, UnlinkedRecordsJournalAccountRequest, UpdateJournalAccountRequest, UpdatePricingSetRequest, ArchiveTransactionRequest, AssignAORequest (+13 more)

### Community 3 - "Adminer Database Tool Core"
Cohesion: 0.06
Nodes (43): adminer(), auth_error(), bold(), bracket_escape(), checkbox(), column_foreign_keys(), confirm(), doc_link() (+35 more)

### Community 4 - "Adminer Database Tool Copy"
Cohesion: 0.05
Nodes (44): adminer(), auth_error(), bold(), checkbox(), column_foreign_keys(), confirm(), connect(), doc_link() (+36 more)

### Community 5 - "Broadcast Events"
Cohesion: 0.05
Nodes (15): AssigneeUpdated, ClientUpdated, CompanyUpdated, DirectCostUpdated, ItemPricingUpdated, ItemUpdated, JevUpdated, OptionUpdated (+7 more)

### Community 6 - "DB Panel Admin Script"
Cohesion: 0.03
Nodes (68): auth_url(), auto_increment(), {closure#2}(), {closure#6}(), collations(), connect(), cookie(), count_rows() (+60 more)

### Community 7 - "Adminer Query Engine"
Cohesion: 0.07
Nodes (62): alter_indexes(), alter_table(), apply_sql_function(), charset(), connection(), convert_field(), convert_fields(), copy_tables() (+54 more)

### Community 8 - "DB Panel Login Security"
Cohesion: 0.04
Nodes (64): add_invalid_login(), auth_url(), check_invalid_login(), {closure#2}(), {closure#6}(), collations(), cookie(), count_rows() (+56 more)

### Community 9 - "Export & Content Views"
Cohesion: 0.05
Nodes (58): ExportAPI, SupplierContactAPI, Layout(), Content(), renderFormattedText(), renderInline(), Footer(), Header() (+50 more)

### Community 10 - "Adminer Table Operations"
Cohesion: 0.08
Nodes (60): alter_indexes(), alter_table(), auto_increment(), charset(), connection(), convert_field(), convert_fields(), copy_tables() (+52 more)

### Community 11 - "Database Driver Layer"
Cohesion: 0.05
Nodes (21): add_driver(), check_sqlite_name(), connection_id(), create_database(), Db, drop_databases(), escape_string(), explain() (+13 more)

### Community 12 - "Auth Controller & OTP"
Cohesion: 0.08
Nodes (4): TransactionUpdated, AuthController, TransactionController, TransactionItemsController

### Community 13 - "Transaction Page Modals"
Cohesion: 0.08
Nodes (50): TransactionAPI, AssignAOModalContent(), useColors(), TransacRemarksModalContent(), useColors(), PurchasePageSkeleton(), ArchiveModal(), CanvasView() (+42 more)

### Community 14 - "Domain Models"
Cohesion: 0.06
Nodes (9): Supplier, SupplierContact, Transactions, User, SupplierContactPolicy, SupplierPolicy, TransactionPolicy, UserPolicy (+1 more)

### Community 15 - "Pricing Models & Formulas"
Cohesion: 0.05
Nodes (8): Client, Company, ItemPricings, PurchaseOptions, PurchaseOrderOption, TransactionHistory, TransactionItems, CompanyService

### Community 16 - "Purchase Options API"
Cohesion: 0.05
Nodes (12): PurchaseOptionsController, PurchaseOrderOptionsController, CalculateEWTPurchaseOptionsRequest, GetSuggestionsPurchaseOptionsRequest, StorePurchaseOptionsRequest, UpdatePurchaseOptionsRequest, UpdateSpecsPurchaseOptionsRequest, AddToCartPurchaseOrderOptionRequest (+4 more)

### Community 17 - "Database Drivers Copy"
Cohesion: 0.06
Nodes (16): add_driver(), check_sqlite_name(), create_database(), Db, drop_databases(), escape_string(), explain(), host_port() (+8 more)

### Community 18 - "Sidebar Navigation"
Cohesion: 0.14
Nodes (40): buildNavItems(), ArchiveNavSection(), AssigneeNavSection(), CartNavSection(), isAssignedToAO(), ClientNavSection(), InventoryNavSection(), JevNavSection() (+32 more)

### Community 19 - "Purchase Option Row UI"
Cohesion: 0.09
Nodes (46): CartActionButtons(), getColor(), PurchaseOptionRow(), PurchaseStatusIcon(), Spinner(), STAMP_BASE_SX, StatusStamp(), SuccessTick() (+38 more)

### Community 20 - "Auth Pages & Login UI"
Cohesion: 0.08
Nodes (37): AuthAPI, AuthLayout(), useColors(), AuthTextField(), useColors(), Logout(), useColors(), ball1 (+29 more)

### Community 21 - "Progress & Card Components"
Cohesion: 0.08
Nodes (44): ProgressBar(), useColors(), CardStructure(), VARIANT_STYLES(), ContentHeaderStructure(), useColors(), CompareView(), InfoRow() (+36 more)

### Community 22 - "Exceptions & Controllers"
Cohesion: 0.04
Nodes (10): UserController, {closure#3}(), GetTaxItemPricingRequest, StorePricingSetRequest, CheckExistUserRequest, StoreUserRequest, UpdatePasswordRequest, UpdateStatusUserRequest (+2 more)

### Community 23 - "Inventory Controller"
Cohesion: 0.05
Nodes (13): InventoryController, AdjustQuantityInventoryRequest, BulkCreateJevRequest, BulkReceiveDeliverRequest, BulkUpdateStatusInventoryRequest, CreateJevForPendingDeliveredRequest, CreateJevForPendingRequest, InventoryHistoryBulkRequest (+5 more)

### Community 24 - "Assignee Models"
Cohesion: 0.07
Nodes (9): {closure#1}(), Assignee, DirectCost, DirectCostOptions, SerialNumber, {closure#1}(), CrudService, ClientService (+1 more)

### Community 25 - "Supplier Lookup Modal"
Cohesion: 0.08
Nodes (32): SupplierAPI, Kbd(), LookUpModal(), toOption(), useColors(), SidebarSearchRow(), useColors(), TransactionArchive() (+24 more)

### Community 26 - "Journal Account Broadcasts"
Cohesion: 0.06
Nodes (6): JournalAccountUpdated, JournalAccountController, MoveJournalAccountRequest, StoreJournalAccountRequest, JournalAccount, JournalAccountService

### Community 27 - "App Root & Providers"
Cohesion: 0.11
Nodes (23): App(), ENV, ThemeModeProvider(), echo, subscribeAssigneesChannel(), subscribeClientsChannel(), subscribeCompaniesChannel(), subscribeDirectCostOptionsChannel() (+15 more)

### Community 28 - "Query Builder Internals"
Cohesion: 0.06
Nodes (18): apply_queries(), begin(), drop_create(), drop_tables(), drop_views(), format_time(), grant(), is_view() (+10 more)

### Community 29 - "Laravel Framework Docs"
Cohesion: 0.06
Nodes (46): robots.txt (apiHirams/public), Laracasts, Laravel Framework, Laravel Documentation, Laravel MIT License, robots.txt (apiHirams/storage/public), index.html - HiRAMS Frontend Entry, HiRAMS Square Icon (Favicon) (+38 more)

### Community 30 - "Inventory Cart Delivery UI"
Cohesion: 0.13
Nodes (37): InventoryAPI, CartCardForDelivery(), getColor(), mapColors(), num(), CartCardPanel(), getColor(), useColors() (+29 more)

### Community 31 - "Login & Route Guards"
Cohesion: 0.09
Nodes (39): Login(), PageNotFound(), useColors(), AddBulkItem, AppRoute(), Assignee, Client, Company (+31 more)

### Community 32 - "Voucher Controller"
Cohesion: 0.08
Nodes (5): VoucherController, UpdateStatusVoucherRequest, Voucher, {closure#4}(), VoucherService

### Community 33 - "Base API Controller"
Cohesion: 0.06
Nodes (7): ApiController, JevController, JevEntriesController, AIChatBotController, Controller, StoreVoucherAssigneeRequest, ChatBotService

### Community 34 - "SQL DDL Helpers"
Cohesion: 0.07
Nodes (13): apply_queries(), begin(), drop_tables(), drop_views(), grant(), is_view(), limit(), limit1() (+5 more)

### Community 35 - "Axios API Modules"
Cohesion: 0.10
Nodes (22): api, AIChatBotAPI, JevAPI, JevEntriesAPI, OverviewAPI, PurchaseOrderAPI, SerialNumberAPI, SupplierBankAPI (+14 more)

### Community 36 - "Frontend Package Config"
Cohesion: 0.06
Nodes (36): axios, tailwindcss, vite, name, private, type, version, autoprefixer (+28 more)

### Community 37 - "Pricing Formula Engine"
Cohesion: 0.08
Nodes (6): FormulaHelper, ItemPricingController, BulkStoreItemPricingRequest, StoreItemPricingRequest, {closure#1}(), ItemPricingService

### Community 38 - "Inventory Model & Service"
Cohesion: 0.08
Nodes (3): Inventory, InventoryService, TransactionQueryService

### Community 40 - "Journal Entry Voucher Model"
Cohesion: 0.09
Nodes (10): {closure#32}(), Jev, {closure#1}(), {closure#3}(), JevService, {closure#2}(), {closure#3}(), {closure#4}() (+2 more)

### Community 41 - "Purchase Order Service"
Cohesion: 0.09
Nodes (6): PurchaseOrder, {closure#1}(), {closure#3}(), {closure#5}(), PurchaseOrderService, PurchaseOrderStatusSync

### Community 43 - "Frontend Dependencies"
Cohesion: 0.06
Nodes (33): dependencies, autoprefixer, axios, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, dompurify, @emotion/react (+25 more)

### Community 44 - "Confirmation Modals"
Cohesion: 0.12
Nodes (24): ConfirmationStructure(), useColors(), InventoryConfirmModal(), useColors(), CONFIRM_TYPE, ManagePOVoucherModal(), useColors(), VIEW (+16 more)

### Community 45 - "Supplier Bank Models"
Cohesion: 0.09
Nodes (4): SupplierBank, SupplierBankPolicy, SupplierBankService, SupplierContactService

### Community 47 - "Journal Account Tree UI"
Cohesion: 0.13
Nodes (22): JournalAccountAPI, AccountTreeNode(), ActionButton(), Chip(), collectDescendantIds(), countNodes(), DragCtx, EmptyState() (+14 more)

### Community 48 - "Assignee Controller"
Cohesion: 0.10
Nodes (6): AssigneeController, CheckExistAssigneeRequest, StoreAssigneeRequest, UpdateAssigneeRequest, UpdateStatusAssigneeRequest, AssigneeService

### Community 49 - "Pricing Set Broadcasts"
Cohesion: 0.13
Nodes (5): PricingSetUpdated, PricingSetController, PricingSet, {closure#1}(), PricingSetService

### Community 50 - "Auth & Role Middleware"
Cohesion: 0.13
Nodes (8): Authenticate, CheckRole, EncryptCookies, PreventRequestsDuringMaintenance, RedirectIfAuthenticated, TrimStrings, TrustProxies, VerifyCsrfToken

### Community 51 - "Adminer Select Printing"
Cohesion: 0.12
Nodes (13): apply_sql_function(), bracket_escape(), driver(), edit_type(), fields_from_edit(), first(), get_file(), information_schema() (+5 more)

### Community 52 - "Sales Invoice Preview"
Cohesion: 0.10
Nodes (24): CollectibleValue(), PreviewSIPage(), AO_ROW_OFFSET, aoRowWrapperSx, cellSx, CLIENT_INFO_BLOCK_OFFSET, CLIENT_INFO_LINE_PADDING, clientInfoBlockWrapperSx (+16 more)

### Community 53 - "AO & Finance Views"
Cohesion: 0.17
Nodes (21): AOView(), FinanceView(), EmployeeChart(), EmployeeRankingPanel(), ManagementView(), MONTH_LABELS, monthlyData, OngoingTransactionsPanel() (+13 more)

### Community 54 - "Journal Entry Broadcasts"
Cohesion: 0.11
Nodes (4): JournalEntryUpdated, JevEntries, {closure#5}(), JevEntriesService

### Community 55 - "Axios Config & Session"
Cohesion: 0.17
Nodes (16): MappingAPI, apiClient, handleSessionExpired(), parseData(), useMapping(), useLogin(), clearClientState(), mountLogoutModal() (+8 more)

### Community 56 - "Items Table UI"
Cohesion: 0.21
Nodes (21): cellSx(), fmtSelling(), HeaderCell(), ItemsTable(), makeColors(), RowIcon(), rowSellingTotal(), TotalFooter() (+13 more)

### Community 57 - "DataTable Component"
Cohesion: 0.15
Nodes (21): buildCellSx(), buildHeaderCellSx(), buildSummaryCells(), computeColumnOffsets(), DataTable(), useColors(), DataTableSkeleton(), PurchaseCartModalSkeleton() (+13 more)

### Community 58 - "Supplier Controller"
Cohesion: 0.11
Nodes (5): SupplierController, StoreSupplierRequest, UpdateStatusSupplierRequest, UpdateSupplierRequest, SupplierService

### Community 59 - "Purchase Order Controller"
Cohesion: 0.11
Nodes (6): PurchaseOrderController, ProceedToPODetailsRequest, PurchaseOrderRequest, SyncPurchaseOrderStatusRequest, UpdateCartStatusBulkRequest, UpdateCartStatusRequest

### Community 61 - "Item Purchasing Updates"
Cohesion: 0.19
Nodes (18): DEFAULT_SHIPPING_DETAILS, ItemPurchasingUpdateContainer(), bustPOCache(), COUNTED_STATUSES, countedRowsFor(), dropSerials(), hasShippingText(), lastRowReceipt() (+10 more)

### Community 62 - "Amount Picker Modal"
Cohesion: 0.21
Nodes (15): PickableValue(), AmountPickContext, ARROW_INDEXES, JevEntryAEModal(), round2(), SupplierCompanyBreadcrumb(), useColors(), AssigneeListPanel() (+7 more)

### Community 63 - "Delivery Receipt Preview"
Cohesion: 0.12
Nodes (18): PreviewDR(), AO_ROW_OFFSET, aoRowWrapperSx, cellSx, CLIENT_INFO_BLOCK_OFFSET, CLIENT_INFO_LINE_PADDING, clientInfoBlockWrapperSx, clientInfoCellSx (+10 more)

### Community 64 - "DB Panel Auth Helpers"
Cohesion: 0.15
Nodes (15): add_invalid_login(), check_invalid_login(), csp(), file_open_lock(), file_unlock(), file_write_unlock(), get_nonce(), get_temp_dir() (+7 more)

### Community 65 - "Pricing & Direct Cost APIs"
Cohesion: 0.20
Nodes (13): DirectCostAPI, DirectCostOptionAPI, PricingAPI, DirectCost(), useDirectCost(), CollectionPaymentDetails(), Field(), useColors() (+5 more)

### Community 66 - "Purchase Cart Navigation"
Cohesion: 0.21
Nodes (15): PurchaseCartAPI, countCards(), isAssignedToAO(), ItemPurchasingNavSection(), buildRoleGroups(), getUser(), getUserRoles(), getUserType() (+7 more)

### Community 67 - "Editable Cell Component"
Cohesion: 0.19
Nodes (14): EditableCell(), EditAffordance(), useEditableCellState(), usePrintEditableCell(), PreviewPO(), cellSx, DEFAULTS, headerCellSx (+6 more)

### Community 68 - "Client Controller"
Cohesion: 0.12
Nodes (4): ClientController, StoreClientRequest, UpdateClientRequest, UpdateStatusClientRequest

### Community 69 - "Serial Number Controller"
Cohesion: 0.13
Nodes (4): SerialNumberController, CheckExistSerialNumberRequest, StoreSerialNumberRequest, UpdateSerialNumberRequest

### Community 70 - "Voucher Assignee Controller"
Cohesion: 0.16
Nodes (3): VoucherAssigneeController, VoucherAssignee, VoucherAssigneeService

### Community 71 - "OTP & Reset Emails"
Cohesion: 0.19
Nodes (3): OtpMail, ResetPasswordMail, MailService

### Community 73 - "Package Manifest"
Cohesion: 0.12
Nodes (13): axios, tailwindcss, vite, private, $schema, scripts, build, dev (+5 more)

### Community 75 - "Direct Cost Controller"
Cohesion: 0.16
Nodes (4): DirectCostController, StoreDirectCostRequest, UpdateDirectCostRequest, DirectCostService

### Community 76 - "Direct Cost Options API"
Cohesion: 0.15
Nodes (4): DirectCostOptionsController, StoreDirectCostOptionRequest, UpdateDirectCostOptionRequest, DirectCostOptionsService

### Community 77 - "Cheque Preview"
Cohesion: 0.18
Nodes (13): PreviewCheque(), CONTENT_MARGIN, DateDigitBoxes(), DEFAULTS, plainCellSx, PreviewChequeView(), TABLE_STYLE, toDigitDate() (+5 more)

### Community 78 - "Voucher Preview"
Cohesion: 0.22
Nodes (14): PreviewVoucher(), cellSx, DEFAULTS, modeCellSx(), PreviewVoucherView(), rowIdOf(), rowsSubtotal(), sectionHeaderSx (+6 more)

### Community 79 - "Layout Action Helpers"
Cohesion: 0.23
Nodes (14): collectActionItems(), extractBgColor(), extractIcon(), extractLabelText(), isIconElement(), Layout2(), readUserFromStorage(), useColors() (+6 more)

### Community 80 - "Button Color Variants"
Cohesion: 0.14
Nodes (8): MiniBaseButton(), useColors(), PrintEditableContext, MARGINS, PAPER_SIZES, PrintPreview(), useColors(), react-to-print

### Community 81 - "Account Report Panel"
Cohesion: 0.23
Nodes (13): AccountReportPanel(), Chip(), EMPTY_RANGE, EntryBranch(), flatten(), fmtAmt(), formatDay(), groupEntries() (+5 more)

### Community 84 - "Account Chain Selector"
Cohesion: 0.28
Nodes (13): AccountChainSelect(), ChainLevelSelect(), getLabel(), resolveAccountLabel(), resolveFundMeta(), useColors(), allAccountsCache, fetchAllAccounts() (+5 more)

### Community 85 - "Supplier Bank Controller"
Cohesion: 0.16
Nodes (3): SupplierBankController, StoreSupplierBankRequest, UpdateSupplierBankRequest

### Community 86 - "Export Spinner Animation"
Cohesion: 0.18
Nodes (13): bounce, checkPop, ExportSpinnerContent(), fadeSlideIn, floatUp, Particle(), progressFill(), pulsate (+5 more)

### Community 87 - "Company Controller"
Cohesion: 0.18
Nodes (3): CompanyController, StoreCompanyRequest, UpdateCompanyRequest

### Community 88 - "Supplier Contact Controller"
Cohesion: 0.18
Nodes (3): SupplierContactController, StoreSupplierContactRequest, UpdateSupplierContactRequest

### Community 91 - "Jobs Table Migration"
Cohesion: 0.23
Nodes (6): {closure#1}(), {closure#2}(), {closure#3}(), {closure#1}(), {closure#2}(), {closure#3}()

### Community 92 - "Companies & Supplier Migrations"
Cohesion: 0.15
Nodes (3): {closure#1}(), {closure#1}(), {closure#1}()

### Community 94 - "Page Layout & Sidebar"
Cohesion: 0.26
Nodes (6): Layout(), Layout(), useColors(), Sidebar(), useColors(), PageChunkErrorBoundary

### Community 95 - "Date Filter Component"
Cohesion: 0.33
Nodes (10): FilterDate(), FilterDateFields(), formatDisplay(), QUICK_LABEL, quickRange(), startOfDay(), THIS_OPTIONS, toISO() (+2 more)

### Community 96 - "Inventory Details Panel"
Cohesion: 0.32
Nodes (11): DarkSummary(), InfoRow(), InventoryDetailsPanel(), JevEmptyBox(), JevHeader(), JevStatusChip(), SectionLabel(), SerialChip() (+3 more)

### Community 98 - "Adminer Select Helpers"
Cohesion: 0.22
Nodes (6): is_mail(), is_url(), is_utf8(), repeat_pattern(), select_value(), shorten_utf8()

### Community 99 - "ESLint Dependencies"
Cohesion: 0.20
Nodes (10): devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, @types/react, @types/react-dom (+2 more)

### Community 100 - "JEV Entries Modal"
Cohesion: 0.38
Nodes (9): dateBtnSx(), InfoCard(), InfoField(), JevEntriesViewModal(), makeColors(), pad(), todayInput(), toInputDate() (+1 more)

### Community 101 - "Composer Manifest"
Cohesion: 0.22
Nodes (8): description, keywords, license, minimum-stability, name, prefer-stable, $schema, type

### Community 102 - "Composer Dev Dependencies"
Cohesion: 0.22
Nodes (9): require-dev, fakerphp/faker, laravel/pail, laravel/pint, laravel/sail, mockery/mockery, nunomaduro/collision, pestphp/pest (+1 more)

### Community 103 - "Composer Scripts"
Cohesion: 0.22
Nodes (9): scripts, dev, post-autoload-dump, post-create-project-cmd, post-root-package-install, post-update-cmd, pre-package-uninstall, setup (+1 more)

### Community 105 - "DB Panel Misc Helpers"
Cohesion: 0.22
Nodes (7): connection_id(), db_size(), format_number(), get_token(), js_escape(), lang_format(), slow_query()

### Community 106 - "User API Page"
Cohesion: 0.39
Nodes (6): UserAPI, User(), deriveStatusDisplay(), formatUser(), timeAgoDisplay(), useUser()

### Community 109 - "Theme Mode & Design Tokens"
Cohesion: 0.43
Nodes (5): ThemeModeContext, flatten(), getDesignTokens(), parseColor(), toHex()

### Community 111 - "Composer Plugin Config"
Cohesion: 0.29
Nodes (7): pestphp/pest-plugin, php-http/discovery, config, allow-plugins, optimize-autoloader, preferred-install, sort-packages

### Community 112 - "Composer Runtime Dependencies"
Cohesion: 0.29
Nodes (7): require, laravel/framework, laravel/sanctum, laravel/tinker, php, phpoffice/phpspreadsheet, pusher/pusher-php-server

### Community 114 - "Backend Frontend Dependencies"
Cohesion: 0.29
Nodes (7): devDependencies, axios, concurrently, laravel-vite-plugin, tailwindcss, @tailwindcss/vite, vite

### Community 115 - "Assignee API Page"
Cohesion: 0.48
Nodes (4): AssigneeAPI, Assignee(), formatAssignee(), useAssignee()

### Community 116 - "Client API Page"
Cohesion: 0.48
Nodes (4): ClientAPI, Client(), formatClient(), useClient()

### Community 117 - "Wifi Loader Animation"
Cohesion: 0.33
Nodes (6): circleInner, circleMiddle, circleOuter, textAnimation, useColors(), WifiLoader()

### Community 118 - "Cart Row Panel"
Cohesion: 0.52
Nodes (6): IconBox(), CartRowPanel(), HeaderCell(), StatRow(), StatStack(), useColors()

### Community 120 - "Brand Icons"
Cohesion: 0.40
Nodes (6): Credit Card 3D Icon, Contacts Address Book 3D Icon, Hirams Grey/Blue Monogram Icon, Hirams Orange/Blue Monogram Icon, Hirams Supply Wholesaling Logo (Orange/Blue), Hirams Supply Wholesaling Logo (Grey/Blue)

### Community 121 - "Pricing Set Realtime Channel"
Cohesion: 0.60
Nodes (3): TransactionPricingSet(), usePricingSet(), subscribeDynamicChannel()

### Community 124 - "User Avatars 42 & 44"
Cohesion: 0.40
Nodes (5): Profile Photo 42 (Child Pouting Portrait), Profile Photo 42 (Swimmer in Pool), Profile Photo 44 (Child Pouting Portrait), User 42, User 44

### Community 127 - "NPM Scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, preview

### Community 128 - "Route Permission Guard"
Cohesion: 0.70
Nodes (3): Index(), RoutePermission(), useColors()

### Community 129 - "Session Storage Utility"
Cohesion: 0.40
Nodes (3): getItem(), removeItem(), setItem()

### Community 145 - "Brand Logos & Screenshot"
Cohesion: 0.50
Nodes (4): PHP CLI Interpreter Selection Dialog Screenshot, HiRAMS Supply Wholesaling Logo, TEKNOKRAT C Logo, TEKNOKRAT DS Logo

### Community 147 - "Ambiguous Chrome Logos"
Cohesion: 0.50
Nodes (4): Chrome/Metallic Text Logo (AMBIGUOUS reading, possibly "TENTIJARAT" or "TENTILARAT"), Chrome/Metallic Text Logo, duplicate copy (AMBIGUOUS reading, possibly "TENTIJARAT" or "TENTILARAT"), Chrome/Metallic Text Logo (AMBIGUOUS reading, possibly Cyrillic "ТЕХТОКРАТ" / "TEKTOKRAT"), Chrome/Metallic Text Logo, duplicate copy (AMBIGUOUS reading, possibly Cyrillic "ТЕХТОКРАТ" / "TEKTOKRAT")

### Community 148 - "User Avatars 103 & 30"
Cohesion: 0.50
Nodes (4): Profile Photo for User 103 (Child in Red Shirt), Profile Photo for User 30 (Child in Red Shirt), User 103, User 30

### Community 149 - "User Avatars 104 & 106"
Cohesion: 0.50
Nodes (4): Profile Photo for User 104 (Monkey Close-up), Profile Photo for User 106 (Monkey Close-up), User 104, User 106

### Community 150 - "Default Avatars"
Cohesion: 0.50
Nodes (4): Default Avatar Placeholder (Grey Silhouette), Default Female Avatar Illustration, Default Male Avatar Illustration, Default Avatar

### Community 171 - "PSR-4 Autoloading"
Cohesion: 0.67
Nodes (3): autoload, psr-4, App\\

### Community 172 - "Test Autoloading"
Cohesion: 0.67
Nodes (3): autoload-dev, psr-4, Tests\\

### Community 173 - "Package Discovery Config"
Cohesion: 0.67
Nodes (3): extra, laravel, dont-discover

### Community 175 - "HIRAMS Brand Logos"
Cohesion: 1.00
Nodes (3): HIRAMS Supply Wholesaling Logo, HIRAMS Supply Wholesaling Logo (duplicate copy), HIRAMS Supply Wholesaling (brand)

### Community 176 - "User 108 Avatars"
Cohesion: 1.00
Nodes (3): Profile Photo for User 108 (Swimmer in Pool, Older Upload), Profile Photo for User 108 (Swimmer in Pool, Newer Upload), User 108

## Knowledge Gaps
- **65 isolated node(s):** `axios`, `concurrently`, `tailwindcss`, `vite`, `emails.index` (+60 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1053 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **108 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Auth Pages & Login UI` to `Frontend API Clients & Modals`, `Layouts & UI Controls`, `Route Permission Guard`, `Export & Content Views`, `Transaction Page Modals`, `Sidebar Navigation`, `Purchase Option Row UI`, `Progress & Card Components`, `Supplier Lookup Modal`, `App Root & Providers`, `Inventory Cart Delivery UI`, `Login & Route Guards`, `Axios API Modules`, `Frontend Package Config`, `Sidebar Skeletons`, `Company API Page`, `Confirmation Modals`, `Journal Account Tree UI`, `Sales Invoice Preview`, `AO & Finance Views`, `Axios Config & Session`, `Items Table UI`, `DataTable Component`, `Item Purchasing Updates`, `Amount Picker Modal`, `Delivery Receipt Preview`, `Pricing & Direct Cost APIs`, `Purchase Cart Navigation`, `Editable Cell Component`, `Cheque Preview`, `Voucher Preview`, `Layout Action Helpers`, `Button Color Variants`, `Account Report Panel`, `Account Chain Selector`, `Export Spinner Animation`, `Page Layout & Sidebar`, `Date Filter Component`, `Inventory Details Panel`, `JEV Entries Modal`, `User API Page`, `Theme Mode & Design Tokens`, `Assignee API Page`, `Client API Page`, `Wifi Loader Animation`, `Cart Row Panel`, `Pricing Set Realtime Channel`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `axios`, `concurrently`, `tailwindcss` to the rest of the system?**
  _65 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Frontend API Clients & Modals` be split into smaller, more focused modules?**
  _Cohesion score 0.055825734549138806 - nodes in this community are weakly interconnected._
- **Why does `Db` connect `Database Drivers Copy` to `Adminer Table Operations`, `Query Builder Internals`, `DB Panel Admin Script`, `Adminer Query Engine`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Should `Layouts & UI Controls` be split into smaller, more focused modules?**
  _Cohesion score 0.07092547092547093 - nodes in this community are weakly interconnected._
- **Why does `getThemeColors()` connect `Export & Content Views` to `Frontend API Clients & Modals`, `Layouts & UI Controls`, `Route Permission Guard`, `Transaction Page Modals`, `Sidebar Navigation`, `Purchase Option Row UI`, `Auth Pages & Login UI`, `Progress & Card Components`, `Supplier Lookup Modal`, `Inventory Cart Delivery UI`, `Login & Route Guards`, `Confirmation Modals`, `Journal Account Tree UI`, `Sales Invoice Preview`, `AO & Finance Views`, `Items Table UI`, `DataTable Component`, `Amount Picker Modal`, `Delivery Receipt Preview`, `Pricing & Direct Cost APIs`, `Editable Cell Component`, `Cheque Preview`, `Voucher Preview`, `Layout Action Helpers`, `Button Color Variants`, `Account Report Panel`, `Account Chain Selector`, `Export Spinner Animation`, `Page Layout & Sidebar`, `Date Filter Component`, `Inventory Details Panel`, `JEV Entries Modal`, `Theme Mode & Design Tokens`, `Wifi Loader Animation`, `Cart Row Panel`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Should `Form Requests & Controllers` be split into smaller, more focused modules?**
  _Cohesion score 0.03967554223241051 - nodes in this community are weakly interconnected._
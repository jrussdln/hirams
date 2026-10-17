# HIRAMS

**HIRAMS** (Local Government Unit Procurement & Transaction Management System) is a full-stack web application that manages procurement transactions — from canvassing and pricing through purchase orders, vouchers, and journal entry vouchers (JEV).

---

## Table of Contents

- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Backend Architecture](#backend-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Role System](#role-system)
- [Authentication & API](#authentication--api)
- [Real-Time Communication](#real-time-communication)
- [Getting Started](#getting-started)

---

## Technology Stack

| Layer        | Technology                                      |
|--------------|-------------------------------------------------|
| **Backend**  | Laravel 12 (PHP 8.2)                            |
| **Frontend** | React 18 + Vite 7                               |
| **Database** | MariaDB 10.6                                    |
| **Auth**     | Laravel Sanctum (token-based)                   |
| **UI**       | MUI 6 + Tailwind CSS 4                          |
| **Real-time**| Pusher + Laravel Echo                          |
| **HTTP**     | Axios (with interceptors)                       |
| **Charts**   | Recharts                                        |
| **Tables**   | @mui/x-data-grid                                |
| **Export**   | PhpSpreadsheet (Excel)                          |
| **Testing**  | Pest PHP                                        |

---

## Project Structure

```
hirams/
├── README.md                        # This file
├── lguph_hiramsDB.sql               # Database dump (Adminer/MariaDB)
├── apiHirams/                       # Backend — Laravel REST API
│   ├── app/
│   │   ├── Http/Controllers/Api/    # 29 API controllers
│   │   ├── Models/                  # 24 Eloquent models
│   │   ├── Services/                # Service-layer business logic
│   │   ├── Policies/                # Authorization policies
│   │   ├── Events/                  # Broadcast events
│   │   ├── Mail/                    # OTP & password reset mailables
│   │   └── Helpers/                 # Formula helpers
│   ├── database/migrations/         # 18 migration files
│   ├── routes/
│   │   ├── api.php                  # API routes (309 lines)
│   │   └── web.php                  # Single web route
│   └── config/                      # 15 Laravel config files
└── hirams/                          # Frontend — React SPA
    ├── src/
    │   ├── api/                     # Axios wrapper + 29 endpoint modules
    │   ├── components/              # Layouts, UI components
    │   ├── config/                  # Axios instance, env config
    │   ├── constants/               # Navigation config
    │   ├── context/                 # Auth & Theme contexts
    │   ├── hooks/                   # Custom hooks
    │   ├── lib/                     # Echo, dayjs, QueryClient
    │   ├── pages/                   # Feature pages
    │   ├── realtime/                # Pusher/Echo provider
    │   ├── routes/                  # App router (lazy-loaded)
    │   ├── styles/                  # CSS/Tailwind
    │   └── utils/                   # Helpers, formatters, storage
    ├── .env                         # Frontend env vars
    └── vite.config.js               # Dev proxy + build config
```

---

## Database Schema

**Engine:** InnoDB | **Charset:** utf8mb4

### Column Naming Convention

| Prefix | Meaning              | Example              |
|--------|----------------------|----------------------|
| `n`    | Numeric ID           | `nUserId`            |
| `str`  | String/Varchar       | `strUserName`        |
| `c`    | Char (status/code)   | `cUserType`          |
| `d`    | Double/Decimal       | `dUnitPrice`         |
| `b`    | Boolean/Flag         | `bIsActive`          |
| `dt`   | Datetime             | `dtLoggedIn`         |

---

### Core Tables

#### `tblusers` — System Users

| Column           | Type           | Notes                              |
|------------------|----------------|------------------------------------|
| `nUserId`        | bigint (PK)       | Auto-increment                     |
| `strFName`       | varchar(50)    | First name                         |
| `strMName`       | varchar(50)    | Middle name (nullable)             |
| `strLName`       | varchar(50)    | Last name                          |
| `strNickName`    | varchar(20)    | Nickname                           |
| `cUserType`      | char(1)        | Role code (see Role System)        |
| `strProfileImage`| varchar(255)     | Profile image path                 |
| `cSex`           | char(1)        | Gender (M/F)                       |
| `strEmail`       | varchar(50)    | Unique email                       |
| `strUserName`   | varchar(50)    | Unique username                    |
| `strPassword`    | varchar(100)   | Bcrypt-hashed password             |
| `strPhoneNo`     | varchar(100)   | Phone number                       |
| `bIsActive`      | tinyint(1)     | 0 = logged in, 1 = logged out      |
| `cStatus`        | char(1)        | A = Active, P = For Approval       |
| `dtLoggedIn`     | timestamp      | Last login timestamp               |
| `dtCreatedAt`    | timestamp      | Record creation                    |

#### `tblcompanies` — Company Records

| Column              | Type       | Notes                     |
|---------------------|------------|---------------------------|
| `nCompanyId`        | bigint (PK)   | Auto-increment            |
| `strCompanyName`    | varchar(50)| Company name              |
| `strCompanyNickName`| varchar(20)| Short name                |
| `strTIN`            | varchar(17)| Tax ID                    |
| `strAddress`        | varchar(200)| Address                  |
| `strEmail`          | varchar(50)| Email                     |
| `strPhoneNo`        | varchar(100)| Phone                     |
| `strLogo`           | varchar(50)| Logo file path            |
| `bVAT`              | tinyint(4) | VAT flag                  |
| `bEWT`              | tinyint(4) | EWT flag                  |

#### `tblclients` — Client Records

| Column            | Type        | Notes                     |
|-------------------|-------------|---------------------------|
| `nClientId`       | bigint (PK)    | Auto-increment            |
| `strClientName`   | varchar(100)| Client name               |
| `strClientNickName`| varchar(25) | Short name                |
| `strTIN`          | varchar(17) | Tax ID (unique)           |
| `strAddress`      | varchar(200)| Address                  |
| `strBusinessStyle`| varchar(20) | Business style            |
| `strContactPerson`| varchar(40) | Contact person            |
| `strContactNumber`| varchar(50) | Contact number            |
| `cStatus`         | char(1)     | A = Active (default)      |

#### `tblsuppliers` — Supplier Records

| Column              | Type        | Notes                     |
|---------------------|-------------|---------------------------|
| `nSupplierId`       | bigint (PK)    | Auto-increment            |
| `strSupplierName`   | varchar(100)| Supplier name             |
| `strSupplierNickName`| varchar(25) | Short name                |
| `strAddress`        | varchar(200)| Address                  |
| `strTIN`            | varchar(17) | Tax ID (unique)           |
| `bVAT`              | tinyint(4)  | VAT flag                  |
| `bEWT`              | tinyint(4)  | EWT flag                  |
| `cStatus`           | char(1)     | Status                    |

#### `tblsupplierbanks` — Supplier Bank Details

| Column            | Type     | Notes                        |
|-------------------|----------|------------------------------|
| `nSupplierBankId` | bigint (PK) | Auto-increment               |
| `nSupplierId`     | int      | FK → `tblsuppliers`          |
| `strBankName`     | varchar(50) | Bank name                  |
| `strAccountName`  | varchar(100) | Account name               |
| `strAccountNumber`| varchar(50) | Account number              |

#### `tblsuppliercontacts` — Supplier Contact Persons

| Column               | Type     | Notes                        |
|----------------------|----------|------------------------------|
| `nSupplierContactId` | bigint (PK) | Auto-increment               |
| `nSupplierId`        | int      | FK → `tblsuppliers`          |
| `strName`            | varchar(50) | Contact name               |
| `strNumber`          | varchar(50) | Phone number               |
| `strPosition`        | varchar(50) | Position                   |
| `strDepartment`      | varchar(50) | Department                 |

#### `tblassignees` — Assignee Records

| Column               | Type        | Notes                     |
|----------------------|-------------|---------------------------|
| `nAssigneeId`        | int (PK)    | Auto-increment            |
| `strAssigneeName`    | varchar(100)| Full name                 |
| `strAssigneeNickName`| varchar(25)  | Nickname                  |
| `strAddress`         | varchar(200)| Address                  |
| `strTIN`             | varchar(17) | Tax ID                    |
| `cStatus`            | char(1)     | Status                    |

---

### Transaction Tables

#### `tbltransactions` — Main Transaction Header

| Column                | Type           | Notes                          |
|-----------------------|----------------|--------------------------------|
| `nTransactionId`      | bigint (PK)       | Auto-increment                 |
| `nCompanyId`          | int            | FK → `tblcompanies`            |
| `nClientId`           | int            | FK → `tblclients`              |
| `nAssignedAO`         | int            | Assigned Account Officer       |
| `nJEVId`              | int            | FK → `tbljevs`                 |
| `dtAODueDate`         | datetime       | AO due date                    |
| `strTitle`            | longtext       | Transaction title              |
| `strRefNumber`        | varchar(255)    | Reference number               |
| `dTotalABC`           | double         | Total Approved Budget          |
| `cProcMode`           | varchar(20)    | Procurement mode               |
| `cItemType`           | char(1)        | Item type                      |
| `strCode`             | varchar(30)    | Transaction code               |
| `cProcSource`         | char(1)        | Procurement source             |
| `dtPreBid`           | datetime       | Pre-bid date                   |
| `strPreBid_Venue`     | varchar(70)    | Pre-bid venue                  |
| `dtDocIssuance`       | datetime       | Document issuance date         |
| `strDocIssuance_Venue`| longtext       | Document issuance venue        |
| `dtDocSubmission`     | datetime       | Document submission date       |
| `strDocSubmission_Venue`| longtext     | Document submission venue      |
| `dtDocOpening`        | datetime       | Document opening date          |
| `strDocOpening_Venue` | longtext       | Document opening venue         |
| `dtDelivery`          | datetime       | Delivery date                  |
| `strDeliveryPlace`    | longtext       | Delivery place                 |

#### `tbltransactionitems` — Transaction Line Items

| Column             | Type      | Notes                          |
|--------------------|-----------|--------------------------------|
| `nTransactionItemId`| bigint (PK)| Auto-increment                 |
| `nTransactionId`   | int       | FK → `tbltransactions`         |
| `nItemNumber`      | int       | Line item number               |
| `nQuantity`        | int       | Quantity                       |
| `strUOM`           | varchar(10)| Unit of measure                |
| `strName`          | varchar(200)| Item name                    |
| `strSpecs`         | mediumtext | Specifications                |
| `dUnitABC`         | double    | Unit Approved Budget for Contract |

#### `tbltransactionhistories` — Transaction Audit Trail

| Column                 | Type     | Notes                          |
|------------------------|----------|--------------------------------|
| `nTransactionHistoryId`| bigint (PK)| Auto-increment               |
| `nTransactionId`       | int      | FK → `tbltransactions`         |
| `dtOccur`              | datetime | When the change occurred       |
| `nStatus`              | int      | Status code at that time       |
| `nUserId`              | int      | Who made the change            |
| `strRemarks`           | varchar(200)| Remarks                      |

---

### Pricing Tables

#### `tblpricingsets` — Pricing Sets per Transaction

| Column           | Type     | Notes                          |
|------------------|----------|--------------------------------|
| `nPricingSetId`  | bigint (PK) | Auto-increment                 |
| `nTransactionId` | bigint     | FK → `tbltransactions`         |
| `strName`        | varchar(20)| Pricing set name              |
| `bChosen`        | tinyint(4)| Whether this set is selected  |

#### `tblitempricings` — Item-Level Pricing

| Column              | Type     | Notes                          |
|---------------------|----------|--------------------------------|
| `nItemPriceId`      | bigint (PK) | Auto-increment                 |
| `nPricingSetId`     | int     | FK → `tblpricingsets`          |
| `nTransactionItemId`| int     | FK → `tbltransactionitems`     |
| `dUnitSellingPrice` | double  | Unit selling price             |
| `bPricingLocked`    | tinyint(1)| 0 = unlocked, 1 = locked      |

---

### Purchase Tables

#### `tblpurchaseitems` — Purchase Items (Canvass Results)

| Column                      | Type        | Notes                     |
|-----------------------------|-------------|---------------------------|
| `nPurchaseItemId`           | int (PK)    | Auto-increment            |
| `nTransactionItemId`        | int         | FK → `tbltransactionitems`|
| `nSupplierId`               | int         | FK → `tblsuppliers`       |
| `nSupplierContactId`        | int         | FK → `tblsuppliercontacts`|
| `nQuantity`                 | int         | Quantity                  |
| `strUOM`                    | varchar(20) | Unit of measure           |
| `strBrand`                  | varchar(100)| Brand                     |
| `strModel`                  | varchar(100)| Model                     |
| `strSpecs`                  | mediumtext  | Specifications            |
| `dUnitPrice`                | double      | Unit price                |
| `dEWT`                      | double      | Expanded withholding tax  |
| `strProductCode`           | varchar(30) | Product code              |
| `bAddOn`                    | tinyint(1)  | Add-on flag               |
| `bIncluded`                 | tinyint(1)  | Included flag             |
| `bPurchaseIncluded`         | tinyint(1)  | Purchase inclusion flag   |
| `cPurchaseUnitPriceStatus`  | char(1)     | Purchase price status     |
| `dPurchaseUnitPrice`        | double      | Purchase unit price       |
| `dtCanvass`                 | datetime    | Canvass timestamp         |

#### `tblpurchaseorders` — Purchase Orders

| Column                    | Type        | Notes                     |
|---------------------------|-------------|---------------------------|
| `nPurchaseOrderId`        | int (PK)    | Auto-increment            |
| `strPurchaseOrderNo`      | varchar(20) | PO number                 |
| `strShippingDetails`      | longtext    | Shipping details          |
| `cPaymentTerms`           | varchar(1)  | Payment terms code        |
| `cStatus`                 | varchar(1)  | Status code               |
| `nStatus`                 | int         | Numeric status            |
| `dtProceedToPayment`      | datetime    | Payment date              |
| `dtPurchaseOrderCreated`  | datetime    | PO creation timestamp     |

#### `tblpurchaseorder_items` — PO Line Items / Cart

| Column               | Type     | Notes                        |
|----------------------|----------|------------------------------|
| `nPurchaseOrder_ItemId`| int (PK)| Auto-increment               |
| `nPurchaseOrderId`   | int     | FK → `tblpurchaseorders`     |
| `nPurchaseItemId`    | int     | FK → `tblpurchaseitems`      |
| `dtAddedToCart`      | datetime | When added to cart           |

---

### Financial Tables

#### `tbljevs` — Journal Entry Vouchers

| Column          | Type        | Notes                          |
|-----------------|-------------|--------------------------------|
| `nJEVId`        | int (PK)    | Auto-increment                 |
| `strTitle`      | varchar(100)| JEV title                      |
| `cJEVLinkType`  | char(1)     | Link type                      |
| `cStatus`       | char(1)     | Status                         |
| `strJEVNumber`  | varchar(20)  | JEV number                     |
| `dtOccur`       | datetime    | Date of occurrence             |

#### `tbljeventries` — JEV Line Entries

| Column             | Type     | Notes                          |
|--------------------|----------|--------------------------------|
| `nJEVEntryId`      | int (PK) | Auto-increment                 |
| `nJEVId`           | int     | FK → `tbljevs`                 |
| `nJournalAccountId`| int     | FK → `tbljournalaccounts`      |
| `dAmount`          | double  | Amount                         |

#### `tbljournalaccounts` — Chart of Accounts

| Column             | Type        | Notes                          |
|--------------------|-------------|--------------------------------|
| `nJournalAccountId`| int (PK)    | Auto-increment                 |
| `nParentAccountId` | int        | Self-FK (parent account)       |
| `strAccountName`   | varchar(50) | Account name                   |
| `cAccountType`     | char(1)     | Account type                   |
| `nRecordId`        | int        | Linked record ID               |

---

### Voucher Tables

#### `tblvouchers` — Vouchers

| Column          | Type     | Notes                          |
|-----------------|----------|--------------------------------|
| `nVoucherId`    | int (PK) | Auto-increment                 |
| `nCompanyId`    | bigint     | FK → `tblcompanies`            |
| `nJEVId`       | int     | FK → `tbljevs`                 |
| `cType`        | char(1)  | Voucher type                   |
| `cPaymentTerms`| char(1)  | Payment terms                  |
| `nTypeId`      | int     | Type ID                        |
| `strNumber`    | varchar(20)| Voucher number                |
| `cStatus`      | char(1)  | Status                         |
| `dtCreated`    | datetime | Creation timestamp             |

#### `tblvoucher_assignees` — Voucher Assignee Details

| Column               | Type        | Notes                          |
|----------------------|-------------|--------------------------------|
| `nVoucherAssigneeId` | int (PK)    | Auto-increment                 |
| `nVoucherId`         | int        | FK → `tblvouchers`             |
| `nAssigneeId`        | int        | FK → `tblassignees`            |
| `strParticular`      | varchar(300)| Particulars                    |
| `nQuantity`          | int        | Quantity                       |
| `strUOM`             | varchar(20) | Unit of measure                |
| `dAmount`            | double      | Amount                         |
| `dEWT`               | double      | Withholding tax                |

#### `tblvoucher_suppliers` — Voucher Supplier Details

| Column                | Type     | Notes                          |
|-----------------------|----------|--------------------------------|
| `nVoucherSupplierId`  | int (PK) | Auto-increment                 |
| `nVoucherId`          | int     | FK → `tblvouchers`             |
| `nPurchaseOrderId`    | int     | FK → `tblpurchaseorders`       |

---

### Inventory Tables

#### `tblinventories` — Inventory Records

| Column             | Type        | Notes                          |
|--------------------|-------------|--------------------------------|
| `nInventoryId`     | int (PK)    | Auto-increment                 |
| `nPurchaseItemId`  | int        | FK → `tblpurchaseitems`        |
| `nQuantity`        | int        | Quantity                       |
| `cStatus`          | char(1)     | Status                         |
| `strReceiptNumber` | varchar(20) | Receipt number                 |
| `nJEVId`           | int        | FK → `tbljevs`                 |
| `dtLog`            | datetime    | Log timestamp                  |

#### `tblserialnumbers` — Serial Numbers

| Column            | Type        | Notes                          |
|-------------------|-------------|--------------------------------|
| `nSNId`           | int (PK)    | Auto-increment                 |
| `nInventoryId`    | int        | FK → `tblinventories`          |
| `strSerialNumber` | varchar(50) | Serial number                  |
| `dtLog`           | datetime    | Log timestamp                  |

---

### Direct Cost Tables

#### `tbldirectcosts` — Direct Costs

| Column                | Type     | Notes                          |
|-----------------------|----------|--------------------------------|
| `nDirectCostID`       | int (PK) | Auto-increment                 |
| `nTransactionID`      | int     | FK → `tbltransactions`         |
| `nDirectCostOptionID` | int     | FK → `tbldirectcostoptions`    |
| `dAmount`             | double  | Amount                         |

#### `tbldirectcostoptions` — Direct Cost Options

| Column                | Type        | Notes                     |
|-----------------------|-------------|---------------------------|
| `nDirectCostOptionID` | int (PK)    | Auto-increment            |
| `strName`             | varchar(20) | Option name               |

---

### System Tables

#### `tblsqlerrors` — Error Logging

| Column      | Type        | Notes                          |
|-------------|-------------|--------------------------------|
| `nErrorId`  | bigint (PK)    | Auto-increment                 |
| `dtDate`    | datetime    | Error timestamp                |
| `strError`  | longtext    | Error message                  |

#### `personal_access_tokens` — Laravel Sanctum

| Column           | Type        | Notes                          |
|------------------|-------------|--------------------------------|
| `id`             | bigint (PK)    | Auto-increment                 |
| `tokenable_type` | varchar(255)| Polymorphic type               |
| `tokenable_id`   | bigint        | Polymorphic ID                 |
| `name`           | text        | Token name                     |
| `token`          | varchar(64)  | Hashed token                   |
| `abilities`      | text        | Token abilities                |
| `last_used_at`   | timestamp   | Last usage                     |
| `expires_at`     | timestamp   | Expiry                         |

#### `jobs`, `job_batches`, `failed_jobs` — Laravel Queue

Standard Laravel queue tables for background job processing.

---

## Backend Architecture

### Directory Structure

```
apiHirams/
├── app/
│   ├── Http/
│   │   ├── Controllers/Api/     # 29 controllers
│   │   ├── Middleware/            # CheckRole, etc.
│   │   └── Requests/              # Form request validation
│   ├── Models/                    # 24 Eloquent models
│   ├── Services/                  # Service layer
│   │   └── CrudService.php        # Generic CRUD base
│   ├── Policies/                  # Authorization policies
│   ├── Events/                    # Broadcast events (24)
│   ├── Mail/                      # OTP, password reset
│   └── Helpers/                   # FormulaHelper
├── database/migrations/           # 18 migrations
├── routes/
│   ├── api.php                    # All API routes
│   └── web.php                    # Welcome page
└── config/                        # 15 config files
```

### Service Layer Pattern

The backend uses a **Service Layer** pattern with an abstract `CrudService` base class:

```
CrudService (abstract)
├── modelClass()     → Eloquent model
├── eventClass()      → Broadcast event
├── $searchable      → Search columns
├── $statusColumn    → Status column name
└── $defaultSort     → Default ordering
```

Concrete services extend `CrudService` and declare their model, event, and search configuration. This provides generic CRUD, broadcasting, and error logging.

### API Controllers

| Domain        | Controllers                                                                 |
|---------------|-----------------------------------------------------------------------------|
| **Auth**      | `AuthController`                                                            |
| **Masters**   | `UserController`, `CompanyController`, `ClientController`, `SupplierController`, `SupplierBankController`, `SupplierContactController`, `AssigneeController`, `SerialNumberController`, `PricingSetController`, `MappingController` |
| **Transactions** | `TransactionController`, `TransactionItemsController`                    |
| **Purchasing** | `PurchaseOrderController`, `PurchaseOrderOptionsController`, `PurchaseOptionsController`, `ItemPricingController`, `InventoryController`, `DirectCostController`, `DirectCostOptionsController` |
| **Finance**   | `JevController`, `JevEntriesController`, `JournalAccountController`           |
| **Vouchers**  | `VoucherController`, `VoucherSupplierController`, `VoucherAssigneeController` |
| **Reports**   | `DashboardController`, `ExportController`, `AIChatBotController`             |

---

## Frontend Architecture

### Directory Structure

```
hirams/src/
├── api/
│   ├── axios.js                   # HTTP wrapper (get/post/put/patch/delete)
│   └── endpoints/                 # 29 domain-specific API modules
│       ├── auth.api.js
│       ├── transaction.api.js
│       ├── user.api.js
│       └── ... (26 more)
├── components/
│   ├── layouts/                   # Page, modal, chatbot layouts
│   └── ui/                        # Auth, banner, form, menu, print, widget
├── config/
│   ├── axiosConfig.js             # Axios instance + interceptors
│   └── env.js                     # Environment configuration
├── constants/
│   └── navigations.js             # Sidebar/navigation config
├── context/
│   └── ThemeModeContext.jsx       # Light/dark theme provider
├── hooks/
│   ├── useKeysLabels.js
│   ├── useMapping.js
│   ├── useRoleBuilder.js
│   └── useThemeMode.js
├── lib/
│   ├── echo.js                    # Pusher/Laravel Echo setup
│   ├── dayjs.js                   # Date formatting
│   └── queryClient.js             # TanStack Query client
├── pages/
│   ├── auth/                      # Login, register, forgot/reset password
│   ├── management/                # User, company, direct-cost management
│   ├── shared/                    # All other feature pages
│   └── utility-pages/             # Help, 404, maintenance, permissions
├── realtime/
│   ├── channels/
│   ├── dynamicChannel.js
│   ├── index.js
│   └── RealtimeProvider.jsx
├── routes/
│   ├── AppRoute.jsx               # Main router (lazy-loaded)
│   ├── MediaRoute.jsx             # Static media serving
│   ├── pageLoaders.js             # Route → dynamic import map
│   └── ProtectedRoute.jsx         # Auth + role guard
├── styles/                        # CSS/Tailwind/print/animations
├── utils/                         # Auth, form, formatters, helpers, storage
├── App.jsx                        # Root component
└── main.jsx                       # Entry point
```

### Routing

- **React Router 7** with `createBrowserRouter`
- **Code-split**: every page lazy-loaded via `React.lazy()`
- **Preloading**: sidebar hover prefetches chunks
- **Base path**: `/hirams/` in production
- **Protected routes**: wrapped in `<ProtectedRoute allowedRoles={[...]}>`

### Route Groups

| Group       | Routes                                                                                   |
|-------------|------------------------------------------------------------------------------------------|
| **Public**  | `/` (login), `/forgotPassword`, `/register`, `/index`, `/reset-password`                 |
| **All roles** | `/dashboard`, `/documentation`, `/help`, `/settings`, `/supplier`, `/transaction`, `/transaction-canvas`, `/transaction-pricing-set`, `/transaction-pricing`, `/client`, `/add-bulk-item`, `/transaction-archive`, `/transaction-for-purchase`, `/voucher`, `/assignee`, `/inventory`, `/journal-account`, `/jev`, `/voucher-update`, `/item-purchasing`, `/item-purchasing-update`, preview pages |
| **Management only** | `/user`, `/company`, `/direct-cost`                                             |

---

## Role System

Roles are stored in `tblusers.cUserType` as single-char codes:

| Code | Role                        |
|------|-----------------------------|
| `M`  | Management (admin)          |
| `G`  | General Manager             |
| `P`  | Procurement Officer         |
| `Y`  | Procurement Officer TL      |
| `A`  | Account Officer             |
| `X`  | Account Officer TL          |
| `F`  | Finance Officer             |
| `V`  | Visitor (self-registered default) |

### Authorization

- **Backend**: `CheckRole` middleware + Policies (`UserPolicy`, `TransactionPolicy`, `SupplierPolicy`, `SupplierBankPolicy`, `SupplierContactPolicy`)
- **Frontend**: `ProtectedRoute` component checks role from localStorage against `allowedRoles`

---

## Authentication & API

### Auth Flow

1. **Login** → `POST /api/auth/login` → returns Sanctum token
2. **Token stored** in localStorage (`token`, `user`, `role`)
3. **Axios interceptor** attaches `Authorization: Bearer <token>` header
4. **401/419** → clears storage, redirects to `/index`
5. **Logout** → `POST /api/auth/logout` → deletes tokens from DB

### OTP Verification

- 6-digit code stored in Laravel cache
- **Registration**: 10-minute expiry
- **Password reset**: 60-minute expiry

### Password Reset

- Token-based via email link
- Cached for 60 minutes
- `POST /api/auth/forgot-password` → sends OTP
- `POST /api/auth/validate-reset-token` → verifies token
- `POST /api/auth/reset-password` → updates password

### API Base URLs

| Environment | URL                                          |
|-------------|----------------------------------------------|
| Production  | `https://lgu.net.ph/apiHirams/public/api/`   |
| Development | `http://127.0.0.1:8000/api/`                 |

The Vite dev server proxies `/api` requests to the production backend (strips `/api` prefix).

---

## Real-Time Communication

- **Pusher** cluster: `ap1`
- **Laravel Echo** on frontend
- **24 broadcast events**: `UserUpdated`, `TransactionUpdated`, `VoucherUpdated`, etc.
- Events fire on CRUD operations and status changes
- Frontend wraps app in `<RealtimeProvider>`

---

## Getting Started

### Backend

```bash
cd apiHirams
composer install
cp .env.example .env
php artisan key:generate
# Configure .env with database credentials
php artisan migrate
php artisan serve
```

### Frontend

```bash
cd hirams
npm install
cp .env.example .env   # if applicable
npm run dev            # Development
npm run build          # Production (base: /hirams/)
```

### Environment Variables (Frontend)

| Variable                | Purpose                  |
|-------------------------|--------------------------|
| `VITE_PUSHER_APP_KEY`   | Pusher app key           |
| `VITE_PUSHER_APP_CLUSTER` | Pusher cluster region  |
| `VITE_RECAPTCHA_SITE_KEY` | Google reCAPTCHA key   |

---

## Production Deployment

- **URL**: `https://lgu.net.ph/`
- **API**: `https://lgu.net.ph/apiHirams/public/api/`
- **Frontend base path**: `/hirams/`
- **No Docker/containerization** — traditional hosting

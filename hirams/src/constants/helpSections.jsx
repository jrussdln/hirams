import {
  NotificationsOutlined,
  HelpOutline,
  Fullscreen,
  AccountCircleOutlined,
  MailOutline,
  MenuBookOutlined,
  PointOfSaleOutlined,
  LocalShippingOutlined,
  Inventory2Outlined,
  PaymentsOutlined,
  AccountBalanceWalletOutlined,
  GroupsOutlined,
  PolicyOutlined,
} from "@mui/icons-material";

// ── Help page topics ─────────────────────────────────────────────────
// Every section is data, not markup, so the search bar can filter the
// items and the section headers can collapse them without re-plumbing
// the page. `kind` picks the layout — "blocks" renders typed items
// (para / cap / step / role) as blocks in the order they appear, while
// "cards" and "links" render panels — and `text`/`title`/`code` are what
// the search matches against.
export const SECTIONS = [
  {
    id: "start",
    title: "Getting started",
    kind: "blocks",
    // Three kinds of item, rendered as blocks in the order they appear:
    //   para — what the system is and why it exists
    //   cap  — a capability, shown as a card under "What it can do"
    //   step — a numbered action under "Where to start"
    // The search filters this one list, so a topic can be narrowed down to
    // just its paragraphs, just its capabilities, or just its steps.
    items: [
      {
        type: "para",
        text: "The Hirams Supply Wholesaling System is the web-based system Hirams Supply runs its wholesale operation on — sales, purchasing, inventory and the accounting behind them, held together in one place instead of scattered spreadsheets, paper vouchers and a separate ledger.",
      },
      {
        type: "para",
        text: "Its purpose is one traceable record from quote to ledger. A price agreed on a transaction becomes a purchase order; the purchase becomes stock and a disbursement voucher; that voucher posts a Journal Entry Voucher into the books. Every step carries who did it and when, so a number can be audited later instead of argued about.",
      },
      {
        type: "para",
        text: "Everyone works from the same data but only sees what their role allows: Management configures the system and reports on it, Finance handles vouchers and payments, Procurement handles purchasing and stock, and Account Officers work their own transactions.",
      },

      {
        type: "cap",
        icon: <PointOfSaleOutlined sx={{ fontSize: "0.95rem" }} />,
        title: "Sell and price",
        text: "Quote and price orders on the transaction canvas, reuse saved price sets, add items in bulk, and carry a transaction on to purchase.",
      },
      {
        type: "cap",
        icon: <LocalShippingOutlined sx={{ fontSize: "0.95rem" }} />,
        title: "Purchase",
        text: "Order from suppliers, work the purchase and item-purchasing queues, and print the purchase order, delivery receipt and sales invoice.",
      },
      {
        type: "cap",
        icon: <Inventory2Outlined sx={{ fontSize: "0.95rem" }} />,
        title: "Hold stock",
        text: "Receive batches in, deliver them out, and follow quantities as they move from pending to received to delivered.",
      },
      {
        type: "cap",
        icon: <PaymentsOutlined sx={{ fontSize: "0.95rem" }} />,
        title: "Pay",
        text: "Raise disbursement vouchers for suppliers and assignees, close or cancel them, mark them paid or unpaid, and print the voucher or the cheque.",
      },
      {
        type: "cap",
        icon: <AccountBalanceWalletOutlined sx={{ fontSize: "0.95rem" }} />,
        title: "Keep the books",
        text: "Maintain the chart of accounts, raise, balance and finalize Journal Entry Vouchers, and read the balance of any account.",
      },
      {
        type: "cap",
        icon: <GroupsOutlined sx={{ fontSize: "0.95rem" }} />,
        title: "Manage people and setup",
        text: "Clients, suppliers, assignees, users and roles, companies and direct-cost options — with an archive holding everything that has been closed.",
      },

      {
        type: "step",
        text: "Start on the Dashboard — it shows what changed since your last visit.",
      },
      {
        type: "step",
        text: "Pick a module from the sidebar; your role decides which ones you can open.",
      },
      {
        type: "step",
        text: "In any list, use the status tabs and the search field to narrow it down, then click a row to open the full record.",
      },
      {
        type: "step",
        text: "Work from the footer — the buttons follow the record's status: an Active voucher can be Closed or Cancelled, a Closed one can be Marked Paid.",
      },
    ],
  },
  {
    id: "users",
    title: "System users",
    kind: "blocks",
    // `role` items render as a ranked ladder, highest to lowest — the rank
    // is simply the order they appear in. `code` is the role's letter from
    // `user_types` in apiHirams/config/mappings.php; `level` is the short
    // tag on the right of each rung; `sees` is the sidebar/record scope,
    // which is what actually differs between roles.
    items: [
      {
        type: "para",
        text: "Every account carries exactly one role, picked when Management creates the user under Users. It decides which sections of the sidebar open, how far the lists reach (only your own records, your team's, or the whole company) and which footer buttons work — the same record can be read-only for one role and fully actionable for another.",
      },

      {
        type: "role",
        title: "Management",
        code: "M",
        level: "Highest",
        text: "Runs the system. Creates and edits users and roles, companies, direct-cost options and statuses, and works every module like a specialist would: create, close or cancel vouchers, mark them paid, balance and finalize Journal Entry Vouchers. It also holds the override actions nobody else gets — force-finalize and revert a transaction the normal rules would lock.",
        sees: "Every sidebar section — Users, Clients, Suppliers, Assignees, Company, Direct Cost Options, Transactions, Item Purchasing, Archives, Inventory, Vouchers, Journal Entry Vouchers and Journal Accounts — every record in the company, and the System Config entry in the sidebar footer, which appears for Management alone.",
      },
      {
        type: "role",
        title: "General Manager",
        code: "G",
        level: "Oversight",
        text: "Sits in the Management group, so it opens the same menu and sees the whole company's data — every transaction, voucher and JEV — and can review, approve and act on any of them. The one line it does not cross is system setup: the System Config link is Management only, so the General Manager supervises the books rather than configuring the system behind them.",
        sees: "The full Management menu and all records company-wide — everything except System Config.",
      },
      {
        type: "role",
        title: "Finance Officer",
        code: "F",
        level: "Money & ledger",
        text: "Holds the money. Raises disbursement vouchers for suppliers and assignees, closes or cancels them, marks them paid or unpaid and prints the cheque; raises and balances Journal Entry Vouchers and finalizes them into the books; and reads every journal-account balance. Like Management, it is one of only two roles that sees every voucher and every purchase order instead of only its own.",
        sees: "Suppliers, Assignees, Transactions, Item Purchasing, Vouchers, Journal Entry Vouchers and Journal Accounts — company-wide, with no assignment filter.",
      },
      {
        type: "role",
        title: "Procurement Officer TL",
        code: "Y",
        level: "Team leader",
        text: "Leads the procurement team. Does everything a Procurement Officer does, but the queues open to the officers it supervises instead of only its own work, so it can pick up, check and hand back anything the team is buying.",
        sees: "Clients, Transactions, Archives and Inventory — across the whole procurement team, not just its own assignments.",
      },
      {
        type: "role",
        title: "Procurement Officer",
        code: "P",
        level: "Officer",
        text: "Buys. Sets up the draft, the items and the pricing, finalizes a transaction to send it on its way, works the purchase options behind an award, and prints purchase orders, delivery receipts and sales invoices. Money never leaves through this role — the payment paperwork belongs to Finance.",
        sees: "Clients, Transactions, Archives and Inventory — the transactions assigned to it only.",
      },
      {
        type: "role",
        title: "Account Officer TL",
        code: "X",
        level: "Team leader",
        text: "Leads the account officers. On a transaction sitting at For Assignment it is the one that picks the Account Officer, and its archive and hand-off queues open to the whole account-officer team instead of just its own records. Its voucher list shows supplier-type vouchers only — assignee-type vouchers stay with Finance.",
        sees: "Suppliers, Transactions, Item Purchasing, Archives, Inventory and Vouchers — its own work plus the team's archives and hand-offs.",
      },
      {
        type: "role",
        title: "Account Officer",
        code: "A",
        level: "Lowest",
        text: "Works its own book of clients: builds and prices the canvas for their orders, finalizes the stages it owns, follows each transaction through to purchase, and keeps the vouchers assigned to it up to date. It is the narrowest scope in the system — nothing outside what has been handed to it.",
        sees: "Suppliers, Transactions, Item Purchasing, Archives, Inventory and Vouchers — records assigned to it only.",
      },

      {
        type: "para",
        text: "Whatever the role, everyone shares the Dashboard, the header — notifications, help and full screen — the account menu and this Help page. A role can be changed later from Users, and the change takes effect the next time that person logs in.",
      },
    ],
  },
  {
    id: "header",
    title: "The header bar",
    kind: "cards",
    items: [
      {
        icon: <NotificationsOutlined sx={{ fontSize: "0.95rem" }} />,
        title: "Notifications",
        text: "The bell shows how many items are unread. Open it to mark items read, clear them, or jump to the full list.",
      },
      {
        icon: <HelpOutline sx={{ fontSize: "0.95rem" }} />,
        title: "Help ( ? )",
        text: "Opens this page from anywhere in the system — no need to hunt through the sidebar.",
      },
      {
        icon: <Fullscreen sx={{ fontSize: "0.95rem" }} />,
        title: "Full screen",
        text: "Fills the whole browser window with the system and hides the browser chrome. Click it again (or press Esc) to come back.",
      },
      {
        icon: <AccountCircleOutlined sx={{ fontSize: "0.95rem" }} />,
        title: "Account menu",
        text: "Your photo and role on the right. Click it for Account Profile, or to log out.",
      },
    ],
  },

  {
    id: "links",
    title: "Where things live",
    kind: "links",
    items: [
      { title: "Dashboard", to: "/dashboard", text: "Activity at a glance." },
      {
        title: "Transactions",
        to: "/transaction",
        text: "Create and track orders.",
      },
      {
        title: "Vouchers",
        to: "/voucher",
        text: "Disbursement vouchers by status.",
      },
      {
        title: "Journal Entry Vouchers",
        to: "/jev",
        text: "Review and finalize JEVs.",
      },
      {
        title: "Inventory",
        to: "/inventory",
        text: "Stock, receipts and deliveries.",
      },
      {
        title: "Journal Accounts",
        to: "/journal-account",
        text: "Chart of accounts and balances.",
      },
    ],
  },
  {
    id: "privacy",
    title: "Data Privacy and Terms of Use",
    kind: "links",
    items: [
      {
        title: "Data Privacy and Terms of Use",
        to: "/data-privacy",
        icon: <PolicyOutlined sx={{ fontSize: "0.95rem" }} />,
        text: "How your data is collected, used and protected, plus the terms that apply when you use this system.",
      },
    ],
  },
  {
    id: "support",
    title: "Need more help?",
    kind: "links",
    items: [
      {
        title: "System documentation",
        to: "/documentation",
        icon: <MenuBookOutlined sx={{ fontSize: "0.95rem" }} />,
        text: "The long-form guide: what each module is for and how the pieces fit together.",
      },
      {
        title: "Contact the IT team",
        href: "mailto:support@hiramswholesale.com",
        icon: <MailOutline sx={{ fontSize: "0.95rem" }} />,
        text: "Something broken, or a number that looks wrong? Email support@hiramswholesale.com with the page and the record number.",
      },
    ],
  },
];

export default SECTIONS;

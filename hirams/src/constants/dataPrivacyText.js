/**
 * Everything a user agrees to before logging in to HiRAMS.
 *
 * The login banner shows the Privacy Statement and Terms and Conditions
 * summaries; the /data-privacy page shows them in full as three accordions
 * (Privacy Statement, Privacy Notice, Terms and Conditions). Both read from
 * here, so the banner can never promise wording the page doesn't show.
 */
export const DATA_PRIVACY_ENABLED = false;
export const SYSTEM_NAME = "HiRAMS' Inc.";
export const SYSTEM_FULL_NAME =
  "";

// NPC registration seal card on the /data-privacy page.
// Leave `number` empty until HiRAMS actually holds an NPC registration; the
// card is hidden while it is empty, so nothing is claimed that isn't true.
export const NPC_REGISTRATION = {
  title: "DPS Registration Seal",
  number: "", // e.g. "PIC-000-000-2026"
  year: "", // e.g. "2026"
  certificate:
    "This is to certify that the organization operating HiRAMS has duly complied with the registration requirements of the Data Privacy Act of 2012, its implementing Rules and Regulations, and all related issuances. This certificate serves only as proof of registration and not verification of the contents of any document submitted in relation thereto.",
  sealImage: "", // optional: path/URL to the seal image
};

// ── Privacy Statement ────────────────────────────────────────────────
export const privacyStatement =
  "HiRAMS is committed to protecting your personal information and the procurement and financial records entrusted to it. All data processing within the system, from user accounts, canvassing and pricing to purchase orders, vouchers, journal entry vouchers and inventory, follows the principles of transparency, legitimate purpose, and proportionality under the Data Privacy Act of 2012 (R.A. 10173), its Implementing Rules and Regulations (IRR), and other issuances of the National Privacy Commission (NPC).";

// ── Terms and Conditions ─────────────────────────────────────────────
export const termsAndConditions =
  "Your access to and use of HiRAMS is conditioned on your acceptance of and compliance with these Terms and Conditions. They apply to every visitor, registrant, and authorized user of the system, and cover how you may use your account, the records you can view or encode, and the activity that is logged under your name. Access is granted by role and may be limited, suspended, or withdrawn by Management at any time.";

export const termsPoints = [
  "Use HiRAMS only for authorized procurement, finance, and inventory work.",
  "Keep your username and password private. You are responsible for all activity done through your account, so log out on shared devices.",
  "Encode accurate and complete information. Do not falsify, delete, or alter records outside what your role allows.",
  "Do not try to access other users' data, bypass role restrictions, or disrupt, copy, or reverse-engineer the system.",
  "Tell Management right away if you suspect your account was used without your permission.",
  "Management may suspend or remove accounts that break these terms, and may update these terms and the Privacy Statement as the system, the law, or NPC issuances change. The version shown on this page is the one in force.",
];

// ── Privacy Notice (page only) ───────────────────────────────────────
export const privacyNotice = [
  {
    title: "Information we collect",
    paragraphs: [
      "HiRAMS records only what a procurement or finance transaction needs in order to be processed, checked, and audited later:",
    ],
    bullets: [
      "Account details: your name, nickname, sex, email address, phone number, username, profile image, assigned role, and account status. Passwords are stored only in encrypted (hashed) form.",
      "Business contacts: company, client, supplier, and assignee records, including names, addresses, Tax Identification Numbers (TIN), contact persons, and supplier bank details.",
      "Transaction records: canvassing, pricing sets, purchase items, purchase orders, vouchers, journal entry vouchers, inventory and serial numbers, and direct costs.",
      "Activity records: the audit trail of who created, changed, or approved a record and when, plus your login and logout times.",
      "Technical data: the session token that keeps you signed in, one-time verification codes sent to your email, and error logs used to fix problems.",
    ],
  },
  {
    title: "How your information is used",
    paragraphs: [
      "Your information is processed only for a legitimate purpose, in a transparent way, and in proportion to what the task requires. We use it to:",
    ],
    bullets: [
      "Create and manage your account, verify your identity, and apply the access allowed for your role.",
      "Process procurement and finance work from canvassing and pricing to purchase orders, vouchers, journal entries, and inventory.",
      "Keep accurate, auditable records of every transaction and who handled it.",
      "Send account emails such as registration codes and password reset links.",
      "Show live updates to users working on the same records, and generate reports and exports.",
      "Protect the system against unauthorized access and investigate incidents.",
    ],
    after:
      "Your information is never sold. It is not shared outside the organization and its authorized personnel, except where a law, regulation, or National Privacy Commission issuance requires it.",
  },
  {
    title: "Who can see your information",
    paragraphs: [
      "Access is granted by role. Management, General Managers, Procurement Officers and Team Leads, Account Officers and Team Leads, and Finance Officers see only the records and screens their duties require. Newly registered users start with Visitor access until Management approves their account.",
      "User, company, and direct-cost administration is limited to Management.",
    ],
  },
  {
    title: "Security and retention",
    paragraphs: [
      "Passwords are encrypted, sessions are token-based and end when you log out or when they expire, and every request is checked against your role. The system logs who touched which record and when.",
      "Transaction, voucher, and journal records are kept as long as accounting, audit, and government record-keeping rules require. After that they are archived, anonymized, or securely disposed of.",
    ],
  },
  {
    title: "Your rights as a data subject",
    paragraphs: [
      "Under the Data Privacy Act of 2012 (R.A. 10173) you have the right to:",
    ],
    bullets: [
      "Be informed that your personal data is being collected, and for what purpose.",
      "Access the personal information held about you and obtain a copy of it.",
      "Object to the processing of your information, or have it suspended.",
      "Correct information that is outdated, incomplete, or inaccurate.",
      "Have your information erased or blocked once it is no longer needed for its purpose, or if its retention is unlawful.",
      "Data portability: receive your information in a commonly used electronic format.",
      "File a complaint with the National Privacy Commission if you believe your privacy rights were violated.",
    ],
    after:
      "To exercise these rights, contact your HiRAMS system administrator or your organization's Data Protection Officer.",
  },
];

export const acceptanceNote =
  "By ticking the box and pressing “I Understand” on the login screen, you confirm that you have read and agree to the Privacy Statement, Privacy Notice, and Terms and Conditions. If you do not agree, please do not use HiRAMS.";

// ── Important Notice (shown after login) ─────────────────────────────
// Bottom bar on every logged-in page until the user presses "I Agree".
// CookieNotice.jsx reads this; the choice is remembered per browser.
export const COOKIE_NOTICE_ENABLED = false;
export const cookieNotice = {
  heading: "IMPORTANT NOTICE:",
  before:
    "HiRAMS Inc. uses cookies and other similar technologies, such as browser storage, to keep you signed in and to collect information about your device to improve your experience. By continuing to use the system, you agree to the use of this information in accordance with the ",
  linkLabel: "Data Privacy Statement and Cookie Policy.",
  button: "I Agree",
};

export default {
  DATA_PRIVACY_ENABLED,
  SYSTEM_NAME,
  SYSTEM_FULL_NAME,
  NPC_REGISTRATION,
  privacyStatement,
  termsAndConditions,
  termsPoints,
  privacyNotice,
  acceptanceNote,
  COOKIE_NOTICE_ENABLED,
  cookieNotice,
};
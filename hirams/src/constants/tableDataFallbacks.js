/**
 * Shared placeholder text for empty table cells.
 *
 * Every list view reads its placeholder from here so a missing value reads
 * the same way on the Users, Clients, Suppliers and Assignees tables. Change
 * a message once and every table follows.
 */

// ── Shared across client / supplier / assignee ────────────────────────
export const NO_ADDRESS = "No Address attached.";
export const NO_TIN = "No TIN attached.";
export const NO_ADDRESS_TIN = "No Address & TIN attached.";

// ── Users ─────────────────────────────────────────────────────────────
export const NO_NICKNAME = "No nickname";
export const NO_USERNAME = "No username";
export const NO_SEX = "Not set";
export const NO_USER_TYPE = "No user type";
export const NO_USER_STATUS = "No status";

// ── Contact (users) ───────────────────────────────────────────────────
export const NO_PHONE = "No phone number attached";
export const NO_EMAIL = "No email attached";

// ── Client ────────────────────────────────────────────────────────────
export const NO_CONTACT_PERSON = "Contact Person is not set";
export const NO_CONTACT_NUMBER = "No contact number attached";

// ── Supplier ──────────────────────────────────────────────────────────
export const NO_TAX_VAT = "No VAT";
export const NO_TAX_EWT = "No EWT";

// ── Voucher ───────────────────────────────────────────────────────────
export const NO_VOUCHER_NO = "No voucher number";

// ── JEV ───────────────────────────────────────────────────────────────
export const NO_JEV_NO = "No JEV number";

// ── Transaction ───────────────────────────────────────────────────────
export const NO_SUBMISSION_DATE = "No submission date";
export const NO_TRANSACTION_ABC = "No ABC set";
export const NOT_YET_ASSIGNED = "Not yet assigned.";
export const OPEN_DATE = "OPEN DATE";

// ── Assignee ──────────────────────────────────────────────────────────
export const NO_NAME = "No name attached";

export default {
  NO_ADDRESS,
  NO_TIN,
  NO_ADDRESS_TIN,
  NO_NICKNAME,
  NO_USERNAME,
  NO_SEX,
  NO_USER_TYPE,
  NO_USER_STATUS,
  NO_PHONE,
  NO_EMAIL,
  NO_CONTACT_PERSON,
  NO_CONTACT_NUMBER,
  NO_TAX_VAT,
  NO_TAX_EWT,
  NO_VOUCHER_NO,
  NO_JEV_NO,
  NO_SUBMISSION_DATE,
  NO_TRANSACTION_ABC,
  NOT_YET_ASSIGNED,
  OPEN_DATE,
  NO_NAME,
};
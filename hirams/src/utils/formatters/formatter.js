/**
 * Format date/time to PH locale: "MMM D, YYYY, h:mm A"
 * Returns "—" for null/undefined/invalid dates
 */
export const fmtDate = (val) => {
  if (!val) return "—";
  const d = new Date(val);
  return isNaN(d)
    ? val
    : d.toLocaleString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
};

/**
 * Format number to Philippine Peso with 2 decimal places
 * Falls back to 0.00 if value is missing/invalid
 */
export const fmtPHP = (n) =>
  `₱${Number(n || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
  })}`;

/**
 * Format a quantity with thousands separators (no forced decimals)
 * 1010 → "1,010", 1234567 → "1,234,567"
 * Blank stays blank and non-numeric text passes through unchanged
 */
export const fmtQty = (n) => {
  if (n === null || n === undefined) return "";
  if (typeof n === "string" && n.trim() === "") return "";
  const num = Number(n);
  if (!Number.isFinite(num)) return typeof n === "string" ? n : "";
  return num.toLocaleString("en-PH", { maximumFractionDigits: 2 });
};

/**
 * Format TIN with 3-3-3-5 spacing pattern
 * Example: 123456789012345 → 123 456 789 01234
 */
export const formatTIN = (value) => {
  const digits = value.replace(/\D/g, "");
  const parts = [];
  if (digits.length > 0) parts.push(digits.substring(0, 3));
  if (digits.length > 3) parts.push(digits.substring(3, 6));
  if (digits.length > 6) parts.push(digits.substring(6, 9));
  if (digits.length > 9) parts.push(digits.substring(9, 14));
  return parts.join("-");
};

/**
 * Convert formatted TIN to storage format (spaces to dashes)
 * Example: 123 456 789 01234 → 123-456-789-01234
 */
export const tinToStorage = (tin) => {
  return tin.replace(/ /g, "-");
};

/**
 * Convert stored TIN to display format (dashes to spaces)
 * Example: 123-456-789-01234 → 123 456 789 01234
 */
export const tinToDisplay = (tin) => {
  return tin ? tin.replace(/-/g, "-") : "";
};

/**
 * Format Philippine mobile number with pattern: 09XX-XXX-XXXX
 * Example: 09123456789 → 09XX-XXX-XXXX (masked) or 0912-345-6789 (formatted)
 */
export const formatPhoneNo = (value) => {
  const digits = value.replace(/\D/g, "");
  const parts = [];
  
  if (digits.length > 0) parts.push(digits.substring(0, 4));  // 09XX
  if (digits.length > 4) parts.push(digits.substring(4, 7));  // XXX
  if (digits.length > 7) parts.push(digits.substring(7, 11)); // XXXX
  
  return parts.join("-");
};

/**
 * Convert formatted phone number to storage format (remove dashes)
 * Example: 0912-345-6789 → 09123456789
 */
export const phoneNoToStorage = (phoneNo) => {
  return phoneNo.replace(/-/g, "");
};

/**
 * Convert stored phone number to display format (add dashes)
 * Example: 09123456789 → 0912-345-6789
 */
export const phoneNoToDisplay = (phoneNo) => {
  if (!phoneNo) return "";
  return formatPhoneNo(phoneNo);
};

/**
 * Validate Philippine mobile number format
 * Must start with 09 and be exactly 11 digits
 */
export const isValidPhoneNo = (phoneNo) => {
  const digits = phoneNo.replace(/\D/g, "");
  return /^09\d{9}$/.test(digits);
};
// utils/helpers/passwordFormat.js

/**
 * Validate password requirements
 */
export const validatePassword = (password) => {
  if (!password) return "";
  const missing = [];
  if (password.length < 8) missing.push("8 characters");
  if (!/[A-Z]/.test(password)) missing.push("uppercase");
  if (!/[a-z]/.test(password)) missing.push("lowercase");
  if (!/[0-9]/.test(password)) missing.push("number");
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
    missing.push("special character");
  return missing.length ? `Password needs: ${missing.join(", ")}` : "";
};

/**
 * Validate confirm password matches password
 */
export const validateConfirmPassword = (password, cpassword) => {
  if (!password) return "";
  if (!cpassword) return "Please confirm your password";
  if (password !== cpassword) return "Passwords do not match";
  return "";
};

// utils/helpers/bankAccountNoFormat.js
/**
 * Format bank account number with 4-digit grouping pattern
 * Example: 123456789012 → 1234 5678 9012
 */
export const formatBankAccountNo = (value) => {
  const digits = value.replace(/\D/g, "");
  return digits.replace(/(.{4})/g, "$1 ").trim();
};

/**
 * Convert formatted account number to storage format (remove spaces)
 * Example: 1234 5678 9012 → 123456789012
 */
export const bankAccountNoToStorage = (accountNo) => {
  return accountNo.replace(/\s/g, "");
};

/**
 * Convert stored account number to display format (add spaces)
 * Example: 123456789012 → 1234 5678 9012
 */
export const bankAccountNoToDisplay = (accountNo) => {
  if (!accountNo) return "";
  return formatBankAccountNo(accountNo);
};

/**
 * Validate bank account number (basic check for digits only)
 */
export const isValidBankAccountNo = (accountNo) => {
  const digits = accountNo.replace(/\s/g, "");
  return /^\d+$/.test(digits) && digits.length >= 8; // Minimum 8 digits
};
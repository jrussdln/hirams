// ✅ Centralized validation utility

export const VALIDATION_RULES = {
  USER: {
    firstName: { required: true, message: "First Name is required" },
    lastName: { required: true, message: "Last Name is required" },
    nickname: { required: true, message: "Nickname is required" },
    type: { required: true, message: "Type is required" },
    sex: { required: true, message: "Sex is required" },
    sex: { required: true, message: "Sex is required" },
    phoneNumber: {
      required: true,
      validator: (value) => {
        const digits = value.replace(/\D/g, "");
        return /^09\d{9}$/.test(digits);
      },
      message: "Phone Number must start with 09 and be 11 digits",
    },
    username: { required: true, message: "Username is required" },
    email: {
      required: true,
      validator: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      message: "Please enter a valid email address",
    },
    password: {
      required: true,
      validator: (value) => {
        if (!value) return "Password is required";

        const missing = [];

        if (value.length < 8) missing.push("8 characters");
        if (!/[A-Z]/.test(value)) missing.push("uppercase");
        if (!/[a-z]/.test(value)) missing.push("lowercase");
        if (!/[0-9]/.test(value)) missing.push("number");
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value))
          missing.push("special character");

        if (missing.length === 0) return true;

        return `Password needs: ${missing.join(", ")}`;
      },
      message: "Invalid password",
    },
    cpassword: {
      required: false,
      message: "Please confirm your password",
    },
  },

  USER_EDIT: {
    firstName: { required: true, message: "First Name is required" },
    lastName: { required: true, message: "Last Name is required" },
    nickname: { required: true, message: "Nickname is required" },
    type: { required: true, message: "Type is required" },
    sex: { required: true, message: "Sex is required" },
    phoneNumber: {
      required: true,
      validator: (value) => {
        const digits = value.replace(/\D/g, "");
        return /^09\d{9}$/.test(digits);
      },
      message: "Phone Number must start with 09 and be 11 digits",
    },
    username: { required: true, message: "Username is required" },
    email: {
      required: true,
      validator: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      message: "Please enter a valid email address",
    },
    password: {
      required: false,
      validator: (value) => {
        if (!value) return true; // Optional in edit mode

        const missing = [];

        if (value.length < 8) missing.push("8 characters");
        if (!/[0-9]/.test(value)) missing.push("number");
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value))
          missing.push("special character");

        if (missing.length === 0) return true;

        return `Password needs: ${missing.join(", ")}`;
      },
      message: "Invalid password",
    },
    cpassword: {
      required: false,
      message: "Please confirm your password",
    },
  },

  CLIENT: {
    clientName: { required: true, message: "Client Name is required" },
    nickname: { required: true, message: "Nickname is required" },

    tin: {
      required: false,
      validator: (value) => {
        // Remove all non-digit characters (spaces, dashes, etc.)
        const digits = value.replace(/\D/g, "");
        return (
          digits.length === 0 || (digits.length >= 9 && digits.length <= 14)
        );
      },
      message: "TIN must be 9 – 14 digits",
    },

    contactNumber: {
      required: false,
      validator: (value) => {
        // Remove all non-digit characters (spaces, dashes, etc.)
        const digits = value.replace(/\D/g, "");
        // Must be exactly 11 digits and start with 09
        return digits.length === 0 || /^09\d{9}$/.test(digits);
      },
      message:
        "Contact Number must start with 09 and be 11 digits (e.g., 0912-345-6789)",
    },

    address: { required: false },
    businessStyle: { required: false },
    contactPerson: { required: false },
  },

  COMPANY: {
    name: { required: true, message: "Company Name is required" },
    nickname: { required: true, message: "Company Nickname is required" },
    tin: {
      required: false,
      validator: (value) => {
        const digits = value.replace(/\D/g, "");
        return (
          digits.length === 0 || (digits.length >= 9 && digits.length <= 14)
        );
      },
      message: "TIN must be 9 – 14 digits",
    },
    email: {
      required: true,
      validator: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      message: "Please enter a valid email address",
    },
    phone: {
      required: true,
      validator: (value) => {
        const digits = value.replace(/\D/g, "");
        return /^09\d{9}$/.test(digits);
      },
      message:
        "Phone Number must start with 09 and be 11 digits (e.g., 0912-345-6789)",
    },
    address: { required: false },
    vat: { required: false },
    ewt: { required: false },
  },
  SUPPLIER: {
    fullName: { required: true, message: "Supplier Name is required" },
    nickname: {
      required: true,
      message: "Supplier Nickname is required",
      validator: (value) =>
        value.length <= 50 ? true : "Nickname must not exceed 50 characters",
      maxLength: 50,
    },
    tin: {
      required: false,
      validator: (value) => {
        // Remove all non-digit characters (spaces, dashes, etc.)
        const digits = value.replace(/\D/g, "");
        return (
          digits.length === 0 || (digits.length >= 9 && digits.length <= 14)
        );
      },
      message: "TIN must be 9 – 14 digits",
    },
    address: { required: false },
  },

  CONTACT_SUPPLIER: {
    strName: { required: true, message: "Name is required" },
    strNumber: {
      required: true,
      validator: (value) => {
        // Remove all non-digit characters (spaces, dashes, etc.)
        const digits = value.replace(/\D/g, "");
        // Must be exactly 11 digits and start with 09
        return /^09\d{9}$/.test(digits);
      },
      message:
        "Number must start with 09 and be 11 digits (e.g., 0912-345-6789)",
    },
    strPosition: { required: false },
    strDepartment: { required: false },
  },

  BANK_SUPPLIER: {
    strBankName: {
      required: true,
      message: "Bank Name is required",
    },
    strAccountName: {
      required: true,
      message: "Account Name is required",
    },
    strAccountNumber: {
      required: true,
      validator: (value) => {
        // Remove all non-digit characters (spaces, dashes, etc.)
        const digits = value.replace(/\D/g, "");
        // Accept 10-16 digits (more flexible range for different banks)
        return /^\d{10,16}$/.test(digits);
      },
      message: "Account Number must be 10–16 digits",
    },
  },

  TRANSACTION: {
    // --- Step 0 : Basic Info ---
    strCode: {
      required: true,
      message: "Transaction Code is required",
    },
    nCompanyId: {
      required: true,
      message: "Company is required",
    },
    nClientId: {
      required: true,
      message: "Client is required",
    },
    strOfficeName: {
      required: true,
      message: "Office is required",
    },
    strOfficeNickName: {
      required: true,
      message: "Office Nickname is required",
    },

    // --- Step 1 : Procurement ---
    strTitle: {
      required: true,
      message: "Title is required",
    },
    cItemType: {
      required: true,
      message: "Item Type is required",
    },
    cProcMode: {
      required: true,
      message: "Procurement Mode is required",
    },
    cProcSource: {
      required: true,
      message: "Procurement Source is required",
    },
    strRefNumber: {
      required: false,
    },
    dTotalABC: {
      required: false,
      validator: (value) => {
        if (!value) return true;
        return !isNaN(value) && Number(value) >= 0;
      },
      message: "Total ABC must be a valid number",
    },

    // --- Step 2 : Schedule ---
    dtPreBid: {
      required: false,
    },
    strPreBid_Venue: {
      required: false,
    },
    dtDocIssuance: {
      required: false,
    },
    strDocIssuance_Venue: {
      required: false,
    },
    dtDocSubmission: {
      required: false,
    },
    strDocSubmission_Venue: {
      required: false,
    },
    dtDocOpening: {
      required: false,
    },
    strDocOpening_Venue: {
      required: false,
    },
  },

  TRANSACTION_ITEM: {
    name: { required: true, message: "Item Name is required" },
    specs: {
      required: true,
      message: "Specifications are required",
      isHtml: true,
    },
    qty: { required: true, message: "Quantity is required" },
    uom: { required: true, message: "UOM is required" },
    abc: { required: false, message: "Total ABC is required" },
  },

  TRANSACTION_OPTION: {
    nSupplierId: { required: true, message: "Supplier is required" },
    specs: {
      required: true,
      message: "Specifications are required",
      isHtml: true,
    },
    quantity: { required: true, message: "Quantity is required" },
    uom: { required: true, message: "UOM is required" },
    brand: { required: true, message: "Brand is required" },
    model: { required: true, message: "Model is required" },
    unitPrice: { required: true, message: "Unit Price is required" },
  },
};

// utils/form/validation.js

export const stripHtml = (html) => {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
};

export const validateFormData = (formData, formType) => {
  const rules = VALIDATION_RULES[formType];
  const errors = {};

  if (!rules) return errors;

  for (const [field, rule] of Object.entries(rules)) {
    let valueRaw = formData[field]?.toString().trim();

    // if the field is HTML (like ReactQuill)
    const value = rule.isHtml ? stripHtml(valueRaw).trim() : valueRaw;

    // Required field check
    if (rule.required && !value) {
      errors[field] = rule.message || `${field} is required`;
      continue;
    }

    // Custom validator function
    if (rule.validator && value) {
      const result = rule.validator(value);

      // If validator returns a string, use it as the error message
      if (typeof result === "string") {
        errors[field] = result;
      }
      // If validator returns false, use the default message
      else if (result === false) {
        errors[field] = rule.message || `${field} is invalid`;
      }
      // If validator returns true, no error
    }
  }

  return errors;
};

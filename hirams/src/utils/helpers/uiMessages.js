const uiMessages = {
  common: {
    //Status Management
    activating: "Activating ",
    deactivating: "Deactivating ",
    approving: "Approving ",
    adding: "Adding ",
    updating: "Updating ",
    deleting: "Deleting ",
    ellipsis: " ...",
    //Error Messages
    errorReqChar: "Please enter the required character to proceed.",
    errorUserType: "Please select a user type before approving.",
    errorMessage: "Something went wrong. Please try again.",
    //DUPLICATES
    emailExists: "This email already exists.",
    usernameExists: "This username already exists.",
    //LOGIN
    invalidInput: "Please enter your Username and Password.",
    processingInput: "Processing... Please Wait.",
    successInput: "Redirecting...",
    failedAttempt: "Login failed. Account does not exist or inactive.",
    invalidPassword: "Password is incorrect.",
    // One message for a wrong username AND a wrong password. Saying which of
    // the two was wrong tells an attacker that the username exists.
    invalidCredentials: "Incorrect username or password.",
    // Shown on the login form when the interceptor bounced an expired session.
    sessionExpired: "Your session has expired. Please sign in again.",
    //change password
    requiredPassword: "Password is required.",
    failedVerification: "Current password is required.",
    confirmPassword: "Please confirm your new password.",
    failedUpdatePassword: "Failed to update password. Please try again.",
    //REVERT
    errorRevert: "This transaction cannot be reverted.",
    //TRANSACTION ITEM
    invalidABC: "ABC is required when transaction has no ABC value",
    //CRUD Operations
    addedSuccessfully: " added successfully!",
    updatedSuccessfully: " updated successfully!",
    deletedSuccessfully: " deleted successfully!",
    processedSuccessfully: " processed successfully!",
    revertedSuccessfully: " reverted successfully!",
    verifiedSuccessfully: " verified successfully!",
    finalizedSuccessfully: " finalized successfully!",
    //Transaction action modal
    errorAction: "This transaction cannot proceed further.",
    errorRevert: "This transaction cannot be reverted.",
    errorVerified: "This transaction cannot be verified further",
    //tooltip transaction Canvas
    atLeastOneItem: "Please add at least one item first.",
    loadingItem: "Loading items...",
    mustBeFulfilled: "All item quantities must be fulfilled.",
    mustBeFulfilledBeforeExporting: "All item quantities must be fulfilled before exporting",
    //pricing
    unsavedChanges: "You have unsaved changes that will be lost. Are you sure you want to leave?",
    //markup
    greaterThanZero: "Enter a valid percentage greater than 0",
    // errorRevert: "",
    // errorRevert: "",
    // errorRevert: "",

  },
};

export default uiMessages;

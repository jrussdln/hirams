import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthAPI from "../../../api/endpoints/auth.api.js";
import uiMessages from "../../../utils/helpers/uiMessages";

export default function useForgotPassword() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ username: "", email: "" });
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  // "success" while sending, "error" when something failed.
  const [statusTone, setStatusTone] = useState("error");
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const setStatus = (message, tone = "error") => {
    setStatusMessage(message);
    setStatusTone(tone);
  };

  // Field errors replace the status line — "Processing…" must not linger
  // beside a message shown under an input.
  const showFieldErrors = (errors) => {
    setStatusMessage("");
    setStatusTone("error");
    setFieldErrors(errors);
  };

  // Errors are NOT auto-cleared on a timer — they stay under their input
  // until the field is edited (handleChange clears them), so they don't
  // vanish mid-sentence while they're being read.

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setStatusMessage("");
    setFieldErrors({});
  };

  const handleReset = async () => {
    if (loading) return; // Enter / double click while a request is running

    const { username, email } = formData;

    setStatusMessage("");
    setFieldErrors({});

    // Field-specific messages go under the inputs, so the status line stays
    // quiet here instead of repeating them.
    const errors = {};
    if (!username.trim()) errors.username = "Username is required.";
    if (!email.trim()) errors.email = "Email address is required.";
    if (Object.keys(errors).length) {
      showFieldErrors(errors);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showFieldErrors({ email: "Please enter a valid email address." });
      return;
    }

    setLoading(true);
    setStatus(uiMessages.common.processingInput, "success");

    try {
      const checkResponse = await AuthAPI.checkUsername({
        strUserName: username.trim(),
      });

      if (!checkResponse?.exists) {
        showFieldErrors({ username: uiMessages.common.failedAttempt });
        return; // ← finally will still fire
      }

      await AuthAPI.forgotPassword({
        strUserName: username.trim(),
        strEmail: email.trim(),
      });
      setStatusMessage("");
      setSubmitted(true);
    } catch (error) {
      if (error.status === 404) {
        showFieldErrors({
          email: "This email is not registered to the provided username.",
        });
      } else if (error.status === 422) {
        setStatus("Please check your inputs and try again.", "error");
      } else {
        setStatus(uiMessages.common.errorMessage, "error");
      }
    } finally {
      setLoading(false); // ← always runs, no more stuck spinner
    }
  };

  return {
    formData,
    loading,
    statusMessage,
    statusTone,
    fieldErrors,
    submitted,
    handleChange,
    handleReset,
    navigate,
  };
}
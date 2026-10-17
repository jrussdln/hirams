import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AuthAPI from "../../../api/endpoints/auth.api.js";
import uiMessages from "../../../utils/helpers/uiMessages";

export default function useResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token");
  const usernameFromLink = searchParams.get("username") || "";

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState(false);

  // Validate token on mount
  useEffect(() => {
    const run = async () => {
      if (!token) {
        setTokenValid(false);
        setValidating(false);
        return;
      }
      try {
        await AuthAPI.validateResetToken({ token });
        setTokenValid(true);
      } catch {
        setTokenValid(false);
      } finally {
        setValidating(false);
      }
    };
    run();
  }, [token]);

  // Errors are NOT auto-cleared on a timer — they stay under their input
  // until the field is edited (handleChange clears them), so they don't
  // vanish mid-sentence while they're being read. Status messages are
  // deliberately kept: the success screen relies on them staying put.
  const setError = (msg) => {
    setIsError(true);
    setStatusMessage(msg);
  };

  const setInfo = (msg) => {
    setIsError(false);
    setStatusMessage(msg);
  };

  const clearStatus = () => {
    setStatusMessage("");
    setFieldErrors({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    clearStatus();
  };

  const handleSubmit = async () => {
    if (loading) return; // Enter / double click while a request is running

    const { password, confirmPassword } = formData;
    clearStatus();

    // Field-specific messages go under the inputs instead of the status line.
    if (!password || !confirmPassword) {
      setFieldErrors({
        password: !password ? uiMessages.common.requiredPassword : "",
        confirmPassword: !confirmPassword
          ? uiMessages.common.confirmPassword
          : "",
      });
      return;
    }
    if (password.length < 6) {
      setFieldErrors({ password: "Password must be at least 6 characters." });
      return;
    }
    if (password !== confirmPassword) {
      setFieldErrors({
        password: "Passwords do not match.",
        confirmPassword: "Passwords do not match.",
      });
      return;
    }

    setLoading(true);
    setInfo("Processing your request…");

    try {
      await AuthAPI.resetPassword({
        token,
        strPassword: password,
        strPassword_confirmation: confirmPassword,
      });
      setSuccess(true);
      setTimeout(() => navigate("/"), 3000);
    } catch (error) {
      if (error.status === 400 || error.status === 422) {
        setError("This reset link has expired. Please request a new one.");
      } else {
        setError(uiMessages.common.errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    navigate,
    usernameFromLink,
    formData,
    showPassword,
    setShowPassword,
    showConfirm,
    setShowConfirm,
    loading,
    validating,
    tokenValid,
    statusMessage,
    isError,
    fieldErrors,
    success,
    handleChange,
    handleSubmit,
  };
}
import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import uiMessages from "../../../utils/helpers/uiMessages.js";
import { saveMappings } from "../../../utils/storage/mappingCache.js";
import { setItem, getItem } from "../../../utils/storage/localStorage.js";
import AuthAPI from "../../../api/endpoints/auth.api.js";
import MappingAPI from "../../../api/endpoints/mapping.api.js";

export default function useLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // The axios interceptor bounces an expired session to "/" with
  // ?reason=expired. Read it once, then burn the URL flag so a refresh (or a
  // second back/forward) doesn't replay the notice.
  const [sessionExpired, setSessionExpired] = useState(
    () => searchParams.get("reason") === "expired",
  );
  useEffect(() => {
    if (searchParams.get("reason") !== "expired") return;
    setSessionExpired(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  // Already signed in — a bookmark on "/", the back button, a second tab.
  // Send them where they were headed instead of asking for a password again.
  useEffect(() => {
    if (getItem("token") && getItem("user")) {
      navigate(location.state?.from || "/dashboard", { replace: true });
    }
  }, [navigate, location.state]);

  const [formData, setFormData] = useState({
    strUserName: "",
    strPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  // "success" = processing/redirecting, "error"/"info" = what went wrong.
  const [statusTone, setStatusTone] = useState("error");
  const [fieldErrors, setFieldErrors] = useState({});
  // Which input the view should pull focus into. A fresh object each time, so
  // failing the same field twice still focuses it twice.
  const [focusRequest, setFocusRequest] = useState(null);

  const setStatus = (message, tone = "error") => {
    setStatusMessage(message);
    setStatusTone(tone);
  };

  // Field errors take over the status line, so the stale "Processing…" must
  // be dropped the moment "Password is incorrect." shows up.
  const showFieldErrors = (errors, focusField) => {
    setStatusMessage("");
    setStatusTone("error");
    setFieldErrors(errors);
    if (focusField) setFocusRequest({ field: focusField });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Errors stay on screen until the field they belong to is touched — they
    // used to vanish after 5s, right while they were being read.
    setStatusMessage("");
    setFieldErrors({});
  };

  const prefetchMappings = async () => {
    try {
      const data = await MappingAPI.getMappings();
      saveMappings(data);
    } catch (e) {
      console.warn("Mapping prefetch failed:", e);
    }
  };

  const handleLogin = async () => {
    if (loading) return; // Enter / double click while a request is running

    const { strUserName, strPassword } = formData;

    setStatusMessage("");
    setFieldErrors({});

    if (!strUserName.trim() || !strPassword) {
      // Field-specific messages live under the inputs, not on the status line.
      const errors = {};
      if (!strUserName.trim()) errors.username = "Username is required.";
      if (!strPassword) errors.password = "Password is required.";
      showFieldErrors(errors, errors.username ? "username" : "password");
      return;
    }

    setLoading(true);
    setStatus(uiMessages.common.processingInput, "success");

    try {
      const response = await AuthAPI.login({
        strUserName: strUserName.trim(),
        strPassword,
      });
      const user = response?.user;

      if (response?.success && user) {
        setItem("token", response.token);
        setItem("user", user);
        setItem("userId", user.nUserId);
        setItem("role", user.cUserType?.toUpperCase().trim());
        setItem("status", user.cStatus?.toUpperCase().trim());

        setStatus(uiMessages.common.successInput, "success");
        await prefetchMappings();
        // Straight back to the page that was wanted (deep link), else the
        // dashboard. The old fixed 1s pause only held people on the form.
        navigate(location.state?.from || "/dashboard", { replace: true });
      } else {
        setStatus(uiMessages.common.errorMessage, "error");
      }
    } catch (error) {
      if (error?.status === 401 || error?.status === 404) {
        // One wording for both. Naming which of the two fields was wrong
        // would confirm that a username exists.
        setStatus(uiMessages.common.invalidCredentials, "error");
        setFocusRequest({ field: "username" });
      } else {
        setStatus(uiMessages.common.errorMessage, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    formData,
    loading,
    showPassword,
    setShowPassword,
    statusMessage,
    statusTone,
    sessionExpired,
    fieldErrors,
    focusRequest,
    handleChange,
    handleLogin,
  };
}

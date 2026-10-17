import { Outlet, Navigate, useLocation } from "react-router-dom";
import { getItem } from "../utils/storage/localStorage";

export default function ProtectedRoute({ allowedRoles }) {
  const location = useLocation();

  const user = getItem("user"); // storage.js already handles parse errors → returns null fallback
  const role = getItem("role");

  if (!user) {
    // Straight to the login form (not the 403 page), carrying the page that
    // was wanted so login can drop the user back on it afterwards.
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (allowedRoles?.length && !allowedRoles.includes(role)) {
    // Signed in, but this page is not for their role — the 403 page is the
    // right destination, and it can offer the way back to the right page.
    return <Navigate to="/index" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
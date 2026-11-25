import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import StatusPage from "../components/pages/StatusPage";
import LoadingPage from "../components/pages/LoadingPage";

export function RequireUser() {
  const { user, status } = useAuth();
  const location = useLocation();
  if (status === "loading") return <LoadingPage persistent />;
  if (!user) return <StatusPage type="unauthorized" description="Sign in to continue to this private page." />;
  if (user.profileComplete && location.pathname === "/complete-profile") return <Navigate to="/home" replace />;
  if (!user.profileComplete && location.pathname !== "/complete-profile") return <Navigate to="/complete-profile" replace />;
  return <Outlet />;
}

export function PublicOnly() {
  const { user, status } = useAuth();
  if (status === "loading") return <LoadingPage persistent />;
  return user ? <Navigate to={user.profileComplete ? "/home" : "/complete-profile"} replace /> : <Outlet />;
}

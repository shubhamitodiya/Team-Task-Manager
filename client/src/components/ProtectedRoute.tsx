import { Navigate } from "react-router-dom";
import { PropsWithChildren } from "react";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="screen-center">Loading workspace...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

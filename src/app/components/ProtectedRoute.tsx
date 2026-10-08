import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router";

type ProtectedRouteProps = {
  requiredRole?: "admin" | "borrower";
  redirectTo?: string;
};

export default function ProtectedRoute({
  requiredRole,
  redirectTo = "/login",
}: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auth/me`,
        {
          credentials: "include",
        }
      );

      if (!res.ok) {
        setAuthorized(false);
        return;
      }

      const user = await res.json();

      sessionStorage.setItem("user", JSON.stringify(user));

      setAuthorized(!requiredRole || user.role === requiredRole);
    } catch {
      setAuthorized(false);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#005B3F]/20 border-t-[#005B3F] rounded-full animate-spin" />
      </div>
    );
  }

  return authorized ? <Outlet /> : <Navigate to={redirectTo} replace />;
}
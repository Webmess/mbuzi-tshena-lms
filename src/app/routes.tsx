import React from "react";
import { createBrowserRouter, Outlet, useRouteError } from "react-router";

import PublicHome from "./pages/PublicHome";
import AdminLogin from "./pages/AdminLogin";
import UserLogin from "./pages/UserLogin";
import UserDashboard from "./pages/UserDashboard";
import LoanApplication from "./pages/LoanApplication";
import LoanConfirmation from "./pages/LoanConfirmation";

import DashboardLayout from "./pages/DashboardLayout";
import DashboardOverview from "./pages/DashboardOverview";
import LoanRequests from "./pages/LoanRequests";
import PaymentsTracker from "./pages/PaymentsTracker";
import BorrowersList from "./pages/BorrowersList";
import ProofOfPayments from "./pages/ProofOfPayments";
import InvestorRequests from "./pages/InvestorRequests";

import UserSignUp from "./pages/UserSignUp";
import ProtectedRoute from "./components/ProtectedRoute";

function RootErrorBoundary() {
  const error = useRouteError() as any;

  return (
    <div className="p-8 text-red-500 font-mono bg-red-50 h-screen">
      <h1 className="text-2xl font-bold mb-4">Application Error</h1>
      <pre className="whitespace-pre-wrap">{error?.message || String(error)}</pre>
      <pre className="whitespace-pre-wrap text-sm mt-4">{error?.stack}</pre>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Outlet,
    errorElement: <RootErrorBoundary />,
    children: [
      {
        index: true,
        Component: PublicHome,
      },
      {
        path: "home",
        Component: PublicHome,
      },

      // Public routes
      {
        path: "login",
        Component: UserLogin,
      },
      {
        path: "sign-up",
        Component: UserSignUp,
      },
      {
        path: "admin/login",
        Component: AdminLogin,
      },

      // Borrower protected route (redundant but kept for clarity)
      {
        element: (
          <ProtectedRoute
            requiredRole="borrower"
            redirectTo="/login"
          />
        ),
        children: [
          {
            path: "dashboard",
            Component: UserDashboard,
          },
          {
            path: "apply",
            Component: LoanApplication,
          },
          {
            path: "confirm",
            Component: LoanConfirmation,
          },
        ],
      },

      // Admin protected routes
      {
        element: (
          <ProtectedRoute
            requiredRole="admin"
            redirectTo="/admin/login"
          />
        ),
        children: [
          {
            path: "admin",
            Component: DashboardLayout,
            children: [
              {
                index: true,
                Component: DashboardOverview,
              },
              {
                path: "loans",
                Component: LoanRequests,
              },
              {
                path: "payments",
                Component: PaymentsTracker,
              },
              {
                path: "borrowers",
                Component: BorrowersList,
              },
              {
                path: "proofs",
                Component: ProofOfPayments,
              },
              {
                path: "investors",
                Component: InvestorRequests,
              },
            ],
          },
        ],
      },

      {
        path: "*",
        Component: PublicHome,
      },
    ],
  },
]);
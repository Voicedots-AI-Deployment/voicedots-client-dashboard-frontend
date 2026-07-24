import { Routes, Route, Navigate } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";
import DashboardLayout from "../layouts/DashboardLayout";
import LoginPage from "../pages/LoginPage";

import { HomePage } from "@/pages/dashboard/HomePage";
import { ConversationsPage } from "@/pages/dashboard/ConversationsPage";
import { ConversationDetails } from "@/pages/dashboard/ConversationDetails";
import SettingsPage from "@/pages/dashboard/SettingsPage";
import CommunicationsPage from "@/pages/dashboard/CommunicationsPage";
import ProtectedRoute from "@/routes/ProtectedRoute";
import { LeadsPage } from "@/pages/dashboard/LeadsPage";
// Tickets hidden 2026-07-05: backend ticket router disabled + table empty.
// import { TicketsPage } from "@/pages/dashboard/TicketsPage";

const AppRoutes = () => {
  return (
    <Routes>
      {/* ROOT */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* AUTH */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* PROTECTED ROUTES */}
      <Route element={<ProtectedRoute />}>
        {/* DASHBOARD */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<HomePage />} />

          {/* CONVERSATIONS */}
          <Route path="conversations" element={<ConversationsPage />} />
          <Route
            path="conversations/:id"
            element={<ConversationDetails />}
          />

          {/* LEADS */}
          <Route path="leads" element={<LeadsPage />} />

          {/* COMMUNICATIONS */}
          <Route path="communications" element={<CommunicationsPage />} />

          {/* TICKETS — hidden 2026-07-05 (backend router disabled + table empty) */}
          {/* <Route path="tickets" element={<TicketsPage />} /> */}

          {/* SETTINGS */}
          <Route path="settings" element={<SettingsPage />} />

          {/* DASHBOARD FALLBACK */}
          <Route
            path="*"
            element={<Navigate to="/dashboard" replace />}
          />
        </Route>

        {/* GLOBAL 404 */}
        <Route path="*" element={<div>Page not found</div>} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;

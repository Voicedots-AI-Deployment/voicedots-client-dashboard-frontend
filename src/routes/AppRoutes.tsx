import { Routes, Route, Navigate } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";
import DashboardLayout from "../layouts/DashboardLayout";
import LoginPage from "../pages/LoginPage";

import { HomePage } from "@/pages/dashboard/HomePage";
import { ConversationsPage } from "@/pages/dashboard/ConversationsPage";
import { ConversationDetails } from "@/pages/dashboard/ConversationDetails";
import SettingsPage from "@/pages/dashboard/SettingsPage";
import EmailPage from "@/pages/dashboard/email/EmailPage";
import CallingPage from "@/pages/dashboard/communications/CallingPage";
import WhatsAppPage from "@/pages/dashboard/communications/WhatsAppPage";
import ProtectedRoute from "@/routes/ProtectedRoute";
import { LeadsPage } from "@/pages/dashboard/LeadsPage";
import KnowledgePage from "@/pages/dashboard/KnowledgePage";
import { TicketsPage } from "@/pages/dashboard/TicketsPage";

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

          {/* SUPPORT TICKETS */}
          <Route path="tickets" element={<TicketsPage />} />

          {/* COMMUNICATIONS — AI calling + WhatsApp (shown; not wired yet) */}
          <Route path="communications" element={<Navigate to="/dashboard/communications/calling" replace />} />
          <Route path="communications/calling" element={<CallingPage />} />
          <Route path="communications/whatsapp" element={<WhatsAppPage />} />

          {/* EMAIL SERVICES */}
          <Route path="email" element={<EmailPage />} />
          <Route path="email/sender" element={<Navigate to="/dashboard/email" replace />} />
          <Route path="email/templates" element={<Navigate to="/dashboard/email" replace />} />

          {/* KNOWLEDGE BASE */}
          <Route path="knowledge" element={<KnowledgePage />} />

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

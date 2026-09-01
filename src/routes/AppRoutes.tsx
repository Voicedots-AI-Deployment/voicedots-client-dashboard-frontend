import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import AuthLayout from "../layouts/AuthLayout";
import DashboardLayout from "../layouts/DashboardLayout";
import ProtectedRoute from "@/routes/ProtectedRoute";

const LoginPage = lazy(() => import("../pages/LoginPage"));
const HomePage = lazy(() => import("@/pages/dashboard/HomePage").then((module) => ({ default: module.HomePage })));
const ConversationsPage = lazy(() => import("@/pages/dashboard/ConversationsPage").then((module) => ({ default: module.ConversationsPage })));
const ConversationDetails = lazy(() => import("@/pages/dashboard/ConversationDetails").then((module) => ({ default: module.ConversationDetails })));
const LeadsPage = lazy(() => import("@/pages/dashboard/LeadsPage").then((module) => ({ default: module.LeadsPage })));
const TicketsPage = lazy(() => import("@/pages/dashboard/TicketsPage").then((module) => ({ default: module.TicketsPage })));
const KnowledgePage = lazy(() => import("@/pages/dashboard/KnowledgePage"));
const SettingsPage = lazy(() => import("@/pages/dashboard/SettingsPage"));
const CallingPage = lazy(() => import("@/pages/dashboard/communications/CallingPage"));
const WhatsAppPage = lazy(() => import("@/pages/dashboard/communications/WhatsAppPage"));
const EmailPage = lazy(() => import("@/pages/dashboard/email/EmailPage"));

const PageLoader = () => <div className="flex min-h-48 items-center justify-center text-sm font-medium text-slate-500">Loading…</div>;

const AppRoutes = () => {
  return (
    <Suspense fallback={<PageLoader />}><Routes>
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
    </Routes></Suspense>
  );
};

export default AppRoutes;

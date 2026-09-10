import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import AuthLayout from "../layouts/AuthLayout";
import DashboardLayout from "../layouts/DashboardLayout";
import ProtectedRoute from "@/routes/ProtectedRoute";
import EmailFeatureGuard from "@/routes/EmailFeatureGuard";

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
const InboxPage = lazy(() => import("@/pages/dashboard/email/EmailWorkspacePages").then((m) => ({ default: m.InboxPage })));
const SingleEmailPage = lazy(() => import("@/pages/dashboard/email/EmailWorkspacePages").then((m) => ({ default: m.SingleEmailPage })));
const EmailTemplatesPage = lazy(() => import("@/pages/dashboard/email/EmailWorkspacePages").then((m) => ({ default: m.TemplatesPage })));
const EmailCampaignsPage = lazy(() => import("@/pages/dashboard/email/EmailWorkspacePages").then((m) => ({ default: m.CampaignsPage })));
const EmailAutomationsPage = lazy(() => import("@/pages/dashboard/email/EmailWorkspacePages").then((m) => ({ default: m.AutomationsPage })));
const EmailSettingsPage = lazy(() => import("@/pages/dashboard/email/EmailWorkspacePages").then((m) => ({ default: m.EmailSettingsPage })));

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

          {/* EMAIL SERVICES — organization entitlement required */}
          <Route element={<EmailFeatureGuard />}>
            <Route path="communications/email" element={<EmailPage />}>
              <Route index element={<Navigate to="inbox" replace />} />
              <Route path="inbox" element={<InboxPage />} />
              <Route path="single" element={<SingleEmailPage />} />
              <Route path="templates" element={<EmailTemplatesPage />} />
              <Route path="campaigns" element={<EmailCampaignsPage />} />
              <Route path="automations" element={<EmailAutomationsPage />} />
              <Route path="settings" element={<EmailSettingsPage />} />
            </Route>
          </Route>
          <Route path="email/*" element={<Navigate to="/dashboard/communications/email" replace />} />

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

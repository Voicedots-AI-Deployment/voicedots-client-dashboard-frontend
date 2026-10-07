import { useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/context/AuthContext";

const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  if (user?.portal_role === "placement_staff" && !location.pathname.startsWith("/dashboard/placement-management") && !location.pathname.startsWith("/dashboard/attendance") && !location.pathname.startsWith("/dashboard/erp")) {
    return <Navigate to="/dashboard/placement-management" replace />;
  }

  return (
    <div className="client-dashboard flex min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* SIDEBAR */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={isCollapsed}
      />

      {/* MAIN COLUMN */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* TOP BAR (sticky at top) */}
        <TopBar
          onMenuClick={() => setIsSidebarOpen(true)}
          onToggleSidebar={() => setIsCollapsed(!isCollapsed)}
          isSidebarCollapsed={isCollapsed}
        />

        {/* 
          ✅ PRIMARY CONTENT AREA
          - No height restriction here
          - No overflow-y-auto here (let the body/root layout scroll)
        */}
        <main
          className={`flex-1 min-w-0 overflow-x-clip ${
            location.pathname.startsWith("/dashboard/conversations/")
              ? "p-0"
              : location.pathname.startsWith("/dashboard/placement-management")
              ? "px-3 py-2 sm:px-4 md:px-6 lg:px-8 md:py-3"
              : "px-3 py-4 sm:px-4 md:px-6 lg:px-8 md:py-8"
          }`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;

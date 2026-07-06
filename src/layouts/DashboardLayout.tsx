import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* SIDEBAR */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={isCollapsed}
      />

      {/* MAIN COLUMN */}
      <div className="flex flex-col flex-1 w-full">
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
          className={`flex-1 min-w-0 overflow-x-hidden ${
            location.pathname.startsWith("/dashboard/conversations/")
              ? "p-0"
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

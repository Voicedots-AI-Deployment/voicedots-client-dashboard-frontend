import { Home, MessageSquare, Settings, LogOut, Users, Mail } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import authApi from "@/api/authApi";
import SidebarLogo from "./SideBarLogo";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
}

export function Sidebar({ isOpen, onClose, isCollapsed }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: "home", icon: Home, label: "Home", path: "/dashboard" },
    { id: "conversations", icon: MessageSquare, label: "Conversations", path: "/dashboard/conversations" },
    { id: "leads", icon: Users, label: "Leads", path: "/dashboard/leads" },
    { id: "communications", icon: Mail, label: "Communications", path: "/dashboard/communications" },
    // Tickets hidden 2026-07-05: backend ticket router disabled + table empty. Re-enable (and re-add `Ticket` icon import) when a ticket producer exists.
    { id: "settings", icon: Settings, label: "Settings", path: "/dashboard/settings" },
  ];

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm md:hidden transition-opacity ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 start-0 z-[70] transition-all duration-300 transform bg-white border-e border-slate-200 dark:bg-slate-900 dark:border-slate-800 w-72 md:w-auto ${isOpen ? "translate-x-0" : "-translate-x-full"} ${isCollapsed ? "md:w-20" : "md:w-64"} md:translate-x-0 md:sticky md:top-0 md:h-screen md:block`}
      >
        <div className="flex flex-col h-full py-6">
          <SidebarLogo isCollapsed={isCollapsed} onClose={onClose} />

          <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto mt-6">
            {navItems.map((item) => {
              const isActive = item.path === "/dashboard" ? location.pathname === "/dashboard" : location.pathname.startsWith(item.path);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); navigate(item.path); onClose(); }}
                  className={`w-full flex items-center gap-x-3.5 py-3 px-4 text-sm font-semibold rounded-xl transition-all duration-200 ${isActive ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none" : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"} ${isCollapsed ? "md:justify-center md:px-0" : ""}`}
                >
                  <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  {!isCollapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>

          <div className="px-3 mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); authApi.logout().then(() => navigate("/login", { replace: true })); }}
              className={`w-full flex items-center gap-x-3.5 py-3 px-4 text-sm font-bold text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-all ${isCollapsed ? "md:justify-center md:px-0" : ""}`}
            >
              <LogOut size={20} />
              {!isCollapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}


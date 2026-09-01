import { useState } from "react";
import {
  Home, MessageSquare, Settings, LogOut, Users, Radio, ChevronDown, BookOpen, TicketCheck,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import authApi from "@/api/authApi";
import SidebarLogo from "./SideBarLogo";
import { useAuth } from "@/context/AuthContext";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
}

interface NavChild {
  id: string;
  label: string;
  path: string;
}

interface NavItem {
  id: string;
  icon: typeof Home;
  label: string;
  path: string;
  children?: NavChild[];
}

export function Sidebar({ isOpen, onClose, isCollapsed }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const navItems: NavItem[] = [
    { id: "home", icon: Home, label: "Home", path: "/dashboard" },
    { id: "conversations", icon: MessageSquare, label: "Conversations", path: "/dashboard/conversations" },
    { id: "leads", icon: Users, label: "Leads", path: "/dashboard/leads" },
    { id: "tickets", icon: TicketCheck, label: "Tickets", path: "/dashboard/tickets" },
    { id: "knowledge", icon: BookOpen, label: "Knowledge Base", path: "/dashboard/knowledge" },
    {
      id: "communications", icon: Radio, label: "Communications", path: "/dashboard/communications",
      children: [
        { id: "calling", label: "AI Calling", path: "/dashboard/communications/calling" },
        { id: "whatsapp", label: "WhatsApp", path: "/dashboard/communications/whatsapp" },
        { id: "email", label: "Email", path: "/dashboard/email" },
      ],
    },
    { id: "settings", icon: Settings, label: "Settings", path: "/dashboard/settings" },
  ];

  // A group owns its children's routes, which do not all sit under its own path
  // (the email pages live at /dashboard/email/* but belong to Communications).
  const inGroup = (item: NavItem) =>
    location.pathname.startsWith(item.path) ||
    !!item.children?.some((c) => location.pathname.startsWith(c.path));

  // Groups start open when you're inside them.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(navItems.filter((i) => i.children).map((i) => [i.id, inGroup(i)]))
  );

  const go = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm md:hidden transition-opacity ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 start-0 z-[70] transition-all duration-300 transform bg-white border-e border-slate-200 dark:bg-slate-900 dark:border-slate-800 w-72 ${isOpen ? "translate-x-0" : "-translate-x-full"} ${isCollapsed ? "md:w-20" : "md:w-64"} md:translate-x-0 md:sticky md:top-0 md:h-screen md:block`}
      >
        <div className="flex flex-col h-full py-6">
          <SidebarLogo isCollapsed={isCollapsed} onClose={onClose} />

          <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto mt-6">
            {navItems.map((item) => {
              const isActive = item.path === "/dashboard"
                ? location.pathname === "/dashboard"
                : inGroup(item);
              const hasChildren = !!item.children?.length;
              // Collapsed rail has no room for sub-items: jump to the first child.
              const expanded = hasChildren && !isCollapsed && openGroups[item.id];

              return (
                <div key={item.id}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (hasChildren && !isCollapsed) {
                        setOpenGroups((g) => ({ ...g, [item.id]: !g[item.id] }));
                        if (!inGroup(item)) go(item.children![0].path);
                      } else {
                        go(hasChildren ? item.children![0].path : item.path);
                      }
                    }}
                    className={`w-full flex items-center gap-x-3.5 py-3 px-4 text-sm font-semibold rounded-xl transition-all duration-200 ${isActive ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none" : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"} ${isCollapsed ? "md:justify-center md:px-0" : ""}`}
                  >
                    <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                    {!isCollapsed && <span className="flex-1 text-left">{item.label}</span>}
                    {!isCollapsed && hasChildren && (
                      <ChevronDown
                        size={16}
                        className={`transition-transform ${expanded ? "rotate-180" : ""}`}
                      />
                    )}
                  </button>

                  {expanded && (
                    <div className="mt-1 ms-6 ps-3 border-s border-slate-200 dark:border-slate-800 space-y-1">
                      {item.children!.map((child) => {
                        const childActive = location.pathname === child.path;
                        return (
                          <button
                            key={child.id}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); go(child.path); }}
                            className={`w-full text-left py-2 px-3 text-[13px] font-medium rounded-lg transition-colors ${childActive ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300" : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"}`}
                          >
                            {child.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="px-3 mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                await authApi.logout();
                logout();
                navigate("/login", { replace: true });
              }}
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

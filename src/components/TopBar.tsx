import { useEffect, useRef, useState, startTransition } from "react";
import { Bell, Menu, ChevronDown, PanelLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import authApi from "@/api/authApi";
import { useAuth } from "@/context/AuthContext";

interface TopBarProps {
  onMenuClick: () => void;
  onToggleSidebar: () => void;
  isSidebarCollapsed?: boolean;
}

export function TopBar({
  onMenuClick,
  onToggleSidebar,
  isSidebarCollapsed,
}: TopBarProps) {
  const navigate = useNavigate();

  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);

  // Avatar initials
  const initials = user?.name ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2) : "U";

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Remove red dot when notifications opened
  useEffect(() => {
    if (notifOpen) {
      startTransition(() => {
        setHasUnread(false);
      });
    }
  }, [notifOpen]);

  return (
    <header className="sticky top-0 inset-x-0 z-50 w-full bg-white border-b border-gray-200 dark:bg-slate-900 dark:border-slate-700">
      <nav className="relative w-full px-4 h-16 flex items-center justify-between">
        {/* LEFT */}
        <div className="flex items-center gap-2">
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 rounded-lg border bg-white text-gray-700 hover:bg-gray-50 dark:bg-slate-900 dark:border-slate-700 dark:text-gray-400"
          >
            <Menu size={20} />
          </button>

          <button
            onClick={onToggleSidebar}
            className="hidden md:flex p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-gray-400 dark:hover:bg-slate-800"
          >
            <PanelLeft size={20} />
          </button>
        </div>

        {/* RIGHT */}
        <div
          className={`flex items-center gap-3 sm:gap-4 transition-all ${isSidebarCollapsed ? "md:mr-2" : ""
            }`}
        >
          {/* 🔔 Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setNotifOpen(!notifOpen);
                setProfileOpen(false);
              }}
              className="relative h-9 w-9 rounded-full border border-gray-200 flex items-center justify-center bg-white hover:bg-gray-50 dark:bg-slate-900 dark:border-slate-700 dark:text-gray-400"
            >
              <Bell size={18} />
              {hasUnread && (
                <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />
              )}
            </button>

            {notifOpen && (
              <div
                className="
                  fixed md:absolute
                  top-16 md:top-auto
                  left-1/2 md:left-auto
                  -translate-x-1/2 md:translate-x-0
                  right-auto md:right-0
                  mt-2
                  w-[calc(100vw-1rem)] md:w-72
                  max-w-md
                  rounded-2xl
                  border border-gray-200
                  bg-white
                  shadow-xl
                  dark:bg-slate-900 dark:border-slate-700
                  z-50
                "
              >
                <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">
                    Notifications
                  </p>
                </div>

                <div className="py-2">
                  <div className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    🎉 Welcome to{" "}
                    <span className="font-semibold">Voicedots</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 👤 Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => {
                setProfileOpen(!profileOpen);
                setNotifOpen(false);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2 sm:px-3 py-1.5 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:hover:bg-slate-800"
            >
              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs overflow-hidden">
                {user?.profile_picture ? (
                  <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>

              {/* Hide name on small screens */}
              <span className="hidden md:block text-gray-600 dark:text-gray-400">
                {user?.name || "User"}
              </span>

              <ChevronDown
                size={14}
                className={`text-gray-400 transition ${profileOpen ? "rotate-180" : ""
                  }`}
              />
            </button>

            {profileOpen && (
              <div
                className="
                  absolute right-0 mt-2
                  w-[calc(100vw-1rem)] sm:w-56
                  rounded-2xl
                  border border-gray-200
                  bg-white
                  shadow-xl
                  dark:bg-slate-900 dark:border-slate-700
                  z-50
                "
              >
                <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">
                    {user?.name || "User"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user?.email || ""}
                  </p>
                </div>

                <div className="py-2">
                  {/* Pricing (disabled) */}
                  <button
                    disabled
                    className="w-full text-left px-4 py-2 text-sm text-gray-400 cursor-not-allowed"
                  >
                    Pricing
                  </button>

                  {/* Settings */}
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      navigate("/dashboard/settings");
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800"
                  >
                    Settings
                  </button>
                </div>

                <div className="border-t border-gray-200 dark:border-slate-700">
                  {/* Logout */}
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      logout();
                      authApi.logout().then(() => {
                        navigate("/login", { replace: true });
                      });
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-slate-800"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}

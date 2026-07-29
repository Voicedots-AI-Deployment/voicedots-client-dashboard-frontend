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
    <header className="sticky top-0 inset-x-0 z-50 w-full bg-[#0B0B13]/80 backdrop-blur-xl">
      <nav className="relative w-full px-4 h-16 flex items-center justify-between">
        {/* LEFT */}
        <div className="flex items-center gap-2">
          <button
            onClick={onMenuClick}
            className="md:hidden h-10 w-10 rounded-full border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07] flex items-center justify-center transition-colors"
          >
            <Menu size={20} />
          </button>

          <button
            onClick={onToggleSidebar}
            className="hidden md:flex h-10 w-10 rounded-full border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07] items-center justify-center transition-colors"
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
              className="relative h-10 w-10 rounded-full border border-white/10 flex items-center justify-center bg-white/[0.03] text-slate-300 hover:bg-white/[0.07] transition-colors"
            >
              <Bell size={18} />
              {hasUnread && (
                <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-[#7B3FE4] ring-2 ring-[#0B0B13]" />
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
                  border border-white/10
                  bg-[#161722]
                  shadow-2xl shadow-black/50
                  z-50
                "
              >
                <div className="px-4 py-3 border-b border-white/5">
                  <p className="text-sm font-semibold text-white">
                    Notifications
                  </p>
                </div>

                <div className="py-2">
                  <div className="px-4 py-3 text-sm text-slate-300">
                    🎉 Welcome to{" "}
                    <span className="font-semibold text-white">Voicedots</span>
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
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-2 sm:px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/[0.07] transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#7B3FE4] to-[#4B22F4] flex items-center justify-center text-white text-xs overflow-hidden">
                {user?.profile_picture ? (
                  <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>

              {/* Hide name on small screens */}
              <span className="hidden md:block text-slate-200">
                {user?.name || "User"}
              </span>

              <ChevronDown
                size={14}
                className={`text-slate-400 transition ${profileOpen ? "rotate-180" : ""
                  }`}
              />
            </button>

            {profileOpen && (
              <div
                className="
                  absolute right-0 mt-2
                  w-[calc(100vw-1rem)] sm:w-56
                  rounded-2xl
                  border border-white/10
                  bg-[#161722]
                  shadow-2xl shadow-black/50
                  z-50
                "
              >
                <div className="p-4 border-b border-white/5">
                  <p className="text-sm font-semibold text-white">
                    {user?.name || "User"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {user?.email || ""}
                  </p>
                </div>

                <div className="py-2">
                  {/* Pricing (disabled) */}
                  <button
                    disabled
                    className="w-full text-left px-4 py-2 text-sm text-slate-600 cursor-not-allowed"
                  >
                    Pricing
                  </button>

                  {/* Settings */}
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      navigate("/dashboard/settings");
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-white/[0.05]"
                  >
                    Settings
                  </button>
                </div>

                <div className="border-t border-white/5">
                  {/* Logout */}
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      logout();
                      authApi.logout().then(() => {
                        navigate("/login", { replace: true });
                      });
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
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

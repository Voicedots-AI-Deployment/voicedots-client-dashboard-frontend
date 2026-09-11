import { Mail } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

const tabs = [
  ["Inbox", "/dashboard/communications/gmail/inbox"],
  ["Compose", "/dashboard/communications/gmail/single"],
  ["Settings", "/dashboard/communications/gmail/settings"],
];

export default function EmailPage() {
  return (
    <div className="min-h-[calc(100dvh-140px)] space-y-5 rounded-2xl bg-[#f9f8ff] p-4 text-slate-900 dark:bg-slate-950/30 dark:text-slate-100 sm:p-6">
      <header className="rounded-2xl border border-violet-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-indigo-600 p-3 text-white"><Mail size={22} /></span>
          <div>
            <h1 className="text-2xl font-bold">Gmail</h1>
            <p className="text-sm text-slate-500">Manage the connected Gmail mailbox, conversations and outgoing messages.</p>
          </div>
        </div>
        <nav className="mt-6 flex gap-2 overflow-x-auto">
          {tabs.map(([label, path]) => (
            <NavLink key={path} to={path} className={({ isActive }) =>
              `whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold ${isActive ? "bg-indigo-600 text-white" : "bg-violet-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`
            }>{label}</NavLink>
          ))}
        </nav>
      </header>
      <Outlet />
    </div>
  );
}

import { X } from "lucide-react";

interface SidebarLogoProps {
  isCollapsed: boolean;
  onClose: () => void;
  className?: string;
}

export default function SidebarLogo({ isCollapsed, onClose, className = "" }: SidebarLogoProps) {
  return (
    <div className={`client-sidebar-brand flex shrink-0 items-center justify-between px-8 py-7 ${isCollapsed ? "md:px-5" : ""} ${className}`}>
      <div className="client-brand" aria-label="VoiceDots">
        <img src="/voicedotslogo.svg" alt="" />
        {!isCollapsed && <span>oiceDots</span>}
      </div>
      <button type="button" onClick={onClose} aria-label="Close sidebar" className="md:hidden rounded-lg p-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">
        <X size={20} />
      </button>
    </div>
  );
}

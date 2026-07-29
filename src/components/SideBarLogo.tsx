import React from 'react';
import { X } from 'lucide-react';

interface SidebarLogoProps {
  isCollapsed: boolean;
  onClose: () => void;
  className?: string;
}

/**
 * The brand mark is the VoiceDots SVG followed by the wordmark, as it has always
 * been drawn. A substitute built from a letter and two CSS dots is not the logo,
 * so the asset in /public is used directly.
 */
const SidebarLogo: React.FC<SidebarLogoProps> = ({
  isCollapsed,
  onClose,
  className = "",
}) => {
  return (
    <div className={`px-6 flex items-center justify-between ${className}`}>
      <div className="flex items-center">
        <h1 className="text-2xl md:text-[28px] font-bold tracking-tighter text-white leading-none select-none">
          <img
            src="/voicedotslogo.svg"
            alt="VoiceDots"
            className="h-[1.1em] w-auto inline-block align-middle -translate-y-[0.1em] mr-[-0.3em]"
          />
          {!isCollapsed ? "oiceDots" : null}
        </h1>
      </div>

      {/* Mobile close button */}
      <button
        onClick={onClose}
        aria-label="Close sidebar"
        className="md:hidden text-slate-400 hover:text-white transition-colors"
      >
        <X size={20} />
      </button>
    </div>
  );
};

export default SidebarLogo;

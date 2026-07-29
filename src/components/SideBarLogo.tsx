import React from 'react';
import { X } from 'lucide-react';

interface SidebarLogoProps {
  isCollapsed: boolean;
  onClose: () => void;
  className?: string;
}

/** A single letter carrying a small purple accent dot in its top-left corner. */
const DottedLetter: React.FC<{ letter: string }> = ({ letter }) => (
  <span className="relative inline-block">
    <span
      className="absolute -top-0.5 -left-0.5 h-1.5 w-1.5 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#4B22F4] shadow-[0_0_8px_rgba(123,63,228,0.9)]"
    />
    {letter}
  </span>
);

const SidebarLogo: React.FC<SidebarLogoProps> = ({
  isCollapsed,
  onClose,
  className = "",
}) => {
  return (
    <div className={`px-6 flex items-center justify-between ${className}`}>
      {/* Wordmark */}
      <div className="flex items-center">
        <h1 className="text-2xl md:text-[28px] font-extrabold tracking-tight text-white leading-none select-none">
          <DottedLetter letter="V" />
          {!isCollapsed && (
            <>
              oice<DottedLetter letter="D" />ots
            </>
          )}
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

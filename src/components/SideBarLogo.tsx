import React from 'react';
import { X } from 'lucide-react'; 

interface SidebarLogoProps {
  isCollapsed: boolean;
  onClose: () => void;
  className?: string;
}

const SidebarLogo: React.FC<SidebarLogoProps> = ({ 
  isCollapsed, 
  onClose, 
  className = "" 
}) => {
  return (
    <div className={`px-6 mb-8 flex items-center justify-between ${className}`}>
      
      {/* Logo Container */}
      <div className="flex items-center">
        {/* Icon logo */}
        <h1
          className="
            text-2xl md:text-4xl font-bold tracking-tighter mb-6
            bg-clip-text
            bg-gradient-to-b
            from-foreground to-foreground/60
          "
          >
            <img
              src="/voicedotslogo.svg"
              alt="V"
              className="h-[1.1em] w-auto inline-block align-middle -translate-y-[0.1em] mr-[-0.3em]"
            />
            {!isCollapsed ? "oiceDots" : null}
          </h1>

        {/* Text logo
        {!isCollapsed && (
          <img
            src={logoText}
            alt="Voicedots"
            className="h-8 md:h-10 object-contain mt-1.5"
          />
        )} */}
      </div>

      {/* Mobile close button */}
      <button
        onClick={onClose}
        aria-label="Close sidebar"
        className="md:hidden text-gray-500 hover:text-gray-800 dark:text-gray-400 transition-colors"
      >
        <X size={20} />
      </button>
    </div>
  );
};

export default SidebarLogo;
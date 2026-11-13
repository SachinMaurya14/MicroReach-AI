import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidthClass?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidthClass = 'max-w-2xl',
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-[#1E0B36]/55 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-heading"
      onClick={onClose}
    >
      <div
        className={`relative w-full ${maxWidthClass} max-h-[90vh] overflow-y-auto rounded-2xl bg-white border border-[#E5E7EB] shadow-2xl p-6 sm:p-8`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-[#E5E7EB]">
          <div>
            <h3 id="modal-heading" className="text-xl font-bold text-[#1F2937] tracking-tight">
              {title}
            </h3>
            {subtitle && <p className="mt-1 text-sm text-[#4B5563]">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E7EB] text-[#4B5563] hover:text-[#1F2937] hover:bg-[#F9FAFB] transition-colors cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="pt-5">{children}</div>
      </div>
    </div>
  );
};

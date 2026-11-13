import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { QualificationStatus } from '../../types/landing';

interface StatusBadgeProps {
  status: QualificationStatus | 'Passed';
}

export const QualificationBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  if (status === 'Qualified' || status === 'Passed') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#D1FAE5] px-2.5 py-0.5 text-xs font-semibold text-[#065F46] whitespace-nowrap">
        <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981] shrink-0" aria-hidden="true" />
        <span>{status}</span>
      </span>
    );
  }

  if (status === 'Review') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF3C7] px-2.5 py-0.5 text-xs font-semibold text-[#92400E] whitespace-nowrap">
        <AlertTriangle className="h-3.5 w-3.5 text-[#D97706] shrink-0" aria-hidden="true" />
        <span>Review</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEE2E2] px-2.5 py-0.5 text-xs font-semibold text-[#991B1B] whitespace-nowrap">
      <XCircle className="h-3.5 w-3.5 text-[#EF4444] shrink-0" aria-hidden="true" />
      <span>Failed</span>
    </span>
  );
};

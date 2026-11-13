import React from 'react';
import { InfluencerThumbnailSpec } from '../../types/influencer';

interface CreatorThumbnailGridProps {
  thumbnails: InfluencerThumbnailSpec[];
}

function renderMotifIllustration(
  motif: InfluencerThumbnailSpec['motif'],
  accent: string
) {
  switch (motif) {
    case 'serum':
      return (
        <svg viewBox="0 0 48 48" className="h-7 w-7" fill="none" aria-hidden="true">
          <rect x="17" y="16" width="14" height="22" rx="4" fill={accent} fillOpacity="0.18" stroke={accent} strokeWidth="1.6" />
          <rect x="20" y="9" width="8" height="7" rx="1.5" fill={accent} />
          <path d="M24 5V9" stroke={accent} strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="24" cy="27" r="3" fill={accent} fillOpacity="0.45" />
        </svg>
      );
    case 'sunscreen':
      return (
        <svg viewBox="0 0 48 48" className="h-7 w-7" fill="none" aria-hidden="true">
          <circle cx="24" cy="21" r="7" fill={accent} fillOpacity="0.22" stroke={accent} strokeWidth="1.6" />
          <path d="M24 9V11M24 31V33M12 21H14M34 21H36M15.5 12.5L17 14M31 28L32.5 29.5M32.5 12.5L31 14M17 28L15.5 29.5" stroke={accent} strokeWidth="1.6" strokeLinecap="round" />
          <rect x="16" y="36" width="16" height="4" rx="2" fill={accent} fillOpacity="0.35" />
        </svg>
      );
    case 'botanical':
      return (
        <svg viewBox="0 0 48 48" className="h-7 w-7" fill="none" aria-hidden="true">
          <path
            d="M14 34C14 21 22 13 34 13C34 25 26 34 14 34Z"
            fill={accent}
            fillOpacity="0.2"
            stroke={accent}
            strokeWidth="1.6"
          />
          <path d="M14 34L27 21" stroke={accent} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'cleanser':
      return (
        <svg viewBox="0 0 48 48" className="h-7 w-7" fill="none" aria-hidden="true">
          <rect x="16" y="18" width="16" height="20" rx="5" fill={accent} fillOpacity="0.16" stroke={accent} strokeWidth="1.6" />
          <path d="M24 18V12H30" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="33" cy="17" r="2.2" fill={accent} fillOpacity="0.5" />
        </svg>
      );
    case 'review':
      return (
        <svg viewBox="0 0 48 48" className="h-7 w-7" fill="none" aria-hidden="true">
          <rect x="11" y="12" width="26" height="24" rx="4" fill={accent} fillOpacity="0.14" stroke={accent} strokeWidth="1.6" />
          <path d="M16 20H32M16 26H26" stroke={accent} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'routine':
    default:
      return (
        <svg viewBox="0 0 48 48" className="h-7 w-7" fill="none" aria-hidden="true">
          <circle cx="19" cy="24" r="8" fill={accent} fillOpacity="0.18" stroke={accent} strokeWidth="1.6" />
          <rect x="26" y="17" width="11" height="15" rx="3" fill={accent} fillOpacity="0.25" stroke={accent} strokeWidth="1.5" />
        </svg>
      );
  }
}

export const CreatorThumbnailGrid: React.FC<CreatorThumbnailGridProps> = ({
  thumbnails,
}) => {
  return (
    <div className="grid grid-cols-3 gap-1.5 w-full">
      {thumbnails.slice(0, 6).map((tile) => (
        <div
          key={tile.id}
          className="aspect-[4/3] rounded-[6px] border border-[#E5E7EB]/80 flex flex-col items-center justify-center p-1 overflow-hidden"
          style={{ backgroundColor: tile.paletteBg }}
        >
          {renderMotifIllustration(tile.motif, tile.paletteAccent)}
          <span
            className="mt-0.5 text-[9px] font-semibold tracking-tight truncate max-w-full px-0.5"
            style={{ color: tile.paletteAccent }}
          >
            {tile.label}
          </span>
        </div>
      ))}
    </div>
  );
};

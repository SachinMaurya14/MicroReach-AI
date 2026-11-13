import React from 'react';

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  align?: 'center' | 'left';
  tone?: 'dark' | 'light';
  className?: string;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  title,
  subtitle,
  align = 'center',
  tone = 'dark',
  className = '',
}) => {
  const alignClass = align === 'center' ? 'text-center mx-auto' : 'text-left';
  const titleColor = tone === 'light' ? 'text-white' : 'text-[#1F2937]';
  const subColor = tone === 'light' ? 'text-[#DDD6FE]' : 'text-[#4B5563]';

  return (
    <div className={`max-w-[740px] ${alignClass} ${className}`}>
      <h2
        className={`text-[28px] sm:text-[32px] md:text-[36px] font-bold tracking-[-0.02em] leading-[1.2] ${titleColor}`}
      >
        {title}
      </h2>
      {subtitle && (
        <p className={`mt-4 text-[15px] md:text-[17px] leading-[1.6] font-normal ${subColor}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
};

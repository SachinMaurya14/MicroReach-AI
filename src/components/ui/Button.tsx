import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'light';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  pill?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[#5B21B6] text-white hover:bg-[#7C3AED] shadow-sm focus-visible:ring-2 focus-visible:ring-[#5B21B6] focus-visible:ring-offset-2',
  secondary:
    'bg-white text-[#1F2937] border border-[#E5E7EB] hover:border-[#D1D5DB] hover:bg-[#F9FAFB] shadow-xs focus-visible:ring-2 focus-visible:ring-[#5B21B6] focus-visible:ring-offset-2',
  outline:
    'bg-transparent text-[#5B21B6] border border-[#5B21B6] hover:bg-[#F5F3FF] focus-visible:ring-2 focus-visible:ring-[#5B21B6] focus-visible:ring-offset-2',
  ghost:
    'bg-transparent text-[#4B5563] hover:text-[#1F2937] hover:bg-[#F3F4F6] focus-visible:ring-2 focus-visible:ring-[#5B21B6]',
  light:
    'bg-white text-[#1E0B36] hover:bg-[#F5F3FF] shadow-sm focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1E0B36]',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-2.5 text-sm md:text-[15px]',
  lg: 'px-7 py-3.5 text-[15px] md:text-base',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  pill = true,
  className = '',
  children,
  type = 'button',
  ...props
}) => {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
        pill ? 'rounded-full' : 'rounded-xl'
      } ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

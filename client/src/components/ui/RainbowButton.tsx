import React from 'react';
import { cn } from '@/lib/utils';

interface RainbowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  disabled?: boolean;
}

export const RainbowButton = React.forwardRef<HTMLButtonElement, RainbowButtonProps>(
  ({ className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "rainbow-border relative flex items-center justify-center gap-2.5 px-4 py-2 bg-black rounded-xl border-none text-white cursor-pointer font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
        {...props}
      >
        {children}

        <style jsx="true">{`
          .rainbow-border::before,
          .rainbow-border::after {
            content: '';
            position: absolute;
            left: -2px;
            top: -2px;
            border-radius: 12px;
            background: linear-gradient(45deg, #fb0094, #0000ff, #00ff00, #ffff00, #ff0000, #fb0094, #0000ff, #00ff00, #ffff00, #ff0000);
            background-size: 400%;
            width: calc(100% + 4px);
            height: calc(100% + 4px);
            z-index: -1;
            animation: rainbow 20s linear infinite;
          }
          .rainbow-border::after {
            filter: blur(50px);
          }
          .rainbow-border:disabled::before,
          .rainbow-border:disabled::after {
            opacity: 0.5;
          }
          @keyframes rainbow {
            0% { background-position: 0 0; }
            50% { background-position: 400% 0; }
            100% { background-position: 0 0; }
          }
        `}</style>
      </button>
    );
  }
);

RainbowButton.displayName = "RainbowButton";

import React, { ButtonHTMLAttributes, forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/cn";

// Define button variants with class-variance-authority
const buttonVariants = cva(
  // Base styles applied to all buttons
  "relative flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-br from-[#0D0C0C] to-[#252525] text-white hover:scale-105 active:scale-95 transform",
        secondary:
          "bg-gradient-to-br from-[#e2e2e2] to-[#d0d0d0] text-[#0c0c0c] hover:scale-105 active:scale-95 transform",
        accent:
          "bg-gradient-to-br from-[#FF5E00] to-[#FF8A3D] text-white hover:scale-105 active:scale-95 transform",
        outline:
          "border border-gray-200 dark:border-gray-700 bg-transparent dark:text-white text-[#0c0c0c] hover:bg-gray-100 dark:hover:bg-[#323232]",
        ghost:
          "bg-transparent dark:text-white text-[#0c0c0c] hover:bg-gray-100 dark:hover:bg-[#323232]",
        link: "bg-transparent underline-offset-4 hover:underline text-[#0c0c0c] dark:text-white p-0",
        icon: "p-2 bg-transparent dark:text-white text-[#0c0c0c] hover:bg-gray-100 dark:hover:bg-[#323232] rounded-full",
        action:
          "p-3 rounded-full hover:bg-[#323232] text-[#f7eee3] transition-colors duration-200",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-base",
        lg: "h-12 px-6 text-lg",
        icon: "h-10 w-10",
        auto: "h-auto px-4 py-2", // For flexible sizing
      },
      isRounded: {
        true: "rounded-full",
        false: "rounded-lg",
      },
      withInnerShadow: {
        true: "before:content-[''] before:absolute before:inset-[2px] before:rounded-[inherit] before:opacity-90 overflow-hidden",
        false: "",
      },
    },
    compoundVariants: [
      // Compound variants for inner shadow effects based on variant
      {
        variant: "primary",
        withInnerShadow: true,
        className:
          "before:bg-gradient-to-br before:from-[#252525] before:to-[#0D0C0C] shadow-[inset_0px_-4px_6px_rgba(0,0,0,0.3),0px_4px_15px_rgba(0,0,0,0.25)] hover:shadow-[0_0_15px_rgba(0,0,0,0.5)]",
      },
      {
        variant: "secondary",
        withInnerShadow: true,
        className:
          "before:bg-gradient-to-br before:from-[#d0d0d0] before:to-[#e2e2e2] shadow-[inset_0px_-4px_6px_rgba(0,0,0,0.1),0px_4px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_0_15px_rgba(0,0,0,0.2)]",
      },
      {
        variant: "accent",
        withInnerShadow: true,
        className:
          "before:bg-gradient-to-br before:from-[#FF8A3D] before:to-[#FF5E00] shadow-[inset_0px_-4px_6px_rgba(0,0,0,0.2),0px_4px_15px_rgba(0,0,0,0.15)] hover:shadow-[0_0_15px_rgba(255,94,0,0.5)]",
      },
    ],

    defaultVariants: {
      variant: "primary",
      size: "md",
      isRounded: false,
      withInnerShadow: true,
    },
  },
);

// Add inner shadow overlay and subtle glow effect for specific variants
const getInnerEffects = (variant: string | null | undefined) => {
  if (
    !variant ||
    variant === "outline" ||
    variant === "ghost" ||
    variant === "link"
  )
    return null;

  const glowColor = variant === "accent" ? "#FF5E00" : "#323232";

  return (
    <>
      {/* Inner shadow overlay */}
      <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/10 to-transparent opacity-80 pointer-events-none" />

      {/* Subtle glow effect on hover */}
      <div
        className="absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-30 blur-xl transition-opacity"
        style={{ backgroundColor: glowColor }}
      />
    </>
  );
};

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      isRounded,
      withInnerShadow,
      leftIcon,
      rightIcon,
      isLoading,
      children,
      ...props
    },
    ref,
  ) => {
    const buttonClasses = cn(
      buttonVariants({ variant, size, isRounded, withInnerShadow, className }),
      props.disabled ? "opacity-50 cursor-not-allowed" : "",
      isLoading
        ? "relative text-transparent hover:scale-100 active:scale-100"
        : "",
      "group", // Add group class for hover effects
    );

    return (
      <button className={buttonClasses} ref={ref} {...props}>
        {/* Inner shadow effects if supported by variant */}
        {withInnerShadow && getInnerEffects(variant)}

        {/* Loading spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
        )}

        {/* Button content with subtle motion */}
        <div className="relative flex items-center justify-center gap-2 transform transition-transform group-hover:scale-105 group-active:scale-95">
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </div>
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };

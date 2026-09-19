import React from "react";

interface NexoLogoProps {
  size?: number;
  className?: string;
  glow?: boolean;
}

export function NexoLogo({ size = 36, className = "", glow = true }: NexoLogoProps) {
  return (
    <div
      className={`nexo-brand-icon-wrap relative flex-shrink-0 inline-flex items-center justify-center rounded-[10px] overflow-hidden transition-transform duration-200 hover:scale-105 ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        boxShadow: glow ? "0 0 16px rgba(0, 240, 255, 0.35), 0 0 30px rgba(94, 23, 235, 0.25)" : undefined,
      }}
    >
      <img
        src="/nexo-logo.png"
        alt="Nexo"
        width={size}
        height={size}
        className="w-full h-full object-cover select-none"
      />
    </div>
  );
}

interface NexoWordmarkProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showDot?: boolean;
}

export function NexoWordmark({ className = "", size = "md", showDot = false }: NexoWordmarkProps) {
  const sizeClasses = {
    sm: "text-[18px] tracking-tight",
    md: "text-[24px] tracking-tight",
    lg: "text-[30px] tracking-tight",
    xl: "text-[38px] tracking-tight",
  };

  return (
    <span
      className={`nexo-wordmark inline-flex items-center font-black uppercase select-none ${sizeClasses[size]} ${className}`}
      style={{
        fontFamily: "'Outfit', 'Space Grotesk', -apple-system, sans-serif",
        color: "#00f0ff",
        textShadow: "0 0 18px rgba(0, 240, 255, 0.45)",
      }}
    >
      NEXO
      {showDot && <span className="text-[#00f0ff]/60 ml-0.5">•</span>}
    </span>
  );
}

import React from 'react';

interface VodafoneLogoProps {
  size?: number;
  variant?: 'full' | 'icon';
  className?: string;
}

// Vodafone speech-bubble icon + wordmark in brand red
export const VodafoneLogo: React.FC<VodafoneLogoProps> = ({
  size = 40,
  variant = 'full',
  className = '',
}) => {
  const Icon = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Vodafone"
    >
      {/* Red circle background */}
      <circle cx="50" cy="50" r="50" fill="#E60000" />
      {/* Vodafone speech-bubble quotation mark */}
      <path
        d="M38 30 C24 30 14 40 14 52 C14 60.5 19 67.8 26.5 71.5 L24 80 L34 73.5 C35.3 73.8 36.6 74 38 74 C52 74 62 64 62 52 C62 40 52 30 38 30 Z"
        fill="white"
      />
      <path
        d="M58 26 C44 26 34 36 34 48 C34 52 35.2 55.7 37.3 58.8 C39 55.4 42.4 52 47 50 C50.8 48.4 56.2 47.3 62 47.3 C68 47.3 73.3 48.8 77 51.4 C77 51 77 50.4 77 49.8 C76 37 68 26 58 26 Z"
        fill="white"
        opacity="0.85"
      />
    </svg>
  );

  if (variant === 'icon') {
    return <span className={className}>{Icon}</span>;
  }

  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      {Icon}
      <span
        style={{
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontWeight: 700,
          fontSize: size * 0.55,
          color: '#E60000',
          letterSpacing: '-0.02em',
        }}
      >
        Vodafone
      </span>
    </span>
  );
};

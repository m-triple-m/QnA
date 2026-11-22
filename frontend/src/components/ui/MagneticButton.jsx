import React, { useRef } from 'react';
import { useMagnetic } from '@/lib/gsapUtils';

export default function MagneticButton({
  children,
  onClick,
  className = '',
  strength = 0.22,
  maxOffset = 10,
  scale = 1.025,
  type = 'button',
  disabled = false,
  ...props
}) {
  const btnRef = useRef(null);
  useMagnetic(btnRef, { strength, maxOffset, scale });

  return (
    <button
      ref={btnRef}
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`relative inline-flex items-center justify-center transition-shadow select-none will-change-transform ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

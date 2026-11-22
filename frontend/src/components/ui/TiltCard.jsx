import React, { useRef } from 'react';
import { useCardTilt } from '@/lib/gsapUtils';

export default function TiltCard({
  children,
  className = '',
  maxTilt = 5,
  scale = 1.015,
  perspective = 1000,
  onClick,
  ...props
}) {
  const cardRef = useRef(null);
  useCardTilt(cardRef, { maxTilt, scale, perspective });

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      className={`relative will-change-transform ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

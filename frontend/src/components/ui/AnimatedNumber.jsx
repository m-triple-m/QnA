import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function AnimatedNumber({
  value,
  duration = 0.7,
  prefix = '',
  suffix = '',
  className = '',
  round = true,
}) {
  const spanRef = useRef(null);
  const prevValueRef = useRef(0);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;

    const target = Number(value) || 0;
    const fromVal = prevValueRef.current;
    prevValueRef.current = target;

    const tweenObj = { val: fromVal };

    const tween = gsap.to(tweenObj, {
      val: target,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        if (!el) return;
        const currentVal = round ? Math.round(tweenObj.val) : tweenObj.val.toFixed(1);
        el.textContent = `${prefix}${currentVal}${suffix}`;
      },
    });

    return () => {
      tween.kill();
    };
  }, [value, duration, prefix, suffix, round]);

  return (
    <span ref={spanRef} className={className}>
      {prefix}
      {value ?? 0}
      {suffix}
    </span>
  );
}

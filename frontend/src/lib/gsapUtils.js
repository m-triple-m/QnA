import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export { gsap };

/**
 * React hook that gives an element an interactive magnetic pull effect towards the cursor.
 * When the user moves the cursor over the element, the element smoothly gravitates towards it.
 * On mouse leave, it springs back into place with elastic physics.
 */
export function useMagnetic(ref, { strength = 0.25, maxOffset = 12, scale = 1.03 } = {}) {
  useEffect(() => {
    const el = ref?.current;
    if (!el || typeof window === 'undefined') return;

    // Check prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      const handleMouseMove = (e) => {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const deltaX = Math.max(-maxOffset, Math.min(maxOffset, (e.clientX - centerX) * strength));
        const deltaY = Math.max(-maxOffset, Math.min(maxOffset, (e.clientY - centerY) * strength));

        gsap.to(el, {
          x: deltaX,
          y: deltaY,
          scale,
          duration: 0.3,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      };

      const handleMouseLeave = () => {
        gsap.to(el, {
          x: 0,
          y: 0,
          scale: 1,
          duration: 0.65,
          ease: 'elastic.out(1.1, 0.4)',
          overwrite: 'auto',
        });
      };

      const handleMouseDown = () => {
        gsap.to(el, {
          scale: 0.96,
          duration: 0.15,
          ease: 'power1.out',
          overwrite: 'auto',
        });
      };

      const handleMouseUp = () => {
        gsap.to(el, {
          scale,
          duration: 0.35,
          ease: 'back.out(2)',
          overwrite: 'auto',
        });
      };

      el.addEventListener('mousemove', handleMouseMove);
      el.addEventListener('mouseleave', handleMouseLeave);
      el.addEventListener('mousedown', handleMouseDown);
      el.addEventListener('mouseup', handleMouseUp);
    }, el);

    return () => ctx.revert();
  }, [ref, strength, maxOffset, scale]);
}

/**
 * React hook that applies a subtle 3D perspective tilt to a card element on hover.
 */
export function useCardTilt(ref, { maxTilt = 6, perspective = 1000, scale = 1.015 } = {}) {
  useEffect(() => {
    const el = ref?.current;
    if (!el || typeof window === 'undefined') return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      gsap.set(el, { transformPerspective: perspective, transformStyle: 'preserve-3d' });

      const handleMouseMove = (e) => {
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        const rotateX = (0.5 - y) * (maxTilt * 2);
        const rotateY = (x - 0.5) * (maxTilt * 2);

        gsap.to(el, {
          rotateX,
          rotateY,
          scale,
          duration: 0.35,
          ease: 'power1.out',
          overwrite: 'auto',
        });
      };

      const handleMouseLeave = () => {
        gsap.to(el, {
          rotateX: 0,
          rotateY: 0,
          scale: 1,
          duration: 0.6,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      };

      el.addEventListener('mousemove', handleMouseMove);
      el.addEventListener('mouseleave', handleMouseLeave);
    }, el);

    return () => ctx.revert();
  }, [ref, maxTilt, perspective, scale]);
}

/**
 * Smoothly animates a numerical counter on an HTML element.
 */
export function animateCounter(element, targetValue, { duration = 0.8, prefix = '', suffix = '', round = true } = {}) {
  if (!element) return;
  const target = Number(targetValue) || 0;
  const startObj = { val: parseFloat(element.dataset.currentValue) || 0 };

  element.dataset.currentValue = String(target);

  return gsap.to(startObj, {
    val: target,
    duration,
    ease: 'power2.out',
    onUpdate: () => {
      const formatted = round ? Math.round(startObj.val) : startObj.val.toFixed(1);
      element.textContent = `${prefix}${formatted}${suffix}`;
    },
  });
}

/**
 * Stagger entrance animation for elements matching a selector inside a container or an array of elements.
 */
export function staggerFadeUp(elementsOrContainer, selectorOrOptions, maybeOptions) {
  if (typeof window === 'undefined') return;

  let elements = elementsOrContainer;
  let options = maybeOptions || {};

  if (typeof selectorOrOptions === 'string') {
    if (elementsOrContainer?.querySelectorAll) {
      elements = elementsOrContainer.querySelectorAll(selectorOrOptions);
    }
  } else if (typeof selectorOrOptions === 'object') {
    options = selectorOrOptions;
  }

  if (!elements || elements.length === 0) return;

  const {
    duration = 0.55,
    stagger = 0.07,
    y = 20,
    delay = 0,
    ease = 'power3.out',
  } = options;

  return gsap.fromTo(
    elements,
    { opacity: 0, y, scale: 0.98 },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration,
      stagger,
      delay,
      ease,
      overwrite: 'auto',
    }
  );
}

/**
 * Subtle attention pulse/bounce for an element (e.g. when score increases or new participant joins).
 */
export function pulseElement(element, { scale = 1.15, duration = 0.45 } = {}) {
  if (!element) return;
  return gsap.fromTo(
    element,
    { scale: 1 },
    {
      scale,
      duration: duration * 0.4,
      ease: 'power2.out',
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        gsap.set(element, { scale: 1 });
      },
    }
  );
}

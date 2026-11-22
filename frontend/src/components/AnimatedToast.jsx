import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { toast as rhtToast, resolveValue } from 'react-hot-toast';

// ── Animated Icons ─────────────────────────────────────────────────────────────

export function AnimatedSuccessIcon() {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -30 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className="relative flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-500 flex-shrink-0"
    >
      {/* Subtle pulsing halo */}
      <motion.span
        initial={{ scale: 0.8, opacity: 0.6 }}
        animate={{ scale: 1.35, opacity: 0 }}
        transition={{ duration: 1, repeat: 0, ease: 'easeOut' }}
        className="absolute inset-0 rounded-full bg-emerald-400"
      />
      <svg
        className="w-4 h-4 stroke-emerald-600 dark:stroke-emerald-400 fill-none"
        viewBox="0 0 24 24"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <motion.path
          d="M20 6L9 17l-5-5"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut', delay: 0.1 }}
        />
      </svg>
    </motion.div>
  );
}

export function AnimatedErrorIcon() {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{
        scale: 1,
        x: [0, -3, 3, -2, 2, 0],
      }}
      transition={{
        scale: { type: 'spring', stiffness: 450, damping: 22 },
        x: { duration: 0.4, delay: 0.15 },
      }}
      className="relative flex items-center justify-center w-7 h-7 rounded-full bg-rose-500/15 text-rose-500 flex-shrink-0"
    >
      <motion.span
        initial={{ scale: 0.8, opacity: 0.6 }}
        animate={{ scale: 1.35, opacity: 0 }}
        transition={{ duration: 0.8, repeat: 0, ease: 'easeOut' }}
        className="absolute inset-0 rounded-full bg-rose-400"
      />
      <svg
        className="w-4 h-4 stroke-rose-600 dark:stroke-rose-400 fill-none"
        viewBox="0 0 24 24"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <motion.path
          d="M18 6L6 18"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.25, ease: 'easeOut', delay: 0.08 }}
        />
        <motion.path
          d="M6 6l12 12"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.25, ease: 'easeOut', delay: 0.18 }}
        />
      </svg>
    </motion.div>
  );
}

export function AnimatedLoadingIcon() {
  return (
    <div className="relative flex items-center justify-center w-7 h-7 flex-shrink-0">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        className="w-5 h-5 rounded-full border-2 border-indigo-500/30 border-t-indigo-600 dark:border-indigo-400/30 dark:border-t-indigo-400"
      />
    </div>
  );
}

export function AnimatedInfoIcon() {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: [0, 1.15, 1] }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className="relative flex items-center justify-center w-7 h-7 rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex-shrink-0"
    >
      <svg
        className="w-4 h-4 stroke-current fill-none"
        viewBox="0 0 24 24"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    </motion.div>
  );
}

export function AnimatedCustomIcon({ icon }) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -15 }}
      animate={{ scale: [0, 1.25, 1], rotate: 0 }}
      transition={{ type: 'spring', stiffness: 450, damping: 20 }}
      className="flex items-center justify-center text-lg flex-shrink-0 min-w-6"
    >
      {icon}
    </motion.div>
  );
}

// ── Toast Item Component ───────────────────────────────────────────────────────

export function AnimatedToastItem({ toast }) {
  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';
  const isLoading = toast.type === 'loading';
  const isCustomIcon = Boolean(toast.icon);

  // Border & Glow Accents
  let borderColor = 'border-slate-200 dark:border-slate-700/60';
  let accentBar = 'bg-slate-400';

  if (isSuccess) {
    borderColor = 'border-emerald-500/30 dark:border-emerald-500/30 shadow-emerald-500/5';
    accentBar = 'bg-emerald-500';
  } else if (isError) {
    borderColor = 'border-rose-500/30 dark:border-rose-500/30 shadow-rose-500/5';
    accentBar = 'bg-rose-500';
  } else if (isLoading) {
    borderColor = 'border-indigo-500/30 dark:border-indigo-500/30 shadow-indigo-500/5';
    accentBar = 'bg-indigo-500';
  } else {
    borderColor = 'border-cyan-500/30 dark:border-cyan-500/30 shadow-cyan-500/5';
    accentBar = 'bg-cyan-500';
  }

  // Render appropriate icon
  const renderIcon = () => {
    if (isCustomIcon) {
      return <AnimatedCustomIcon icon={toast.icon} />;
    }
    if (isSuccess) return <AnimatedSuccessIcon />;
    if (isError) return <AnimatedErrorIcon />;
    if (isLoading) return <AnimatedLoadingIcon />;
    return <AnimatedInfoIcon />;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.95 }}
      animate={{
        opacity: toast.visible ? 1 : 0,
        y: toast.visible ? 0 : -10,
        scale: toast.visible ? 1 : 0.95,
      }}
      exit={{ opacity: 0, scale: 0.9, y: -12 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className={`relative group flex items-center gap-3 px-4 py-3 min-w-[280px] max-w-md rounded-2xl border bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl text-slate-800 dark:text-slate-100 transition-all ${borderColor}`}
      style={{
        pointerEvents: 'auto',
        ...toast.style,
      }}
    >
      {/* Colored Left Accent Strip */}
      <span
        className={`absolute left-1.5 top-3 bottom-3 w-1 rounded-full opacity-80 ${accentBar}`}
      />

      {/* Animated Icon */}
      <div className="pl-1.5">{renderIcon()}</div>

      {/* Message Content */}
      <div className="flex-1 text-sm font-medium leading-snug break-words">
        {resolveValue(toast.message, toast)}
      </div>

      {/* Dismiss Button */}
      {toast.type !== 'loading' && (
        <button
          type="button"
          onClick={() => rhtToast.dismiss(toast.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0"
          title="Dismiss notification"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}

export default AnimatedToastItem;

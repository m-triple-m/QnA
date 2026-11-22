import toast, { useToasterStore } from 'react-hot-toast';

// ── Configuration ─────────────────────────────────────────────────────────────
const DEDUPE_WINDOW_MS = 1000; // Ignore identical toast triggers within 1 second
const MAX_VISIBLE_TOASTS = 3;   // Maximum active toasts on screen at one time

// Cache of recently fired toasts: key -> timestamp
const recentTriggers = new Map();

// Generate a deterministic string key from a message
function getMessageKey(message, type = 'blank') {
  if (typeof message === 'string' || typeof message === 'number') {
    return `${type}:${String(message).trim().toLowerCase()}`;
  }
  if (typeof message === 'function') {
    return `${type}:fn_${message.name || 'custom'}`;
  }
  return `${type}:custom_${Date.now()}`;
}

// Enforce max active toasts to prevent stacking up notifications
function enforceMaxToasts() {
  try {
    const state = useToasterStore();
    if (state && Array.isArray(state.toasts)) {
      const visible = state.toasts.filter((t) => t.visible);
      if (visible.length >= MAX_VISIBLE_TOASTS) {
        // Dismiss the oldest visible toast(s)
        visible
          .slice(0, visible.length - MAX_VISIBLE_TOASTS + 1)
          .forEach((t) => toast.dismiss(t.id));
      }
    }
  } catch {
    // Graceful fallback if toaster store is not yet mounted
  }
}

// Core wrapper that applies deduplication, ID stabilization, and queue capping
function createDeduplicatedCaller(originalFn, defaultType = 'blank') {
  return function (message, opts = {}) {
    const key = getMessageKey(message, defaultType);
    const now = Date.now();
    const lastTrigger = recentTriggers.get(key);

    // If the identical message fired within the dedupe window, suppress duplicate
    if (lastTrigger && now - lastTrigger < DEDUPE_WINDOW_MS) {
      return opts.id || key;
    }

    recentTriggers.set(key, now);

    // Clean up stale triggers periodically
    if (recentTriggers.size > 50) {
      for (const [k, time] of recentTriggers.entries()) {
        if (now - time > 10_000) recentTriggers.delete(k);
      }
    }

    // Auto-assign stable ID if none provided to prevent duplicate toast bubbles
    const safeOpts = {
      id: opts.id || key,
      ...opts,
    };

    enforceMaxToasts();
    return originalFn(message, safeOpts);
  };
}

// Apply patching once to the react-hot-toast singleton instance
if (!toast.__isDeduplicated) {
  const origToast = toast;
  const origSuccess = toast.success;
  const origError = toast.error;
  const origLoading = toast.loading;
  const origCustom = toast.custom;

  // Wrapped methods
  toast.success = createDeduplicatedCaller(origSuccess.bind(origToast), 'success');
  toast.error = createDeduplicatedCaller(origError.bind(origToast), 'error');
  toast.loading = createDeduplicatedCaller(origLoading.bind(origToast), 'loading');
  if (origCustom) {
    toast.custom = createDeduplicatedCaller(origCustom.bind(origToast), 'custom');
  }

  // Mark as patched
  toast.__isDeduplicated = true;
}

export default toast;
export { toast, useToasterStore };

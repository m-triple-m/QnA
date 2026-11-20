import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Resolve media URL (handles absolute URLs, data/blob URLs, and backend relative uploads)
 * @param {string} path - URL or path like '/uploads/123.jpg'
 * @returns {string} - Full accessible URL
 */
export function getMediaUrl(path) {
  if (!path) return '';
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('data:') ||
    path.startsWith('blob:')
  ) {
    return path;
  }

  const apiUrl = import.meta.env.VITE_API_URL || '';
  // Strip trailing /api and trailing slash
  const cleanBase = apiUrl.replace(/\/api\/?$/i, '').replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return cleanBase ? `${cleanBase}${cleanPath}` : cleanPath;
}

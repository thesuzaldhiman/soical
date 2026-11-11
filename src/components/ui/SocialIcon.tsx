'use client';

import React from 'react';
import { Platform } from '@/types';

interface SocialIconProps {
  platform: Platform | string;
  className?: string;
  size?: number;
}

export function SocialIcon({ platform, className = 'w-5 h-5', size }: SocialIconProps) {
  const norm = (platform || '').toLowerCase();
  const dimensionProps = size ? { width: size, height: size } : {};

  // Facebook Official Logo
  if (norm.includes('facebook') || norm === 'fb') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
        {...dimensionProps}
      >
        <circle cx="12" cy="12" r="12" fill="#1877F2" />
        <path
          d="M15.117 12.016l.487-3.175H12.56V6.776c0-.872.428-1.72 1.796-1.72h1.389V2.355S14.485 2.14 13.265 2.14c-2.548 0-4.214 1.545-4.214 4.342v2.36H6.26v3.174h2.791V19.78c.56.088 1.133.134 1.718.134.585 0 1.158-.046 1.718-.134v-7.764h2.63z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // Instagram Official Gradient Logo
  if (norm.includes('instagram') || norm === 'ig') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
        {...dimensionProps}
      >
        <defs>
          <linearGradient id="igGradUniversal" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop stopColor="#833AB4" offset="0%" />
            <stop stopColor="#FD1D1D" offset="50%" />
            <stop stopColor="#FCB045" offset="100%" />
          </linearGradient>
        </defs>
        <rect width="24" height="24" rx="6" fill="url(#igGradUniversal)" />
        <path
          d="M12 7.15c-2.674 0-4.85 2.176-4.85 4.85 0 2.674 2.176 4.85 4.85 4.85 2.674 0 4.85-2.176 4.85-4.85 0-2.674-2.176-4.85-4.85-4.85zm0 8.01c-1.745 0-3.16-1.415-3.16-3.16 0-1.745 1.415-3.16 3.16-3.16 1.745 0 3.16 1.415 3.16 3.16 0 1.745-1.415 3.16-3.16 3.16zm5.04-8.337a1.135 1.135 0 100 2.27 1.135 1.135 0 000-2.27zm2.46 1.18c-.092-1.93-.532-3.636-1.95-5.054C16.132 1.531 14.426 1.09 12.496 1H11.5c-1.93.09-3.636.531-5.054 1.949C5.028 4.367 4.587 6.073 4.496 8.003V16c.091 1.93.532 3.636 1.95 5.054 1.418 1.418 3.124 1.859 5.054 1.95h.992c1.93-.091 3.636-.532 5.054-1.95 1.418-1.418 1.858-3.124 1.95-5.054V8.003zm-1.896 9.687c-.367.925-1.077 1.635-2.002 2.002-1.433.568-4.836.437-6.102.437-1.266 0-4.669.131-6.102-.437-.925-.367-1.635-1.077-2.002-2.002-.568-1.433-.437-4.836-.437-6.102 0-1.266-.131-4.669.437-6.102.367-.925 1.077-1.635 2.002-2.002 1.433-.568 4.836-.437 6.102-.437 1.266 0 4.669-.131 6.102.437.925.367 1.635 1.077 2.002 2.002.568 1.433.437 4.836.437 6.102 0 1.266.131 4.669-.437 6.102z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // YouTube Official Logo
  if (norm.includes('youtube') || norm === 'yt') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
        {...dimensionProps}
      >
        <rect width="24" height="24" rx="5" fill="#FF0000" />
        <path d="M9.8 7.5v9l6.4-4.5-6.4-4.5z" fill="#FFFFFF" />
      </svg>
    );
  }

  // Threads Official Logo
  if (norm.includes('threads')) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
        {...dimensionProps}
      >
        <rect width="24" height="24" rx="5.5" fill="#0A0A0A" />
        <path
          d="M14.545 11.238c-.085-.353-.245-.968-.69-1.393-.446-.425-1.03-.645-1.785-.645-.945 0-1.745.368-2.31 1.066-.566.697-.872 1.698-.872 2.898 0 1.2.306 2.201.872 2.898.565.698 1.365 1.066 2.31 1.066.865 0 1.545-.308 2.022-.916.32-.407.495-.898.535-1.488h1.56c-.05 1.03-.39 1.93-.99 2.65-.845 1.01-1.995 1.52-3.127 1.52-1.42 0-2.616-.54-3.46-1.57-.845-1.02-1.295-2.45-1.295-4.16 0-1.71.45-3.14 1.295-4.16.844-1.03 2.04-1.57 3.46-1.57 1.32 0 2.35.43 3.09 1.23.74.8 1.11 1.92 1.12 3.32v4.86c0 .4.24.62.62.62.38 0 .62-.22.62-.62V12.1c0-1.77-.52-3.23-1.55-4.32C14.77 6.69 13.43 6.13 11.83 6.13c-1.8 0-3.32.65-4.4 1.91C6.35 9.3 5.8 10.97 5.8 12.98c0 2.01.55 3.68 1.63 4.94 1.08 1.26 2.6 1.91 4.4 1.91 1.35 0 2.53-.42 3.45-1.23l.97 1.23c-1.18 1.05-2.71 1.6-4.42 1.6-2.26 0-4.14-.8-5.46-2.34C4.66 17.55 4 15.48 4 12.98s.66-4.57 1.97-6.11c1.32-1.54 3.2-2.34 5.46-2.34 2.03 0 3.73.71 4.94 2.07 1.2 1.36 1.83 3.19 1.83 5.5v4.76c0 1.22-.9 2.14-2.12 2.14-1.16 0-2.04-.84-2.12-1.98-.6.76-1.45 1.18-2.49 1.18z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // Telegram Official Sky Blue Plane Logo
  if (norm.includes('telegram') || norm === 'tg') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
        {...dimensionProps}
      >
        <circle cx="12" cy="12" r="12" fill="#229ED9" />
        <path
          d="M5.4 11.8l11.4-4.7c.5-.2 1 .1.8.7l-1.9 9.1c-.1.7-.5.8-1 .5l-2.9-2.1-1.4 1.3c-.2.2-.3.3-.6.3l.2-2.9 5.3-4.8c.2-.2 0-.3-.3-.1L8.3 13.3l-2.8-.9c-.6-.2-.6-.6-.1-.6z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // Twitter / X Official Logo
  if (norm.includes('twitter') || norm === 'x') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
        {...dimensionProps}
      >
        <rect width="24" height="24" rx="5" fill="#000000" />
        <path
          d="M17.18 5.5h2.24l-4.9 5.6 5.76 7.6h-4.51l-3.53-4.62-4.04 4.62H5.96l5.24-5.99L5.65 5.5h4.63l3.19 4.22 3.71-4.22zm-.79 11.86h1.24L8.71 6.77H7.38l9.01 10.59z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // LinkedIn Official Logo
  if (norm.includes('linkedin')) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
        {...dimensionProps}
      >
        <rect width="24" height="24" rx="4.5" fill="#0A66C2" />
        <path
          d="M7.65 9.42H5.2V17.5h2.45V9.42zM6.42 5.92a1.42 1.42 0 100 2.84 1.42 1.42 0 000-2.84zM18.8 12.87c0-2.73-1.46-4.01-3.41-4.01-1.57 0-2.28.87-2.67 1.48V9.42h-2.45c.03.68 0 8.08 0 8.08h2.45v-4.51c0-.24.02-.48.09-.66.19-.49.63-1 1.38-1 1 0 1.4.76 1.4 1.88v4.29h2.45v-4.63z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // Pinterest Official Logo
  if (norm.includes('pinterest')) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
        {...dimensionProps}
      >
        <circle cx="12" cy="12" r="12" fill="#E60023" />
        <path
          d="M12 4.5c-4.14 0-7.5 3.36-7.5 7.5 0 3.18 1.98 5.9 4.8 6.99-.07-.59-.13-1.49.03-2.13.14-.59.93-3.95.93-3.95s-.24-.48-.24-1.18c0-1.11.64-1.94 1.44-1.94.68 0 1.01.51 1.01 1.12 0 .68-.43 1.71-.66 2.65-.19.79.4 1.44 1.18 1.44 1.42 0 2.51-1.5 2.51-3.66 0-1.91-1.37-3.25-3.34-3.25-2.45 0-3.89 1.84-3.89 3.73 0 .74.28 1.53.64 1.96.07.09.08.16.06.25-.07.28-.22.88-.25.99-.04.16-.13.2-.3.12-1.11-.52-1.81-2.14-1.81-3.45 0-2.81 2.04-5.39 5.89-5.39 3.09 0 5.49 2.2 5.49 5.15 0 3.07-1.94 5.54-4.63 5.54-.9 0-1.76-.47-2.05-1.02l-.56 2.13c-.2 1.05-.75 2.37-1.12 3.19.86.26 1.77.41 2.71.41 4.14 0 7.5-3.36 7.5-7.5 0-4.14-3.36-7.5-7.5-7.5z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // Blogger Official Logo
  if (norm.includes('blogger')) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
        {...dimensionProps}
      >
        <rect width="24" height="24" rx="5.5" fill="#FF5722" />
        <path
          d="M16.5 8.5h-9c-.83 0-1.5.67-1.5 1.5v6c0 .83.67 1.5 1.5 1.5h9c.83 0 1.5-.67 1.5-1.5v-6c0-.83-.67-1.5-1.5-1.5zm-5 6.5H9v-2h2.5c.55 0 1 .45 1 1s-.45 1-1 1zm2.5-3.5H9V9.5h5c.55 0 1 .45 1 1s-.45 1-1 1z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // Fallback broadcast icon
  return (
    <div
      className={`rounded-md bg-slate-800 text-white flex items-center justify-center font-bold text-[10px] ${className}`}
      {...dimensionProps}
    >
      📢
    </div>
  );
}

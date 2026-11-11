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

  // 1. Exact authentic monochrome studio badges from user uploads
  const imageMap: Record<string, string> = {
    facebook: '/icons/social/facebook.png',
    fb: '/icons/social/facebook.png',
    instagram: '/icons/social/instagram.png',
    ig: '/icons/social/instagram.png',
    youtube: '/icons/social/youtube.png',
    yt: '/icons/social/youtube.png',
    threads: '/icons/social/threads.png',
    telegram: '/icons/social/telegram.png',
    tg: '/icons/social/telegram.png',
  };

  const matchedKey = Object.keys(imageMap).find((k) => norm.includes(k));
  if (matchedKey) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageMap[matchedKey]}
        alt={platform}
        className={`object-contain shrink-0 select-none ${className}`}
        {...dimensionProps}
      />
    );
  }

  // 2. Twitter / X Official Studio Monochrome Badge
  if (norm.includes('twitter') || norm === 'x') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
        {...dimensionProps}
      >
        <circle cx="12" cy="12" r="12" fill="#000000" />
        <path
          d="M16.5 6.5h2l-4.4 5 5.2 6.8h-4.1l-3.2-4.2-3.7 4.2h-2l4.7-5.4L6 6.5h4.2l2.9 3.8 3.4-3.8zm-.7 10.6h1.1L9 7.6H7.8l8 9.5z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // 3. LinkedIn Official Studio Monochrome Badge
  if (norm.includes('linkedin')) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
        {...dimensionProps}
      >
        <circle cx="12" cy="12" r="12" fill="#000000" />
        <path
          d="M8.5 10H6.5v7h2V10zm-1-3a1.15 1.15 0 100 2.3 1.15 1.15 0 000-2.3zm10 5.8c0-2.2-1.2-3.3-2.8-3.3-1.3 0-1.8.7-2.1 1.2V10h-2c.03.6 0 7 0 7h2v-3.9c0-.2 0-.4.1-.6.2-.4.5-.8 1.1-.8.8 0 1.1.6 1.1 1.5V17h2v-4.2z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // 4. Pinterest Official Studio Monochrome Badge
  if (norm.includes('pinterest')) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
        {...dimensionProps}
      >
        <circle cx="12" cy="12" r="12" fill="#000000" />
        <path
          d="M12 5.5c-3.6 0-6.5 2.9-6.5 6.5 0 2.8 1.7 5.1 4.2 6.1-.06-.5-.1-1.3.03-1.9.12-.5.8-3.4.8-3.4s-.2-.4-.2-1c0-1 .6-1.7 1.3-1.7.6 0 .9.4.9 1 0 .6-.4 1.5-.6 2.3-.2.7.3 1.3 1 1.3 1.2 0 2.2-1.3 2.2-3.2 0-1.7-1.2-2.8-2.9-2.8-2.1 0-3.4 1.6-3.4 3.2 0 .6.2 1.3.6 1.7.06.08.07.14.05.22-.06.24-.2.8-.22.9-.03.14-.11.17-.26.1-1-.4-1.6-1.9-1.6-3 0-2.4 1.8-4.7 5.1-4.7 2.7 0 4.8 1.9 4.8 4.5 0 2.7-1.7 4.8-4 4.8-.8 0-1.5-.4-1.8-.9l-.5 1.9c-.2.9-.6 2-1 2.8.7.2 1.5.3 2.3.3 3.6 0 6.5-2.9 6.5-6.5S15.6 5.5 12 5.5z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // 5. Blogger Official Studio Monochrome Badge
  if (norm.includes('blogger')) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
        {...dimensionProps}
      >
        <circle cx="12" cy="12" r="12" fill="#000000" />
        <path
          d="M15.5 9h-7c-.6 0-1 .4-1 1v5c0 .6.4 1 1 1h7c.6 0 1-.4 1-1v-5c0-.6-.4-1-1-1zm-4 4.5h-2v-1.5h2c.4 0 .8.3.8.75s-.4.75-.8.75zm1.5-2.5h-3.5V9.5H13c.4 0 .8.3.8.75s-.4.75-.8.75z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // Fallback broadcast icon
  return (
    <div
      className={`rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] ${className}`}
      {...dimensionProps}
    >
      📢
    </div>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/home', icon: '㗊', label: 'Home' },
    { href: '/groups', icon: '👥', label: 'My Groups' },
    { href: '/library', icon: '⏱️', label: 'Library' },
    { href: '/toolkit', icon: '🤖', label: 'Toolkit' },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`bottom-nav-item ${
            pathname === item.href || pathname.includes(item.href.split('/')[1]) ? 'active' : ''
          }`}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

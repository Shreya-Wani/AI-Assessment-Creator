'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';

export default function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isOpen = useUIStore((s) => s.mobileSidebarOpen);
  const close = useUIStore((s) => s.close);

  return (
    <>
      {isOpen && <div className="mobile-sidebar-overlay" onClick={close} />}
      <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
      <Link href="/" className="sidebar-logo">
        <div className="logo-icon">V</div>
        <div className="logo-text">VedaAI</div>
      </Link>

      <Link href="/" className="btn-create-assignment">
        <span style={{ fontSize: 16, marginTop: -2 }}>+</span> Create Assignment
      </Link>

      <nav className="sidebar-nav">
        <Link href="/home" className={`nav-item ${pathname === '/home' ? 'active' : ''}`}>
          <span style={{ opacity: pathname === '/home' ? 1 : 0.6 }}>㗊</span> Home
        </Link>
        <Link href="/groups" className={`nav-item ${pathname === '/groups' ? 'active' : ''}`}>
          <span style={{ opacity: pathname === '/groups' ? 1 : 0.6 }}>👥</span> My Groups
        </Link>
        <Link href="/assignments" className={`nav-item ${pathname.includes('/assignment') ? 'active' : ''}`}>
          <span style={{ opacity: pathname.includes('/assignment') ? 1 : 0.6 }}>📄</span> Assignments
        </Link>
        <Link href="/toolkit" className={`nav-item ${pathname === '/toolkit' ? 'active' : ''}`}>
          <span style={{ opacity: pathname === '/toolkit' ? 1 : 0.6 }}>🤖</span> AI Teacher's Toolkit
        </Link>
        <Link href="/library" className={`nav-item ${pathname === '/library' ? 'active' : ''}`}>
          <span style={{ opacity: pathname === '/library' ? 1 : 0.6 }}>⏱️</span> My Library
        </Link>
      </nav>

      <div className="sidebar-footer">
        <Link href="/settings" className={`nav-item ${pathname === '/settings' ? 'active' : ''}`}>
          <span style={{ opacity: pathname === '/settings' ? 1 : 0.6 }}>⚙️</span> Settings
        </Link>
        <Link href="/profile" className={`sidebar-user ${pathname === '/profile' ? 'active' : ''}`} style={{ textDecoration: 'none' }} onClick={close}>
          <div className="user-avatar">
            <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Teacher" alt="Avatar" width="100%" height="100%" />
          </div>
          <div className="user-info">
            <div className="user-name">{user?.schoolName ?? 'Your School'}</div>
            <div className="user-role">{user?.location ?? ''}</div>
          </div>
        </Link>
      </div>
    </aside>
    </>
  );
}

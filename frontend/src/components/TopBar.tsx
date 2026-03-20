'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';

export default function TopBar({ title }: { title: string }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const toggleMobile = useUIStore((s) => s.toggle);

  return (
    <div className="top-bar">
      <div className="top-bar-left">
        <button className="back-btn" onClick={() => router.back()}>←</button>
        <span style={{ opacity: 0.5 }}>㗊</span> <span>{title}</span>
      </div>
      
      {/* VedaAI Logo - Mobile */}
      <Link href="/" className="top-bar-logo-mobile">
        <div className="logo-icon-mobile">V</div>
        <div className="logo-text-mobile">VedaAI</div>
      </Link>
      
      <div className="top-bar-right">
        <button style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', position: 'relative' }}>
          🔔
          <span style={{ position: 'absolute', top: 0, right: 0, width: 6, height: 6, background: 'var(--text-secondary)', borderRadius: '50%' }}></span>
        </button>
        <Link href="/profile" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="user-dropdown">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?._id ?? 'user'}`} alt="User" style={{ width: 28, height: 28, borderRadius: 14, background: '#f3f4f6' }} />
            <span className="user-name-desktop">{user?.email ? user.email.split('@')[0] : 'User'}</span> <span style={{ opacity: 0.5 }}>⌄</span>
          </div>
        </Link>
        <button className="menu-btn" onClick={() => toggleMobile()} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-primary)' }}>☰</button>
      </div>
    </div>
  );
}

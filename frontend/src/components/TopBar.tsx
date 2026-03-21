'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import BrandLogo from './BrandLogo';
import { joinJob, leaveJob, onCompleted, onError, onProgress } from '@/lib/socket';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useAssignmentStore } from '@/store/useAssignmentStore';
import { getUserAvatar } from '@/lib/avatar';

export default function TopBar({ title }: { title: string }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const toggleMobile = useUIStore((s) => s.toggle);
  const currentAssignment = useAssignmentStore((s) => s.currentAssignment);
  const notificationItems = useNotificationStore((s) => s.items);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const progressMilestoneRef = useRef<Record<string, number>>({});

  const unreadCount = useMemo(() => notificationItems.filter((item) => !item.read).length, [notificationItems]);
  const avatarSrc = getUserAvatar(user);

  useEffect(() => {
    const activeJobId = currentAssignment?.jobId;
    if (!activeJobId) return;

    joinJob(activeJobId);
    return () => leaveJob(activeJobId);
  }, [currentAssignment?.jobId]);

  useEffect(() => {
    const unsubProgress = onProgress((data) => {
      const milestone = Math.floor(data.progress / 25) * 25;
      if (milestone < 25 || progressMilestoneRef.current[data.jobId] === milestone) return;

      progressMilestoneRef.current[data.jobId] = milestone;
      addNotification({
        type: 'progress',
        message: `Generation progress: ${milestone}% (${data.status || 'processing'})`,
      });
    });

    const unsubCompleted = onCompleted((data) => {
      addNotification({
        type: 'success',
        message: `Assessment ready. Assignment ID: ${data.assignmentId}`,
      });
    });

    const unsubError = onError((data) => {
      addNotification({
        type: 'error',
        message: data.error || `Generation failed for job ${data.jobId}`,
      });
    });

    return () => {
      unsubProgress();
      unsubCompleted();
      unsubError();
    };
  }, [addNotification]);

  useEffect(() => {
    if (!isNotificationOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNotificationOpen]);

  const toggleNotificationMenu = () => {
    const next = !isNotificationOpen;
    setIsNotificationOpen(next);
    if (next) {
      markAllRead();
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const diffMs = Date.now() - timestamp;
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="top-bar">
      <div className="top-bar-left">
        <button className="back-btn" onClick={() => router.back()}>←</button>
        <span style={{ opacity: 0.5 }}>㗊</span> <span>{title}</span>
      </div>
      
      {/* VedaAI Logo - Mobile */}
      <Link href="/" className="top-bar-logo-mobile">
        <BrandLogo compact />
      </Link>
      
      <div className="top-bar-right">
        <div className="notification-wrap" ref={menuRef}>
          <button className="notification-btn" onClick={toggleNotificationMenu}>
            🔔
            {unreadCount > 0 ? <span className="notification-dot" /> : null}
          </button>

          {isNotificationOpen ? (
            <div className="notification-panel">
              <div className="notification-panel-head">
                <strong>Notifications</strong>
                <span>{notificationItems.length}</span>
              </div>

              <div className="notification-list">
                {notificationItems.length === 0 ? (
                  <div className="notification-empty">No notifications yet</div>
                ) : (
                  notificationItems.map((item) => (
                    <div key={item.id} className={`notification-item ${item.type}`}>
                      <div className="notification-message">{item.message}</div>
                      <div className="notification-time">{formatTimeAgo(item.createdAt)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>
        <Link href="/profile" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="user-dropdown">
            <img src={avatarSrc} alt="User" style={{ width: 28, height: 28, borderRadius: 14, background: '#f3f4f6', objectFit: 'cover' }} />
            <span className="user-name-desktop">{user?.email ? user.email.split('@')[0] : 'User'}</span> <span style={{ opacity: 0.5 }}>⌄</span>
          </div>
        </Link>
        <button className="menu-btn" onClick={() => toggleMobile()} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-primary)' }}>☰</button>
      </div>
    </div>
  );
}

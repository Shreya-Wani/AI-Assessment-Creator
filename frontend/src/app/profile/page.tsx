'use client';
import React from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { motion } from 'framer-motion';
import AuthGuard from '@/components/AuthGuard';
import { useAuthStore } from '@/store/useAuthStore';

function ProfileContent() {
  const { user } = useAuthStore();

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <TopBar title="My Profile" />
        <div className="page-container profile-page-container">

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
            <div className="profile-hero">
              <div className="profile-cover" />
              <img
                src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user?.email || 'Teacher'}`}
                className="profile-avatar"
                alt="Profile avatar"
              />
            </div>

            <div className="profile-header-text">
              <h1 className="profile-title">{user?.schoolName || 'Unknown School'}</h1>
              <p className="profile-subtitle">
                {user?.role || 'TEACHER'} • {user?.location || 'Unknown Location'}
              </p>
            </div>

            <div className="profile-cards-grid">
              <div className="profile-card">
                <h3 className="profile-card-title">Account Details</h3>
                <div className="profile-details-list">
                  <div className="profile-detail-row">
                    <span className="profile-detail-label">Email</span>
                    <strong className="profile-detail-value profile-detail-value-email">{user?.email || '—'}</strong>
                  </div>
                  <div className="profile-detail-row">
                    <span className="profile-detail-label">Role</span>
                    <strong className={`profile-detail-value ${user?.role === 'TEACHER' ? 'profile-role-teacher' : 'profile-role-default'}`}>
                      {user?.role || '—'}
                    </strong>
                  </div>
                  <div className="profile-detail-row">
                    <span className="profile-detail-label">Location</span>
                    <strong className="profile-detail-value">{user?.location || '—'}</strong>
                  </div>
                  <div className="profile-detail-row">
                    <span className="profile-detail-label">Status</span>
                    <strong className="profile-detail-value profile-status-active">Active</strong>
                  </div>
                </div>
              </div>
            </div>

          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return <AuthGuard><ProfileContent /></AuthGuard>;
}

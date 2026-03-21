'use client';

import React, { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import AuthGuard from '@/components/AuthGuard';
import { useAuthStore } from '@/store/useAuthStore';
import { getUserAvatar } from '@/lib/avatar';

const presetAvatars = [
  { id: 'female-1', label: 'Female Avatar 1', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Ava&backgroundColor=fde68a' },
  { id: 'female-2', label: 'Female Avatar 2', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Meera&backgroundColor=bfdbfe' },
  { id: 'female-3', label: 'Female Avatar 3', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Sara&backgroundColor=fbcfe8' },
  { id: 'female-4', label: 'Female Avatar 4', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Anya&backgroundColor=c7d2fe' },
  { id: 'female-5', label: 'Female Avatar 5', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Noor&backgroundColor=bbf7d0' },
  { id: 'female-6', label: 'Female Avatar 6', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Riya&backgroundColor=fecaca' },
];

function SettingsContent() {
  const { theme, setTheme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  const [draft, setDraft] = useState<{ schoolName?: string; location?: string }>({});
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
  const [selectedPresetAvatar, setSelectedPresetAvatar] = useState<string>('');
  const [saveMessage, setSaveMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const schoolName = draft.schoolName ?? user?.schoolName ?? '';
  const location = draft.location ?? user?.location ?? '';

  const isDark = theme === 'dark';

  const avatarPreview = useMemo(() => {
    if (!selectedAvatar) return null;
    return URL.createObjectURL(selectedAvatar);
  }, [selectedAvatar]);

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const currentAvatar = useMemo(() => {
    if (avatarPreview) return avatarPreview;
    if (selectedPresetAvatar) return selectedPresetAvatar;
    return getUserAvatar(user);
  }, [avatarPreview, selectedPresetAvatar, user]);

  const onAvatarSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedAvatar(file);
    setSelectedPresetAvatar('');
  };

  const onSelectPresetAvatar = (url: string) => {
    setSelectedPresetAvatar(url);
    setSelectedAvatar(null);
  };

  const onSave = async () => {
    if (!schoolName.trim() || !location.trim()) {
      setSaveMessage('School name and location are required.');
      return;
    }

    try {
      await updateProfile({
        schoolName: schoolName.trim(),
        location: location.trim(),
        avatar: selectedAvatar,
        avatarUrl: selectedAvatar ? undefined : selectedPresetAvatar || undefined,
      });
      setSelectedAvatar(null);
      setSelectedPresetAvatar('');
      setSaveMessage('Profile updated successfully.');
    } catch (e) {
      setSaveMessage((e as Error).message || 'Failed to update profile.');
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <TopBar title="Settings" />
        <div className="page-container" style={{ padding: '30px', maxWidth: 820, margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Account Settings</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 26 }}>
              Keep your school profile updated. Changes are saved to your account.
            </p>

            <div
              style={{
                background: 'var(--bg-surface)',
                padding: 32,
                borderRadius: 16,
                border: '1px solid var(--border-light)',
                marginBottom: 24,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 30 }}>
                <img
                  src={currentAvatar}
                  alt="School avatar"
                  style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', background: 'var(--bg-main)' }}
                />
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{user?.schoolName || 'Your School'}</h3>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: '7px 12px',
                      background: 'var(--bg-main)',
                      color: 'var(--text-primary)',
                      borderRadius: 8,
                      fontSize: 12,
                      border: '1px solid var(--border-strong)',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Change Avatar
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={onAvatarSelect}
                    style={{ display: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div className="form-group">
                  <label className="form-label">School Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={schoolName}
                    onChange={(e) => setDraft((prev) => ({ ...prev, schoolName: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input
                    type="text"
                    className="form-input"
                    value={location}
                    onChange={(e) => setDraft((prev) => ({ ...prev, location: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Contact Email</label>
                <input type="email" className="form-input" value={user?.email || ''} readOnly />
              </div>

              <div style={{ marginTop: 16 }}>
                <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Choose Passport Avatar</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
                  {presetAvatars.map((avatar) => (
                    <button
                      key={avatar.id}
                      onClick={() => onSelectPresetAvatar(avatar.url)}
                      style={{
                        border: selectedPresetAvatar === avatar.url ? '2px solid var(--brand-orange)' : '1px solid var(--border-light)',
                        borderRadius: 12,
                        padding: 8,
                        background: 'var(--bg-main)',
                        cursor: 'pointer',
                      }}
                    >
                      <img
                        src={avatar.url}
                        alt={avatar.label}
                        style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', display: 'block', margin: '0 auto 6px' }}
                      />
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{avatar.label}</span>
                    </button>
                  ))}
                </div>
                <p style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                  You can upload your own photo or choose one of these preset male/female passport avatars.
                </p>
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: 28, borderRadius: 16, border: '1px solid var(--border-light)' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Appearance</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Dark Mode</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Use a softer professional dark palette</div>
                </div>
                <motion.div
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 20,
                    background: isDark ? 'var(--brand-orange)' : '#D1D5DB',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background 0.3s',
                  }}
                >
                  <motion.div
                    animate={{ x: isDark ? 22 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    style={{ width: 20, height: 20, borderRadius: 10, background: 'white', position: 'absolute', top: 2, left: 2 }}
                  />
                </motion.div>
              </div>
            </div>

            {(saveMessage || error) && (
              <p style={{ marginTop: 16, color: saveMessage.includes('successfully') ? '#16a34a' : '#ef4444', fontSize: 13, fontWeight: 600 }}>
                {saveMessage || error}
              </p>
            )}

            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
              <motion.button
                whileHover={{ scale: 1.04 }}
                className="btn-create-assignment"
                style={{ margin: 0, padding: '10px 30px', opacity: isLoading ? 0.75 : 1 }}
                onClick={onSave}
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsContent />
    </AuthGuard>
  );
}

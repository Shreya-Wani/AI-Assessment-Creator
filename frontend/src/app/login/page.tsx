'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
import BrandLogo from '@/components/BrandLogo';

export default function LoginPage() {
  const router = useRouter();
  const { login, register, isLoading, error, clearError } = useAuthStore();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [location, setLocation] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      if (isRegister) {
        await register(email, password, schoolName, location);
      } else {
        await login(email, password);
      }
      router.push('/home');
    } catch {}
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%)',
      fontFamily: "'Inter', sans-serif",
    }}>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 24,
          padding: '48px 40px',
          width: 440,
          boxShadow: '0 25px 60px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)',
        }}
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          style={{ textAlign: 'center', marginBottom: 32 }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <BrandLogo />
          </div>
          <p style={{ fontSize: 14, color: '#6b7280' }}>
            {isRegister ? 'Create your account' : 'Sign in to your account'}
          </p>
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 12, padding: '12px 16px', marginBottom: 20,
                color: '#dc2626', fontSize: 13,
              }}
            >
              ⚠️ {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input
              type="email" placeholder="Email" required value={email} onChange={e => setEmail(e.target.value)}
              style={inputStyle}
            />
            <input
              type="password" placeholder="Password" required value={password} onChange={e => setPassword(e.target.value)}
              style={inputStyle}
            />

            <AnimatePresence>
              {isRegister && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                >
                  <input
                    type="text" placeholder="School Name" required value={schoolName} onChange={e => setSchoolName(e.target.value)}
                    style={inputStyle}
                  />
                  <input
                    type="text" placeholder="Location" required value={location} onChange={e => setLocation(e.target.value)}
                    style={inputStyle}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                padding: '14px 0', borderRadius: 12, border: 'none',
                    background: isLoading ? '#9ca3af' : '#111827',
                    color: '#fff', fontSize: 15, fontWeight: 700, cursor: isLoading ? 'wait' : 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: isLoading ? 'none' : '0 8px 24px rgba(0,0,0,0.08)',
              }}
            >
              {isLoading ? '⏳ Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
            </motion.button>
          </div>
        </form>

        {/* Toggle */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <motion.button
            whileHover={{ color: '#f97316' }}
            onClick={() => { setIsRegister(!isRegister); clearError(); }}
            style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 13 }}
          >
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '14px 16px',
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
  color: '#111827',
  fontSize: 14,
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

'use client';
import React, { useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { motion, AnimatePresence } from 'framer-motion';
import AuthGuard from '@/components/AuthGuard';
import { useAuthStore } from '@/store/useAuthStore';
import { useDashboardStore } from '@/store/useDashboardStore';

const statusColors: Record<string, { bg: string; color: string }> = {
  completed: { bg: '#dcfce7', color: '#166534' },
  processing: { bg: '#dbeafe', color: '#1e40af' },
  pending: { bg: '#fef9c3', color: '#854d0e' },
  failed: { bg: '#fef2f2', color: '#991b1b' },
};

function HomeContent() {
  const { user } = useAuthStore();
  const { stats, isLoading, fetchStats } = useDashboardStore();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const statCards = [
    { title: 'Total Assignments', value: stats?.totalAssignments ?? 0, icon: '📄', color: '#FFF3E0' },
    { title: 'Active Students', value: stats?.activeStudents ?? 0, icon: '🎓', color: '#E8F5E9' },
    { title: 'Avg. Completion', value: `${stats?.avgCompletion ?? 0}%`, icon: '📈', color: '#E3F2FD' },
  ];

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <TopBar title="Home" />
        <div className="page-container" style={{ padding: '24px 16px' }}>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
              Welcome back, {user?.schoolName || 'Teacher'}!
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14, lineHeight: 1.5 }}>
              Here is a summary of your classroom activities.
            </p>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }} className="stat-grid-mobile">
              {statCards.map((s, i) => (
                <motion.div
                  className="stat-card"
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -5, boxShadow: '0 8px 30px rgba(0,0,0,0.05)' }}
                  style={{ background: 'var(--bg-surface)', padding: 24, borderRadius: 16, border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 16 }}
                >
                  <div className="stat-icon" style={{ background: s.color, width: 50, height: 50, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                    {s.icon}
                  </div>
                  <div>
                    <div className="stat-title" style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>{s.title}</div>
                    <div className="stat-value" style={{ fontSize: 28, fontWeight: 800 }}>
                      {isLoading ? (
                        <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2 }}>—</motion.span>
                      ) : s.value}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Recent Activity */}
            <div style={{ background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--border-light)', overflow: 'hidden', marginBottom: 24 }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-strong)', fontWeight: 600, fontSize: 15 }}>Recent Activity</div>

              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2 }}>Loading...</motion.span>
                  </motion.div>
                ) : !stats?.recentAssignments?.length ? (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{ padding: '40px 24px', textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🚀</div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
                      Start by creating your first assignment
                    </p>
                    <Link href="/">
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        style={{ padding: '10px 20px', background: 'var(--brand-black)', color: 'var(--bg-surface)', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                        + Create Assignment
                      </motion.button>
                    </Link>
                  </motion.div>
                ) : (
                  <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {stats.recentAssignments.map((r, i) => {
                      const sc = statusColors[r.status] || statusColors.pending;
                      return (
                        <Link href={`/assessment/${r._id}`} key={r._id} style={{ textDecoration: 'none', color: 'inherit' }}>
                          <motion.div
                            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + (i * 0.08) }}
                            whileHover={{ backgroundColor: 'var(--border-light)' }}
                            style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: i !== stats.recentAssignments.length - 1 ? '1px solid var(--border-light)' : 'none', cursor: 'pointer' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📝</div>
                              <div>
                                <div style={{ fontWeight: 600 }}>{r.title}</div>
                                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{formatDate(r.createdAt)}</div>
                              </div>
                            </div>
                            <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: sc.bg, color: sc.color, fontWeight: 600, textTransform: 'capitalize' }}>
                              {r.status}
                            </span>
                          </motion.div>
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return <AuthGuard><HomeContent /></AuthGuard>;
}

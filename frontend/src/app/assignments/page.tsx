'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useAssignmentStore } from '@/store/useAssignmentStore';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import AuthGuard from '@/components/AuthGuard';

function AssignmentsContent() {
  const { assignments, fetchAssignments } = useAssignmentStore();

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return `${d.getDate().toString().padStart(2,'0')}-${(d.getMonth() + 1).toString().padStart(2,'0')}-${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <motion.div className="main-content" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
        <TopBar title="Assignment" />
        
        <div className="page-container">
          <div className="list-header">
            <div className="list-title">
              <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="status-dot-green"></motion.span>
              Assignments
            </div>
            <div className="list-subtitle">Manage and create assignments for your classes.</div>
          </div>

          <div className="filters-row">
            <motion.button whileHover={{ scale: 1.05 }} className="filter-btn">
              <span style={{ fontSize: 16 }}>▽</span> Filter By
            </motion.button>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: 10, color: '#9ca3af', fontSize: 14 }}>🔍</span>
              <motion.input whileFocus={{ width: 260 }} transition={{ type: 'spring' }} type="text" className="search-input" placeholder="Search Assignment" />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {assignments.length === 0 ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%' }}
              >
                <motion.div animate={{ rotate: [0, -10, 10, -10, 0] }} transition={{ duration: 0.5, delay: 0.5 }} style={{ fontSize: 120, marginBottom: 20 }}>🔍</motion.div>
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>No assignments yet</h2>
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 460, fontSize: 13, lineHeight: 1.5, marginBottom: 24 }}>
                  Create your first assignment to start collecting and grading student submissions. 
                  You can set up rubrics, define marking criteria, and let AI assist with grading.
                </p>
                <Link href="/">
                  <motion.div className="btn-create-assignment" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} style={{ padding: '14px 24px', margin: 0 }}>
                    <span style={{ fontSize: 16 }}>+</span> Create Your First Assignment
                  </motion.div>
                </Link>
              </motion.div>
            ) : (
              <motion.div key="grid" variants={containerVariants} initial="hidden" animate="show" className="assignments-grid">
                {assignments.map((assignment) => (
                  <motion.div key={assignment._id} variants={itemVariants} whileHover={{ y: -5, boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}>
                    <Link href={`/assessment/${assignment._id}`} className="assignment-card" style={{ display: 'flex', height: '100%' }}>
                      <div className="card-top">
                        <div className="card-title">{assignment.title}</div>
                        <button className="card-more-btn" onClick={(e) => e.preventDefault()}>⋮</button>
                      </div>
                      <div className="card-bottom">
                        <span><strong>Assigned on :</strong> {formatDate(assignment.createdAt)}</span>
                        <span><strong>Due :</strong> {formatDate(assignment.dueDate)}</span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {assignments.length > 0 && (
            <>
              <div className="floating-overlay" />
              <Link href="/">
                <motion.div 
                  initial={{ y: 50, opacity: 0 }} 
                  animate={{ y: 0, opacity: 1 }} 
                  transition={{ delay: 0.3 }}
                  whileHover={{ scale: 1.05 }} 
                  whileTap={{ scale: 0.95 }}
                  className="floating-create-btn"
                  aria-label="Create Assignment"
                >
                  <span className="floating-create-plus">+</span>
                  <span className="floating-create-text">Create Assignment</span>
                </motion.div>
              </Link>
            </>
          )}

        </div>
      </motion.div>
    </div>
  );
}

export default function AssignmentsPage() {
  return <AuthGuard><AssignmentsContent /></AuthGuard>;
}

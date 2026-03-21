"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAssignmentStore } from '@/store/useAssignmentStore';
import { joinJob, leaveJob, onProgress, onCompleted, onError } from '@/lib/socket';
import { apiFetch } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import AuthGuard from '@/components/AuthGuard';
import { useAuthStore } from '@/store/useAuthStore';

// Helpers
function getStatusText(progress: number) {
  if (progress === 0) return 'Initializing...';
  if (progress < 30) return 'Analyzing content...';
  if (progress < 50) return 'Preparing questions...';
  if (progress < 75) return 'Generating questions...';
  if (progress < 90) return 'Validating structure...';
  if (progress < 100) return 'Finalizing...';
  return 'Completed ✅';
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div style={{ width: '100%', height: 8, borderRadius: 4, background: 'var(--border-strong)', overflow: 'hidden', marginTop: 16 }}>
      <motion.div
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{ height: '100%', borderRadius: 4, background: progress >= 100 ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'linear-gradient(90deg, #f97316, #f59e0b)' }}
      />
    </div>
  );
}

function CircularProgress({ progress }: { progress: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="ai-progress-circle-wrap" aria-label={`Progress ${clamped}%`}>
      <svg width="120" height="120" viewBox="0 0 120 120" className="ai-progress-circle-svg">
        <defs>
          <linearGradient id="ai-progress-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r={radius} className="ai-progress-track" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          className="ai-progress-value"
          stroke="url(#ai-progress-grad)"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="ai-progress-center">
        <div className="ai-progress-percent">{clamped}%</div>
        <div className="ai-progress-label">Live</div>
      </div>
      <div className="ai-orb" />
    </div>
  );
}

function AssessmentContent() {
  const params = useParams();
  const id = params.id as string;
  const paperRef = useRef<HTMLDivElement>(null);
  const requestedIdRef = useRef<string | null>(null);

  const { currentAssignment, fetchAssignment, generationStatus, progress, updateProgress } = useAssignmentStore();
  const { user } = useAuthStore();

  const [jobId, setJobId] = useState<string | null>(null);
  const [localProgress, setLocalProgress] = useState(0);
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorType, setErrorType] = useState<'quota' | 'temporary' | 'validation' | 'unknown'>('unknown');
  const [isRetryable, setIsRetryable] = useState(true);
  const [retryInfo, setRetryInfo] = useState<{ attempt?: number; maxAttempts?: number; willRetry?: boolean }>({});
  const [result, setResult] = useState<any>(null);
  const [fakeTickingItems, setFakeTickingItems] = useState<string[]>([]);

  const generationActive =
    generationStatus === 'processing' ||
    generationStatus === 'pending' ||
    currentAssignment?.status === 'pending' ||
    currentAssignment?.status === 'processing';

  const displayProgress = generationActive
    ? Math.max(localProgress, Math.min(12, fakeTickingItems.length * 3))
    : localProgress;

  useEffect(() => {
    if (!id) return;

    if (currentAssignment?._id === id) {
      requestedIdRef.current = id;
      return;
    }

    if (requestedIdRef.current === id) return;
    requestedIdRef.current = id;
    fetchAssignment(id);
  }, [id, currentAssignment?._id, fetchAssignment]);

  useEffect(() => {
    if (currentAssignment) {
      setJobId(currentAssignment.jobId || null);
      if (currentAssignment.status === 'completed' && currentAssignment.generatedPaper) {
        setResult(currentAssignment.generatedPaper);
        setLocalProgress(100);
      } else if (currentAssignment.status === 'completed' && (currentAssignment as any).result) {
        setResult((currentAssignment as any).result);
        setLocalProgress(100);
      } else if (currentAssignment.status === 'failed') {
        setError(true);
        setLocalProgress(0);
      }
    }
  }, [currentAssignment]);

  useEffect(() => {
    const isGenerating = generationStatus === 'processing' || generationStatus === 'pending';
    if (isGenerating && localProgress < 100 && !error) {
      const logs = [
        'Analyzing document format...',
        'Generating MCQ questions...',
        'Verifying chapter alignment...',
        'Drafting diagram-based questions...',
        'Building section structure...',
        'Assigning difficulty levels...',
        'Calculating mark distribution...',
      ];
      const i = setInterval(() => setFakeTickingItems(prev => [...prev.slice(-3), logs[Math.floor(Math.random() * logs.length)]]), 2000);
      return () => clearInterval(i);
    }
  }, [generationStatus, localProgress, error]);

  useEffect(() => {
    const activeJobId = jobId;
    if (!activeJobId) return;
    joinJob(activeJobId);

    const unsubProgress = onProgress((data) => {
      if (data.jobId === activeJobId) {
        setLocalProgress(data.progress);
        updateProgress(data.progress, data.status);
      }
    });

    const unsubCompleted = onCompleted((data) => {
      if (data.assignmentId === id) {
        setLocalProgress(100);
        setResult(data.result);
        setError(false);
        updateProgress(100, 'completed');
      }
    });

    const unsubError = onError((data) => {
      if (data.jobId === activeJobId) {
        setError(true);
        setErrorMsg(data.error || 'Generation failed');
        const isQuotaError = data.error?.includes('quota') || data.error?.includes('Quota');
        const isTemporaryError = data.error?.toLowerCase().includes('temporary') || data.error?.toLowerCase().includes('attempt');
        if (isQuotaError) { setErrorType('quota'); setIsRetryable(false); }
        else if (isTemporaryError) { setErrorType('temporary'); setIsRetryable(true); const m = data.error?.match(/Attempt (\d+)\/(\d+)/); if (m) setRetryInfo({ attempt: parseInt(m[1]), maxAttempts: parseInt(m[2]), willRetry: parseInt(m[1]) < parseInt(m[2]) }); }
        else { setErrorType('unknown'); setIsRetryable(true); }
        setLocalProgress(0); updateProgress(0, 'failed');
      }
    });

    return () => { leaveJob(activeJobId); unsubProgress(); unsubCompleted(); unsubError(); };
  }, [jobId, id, updateProgress]);

  const handleRegenerate = useCallback(async () => {
    try {
      const res = await apiFetch(`/assignments/${id}/regenerate`, { method: 'POST' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Regenerate failed'); }
      const data = await res.json();
      setJobId(data.jobId); setLocalProgress(0); setError(false); setErrorMsg(''); setErrorType('unknown'); setIsRetryable(true); setRetryInfo({}); setResult(null); setFakeTickingItems([]); updateProgress(0, 'pending');
    } catch (err: any) { setErrorMsg(err.message || ''); }
  }, [id, updateProgress]);

  const handleDownloadPDF = useCallback(async () => {
    try {
      const res = await apiFetch(`/assignments/${id}/pdf`);
      if (!res.ok) throw new Error('PDF download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${currentAssignment?.title || 'Assessment'}.pdf`; a.click(); URL.revokeObjectURL(url);
    } catch (err) { console.error('PDF download error:', err); }
  }, [id, currentAssignment]);

  const isGenerating = !result && !error && (generationStatus === 'processing' || generationStatus === 'pending' || currentAssignment?.status === 'pending' || currentAssignment?.status === 'processing');

  const sections = result?.sections || [];
  const computedSectionMarks = sections.reduce(
    (sectionAcc: number, section: any) =>
      sectionAcc + (section?.questions || []).reduce((qAcc: number, q: any) => qAcc + (q?.marks || 0), 0),
    0
  );
  const resolvedMaxMarks =
    result?.totalMarks ?? currentAssignment?.totalMarks ?? (computedSectionMarks > 0 ? computedSectionMarks : '—');

  const sanitizeQuestionText = (text?: string) => {
    if (!text) return '';
    return text.replace(/[\[\(]\s*\d+\s*Marks?\s*[\]\)]/gi, '').trim();
  };

  const formatDuration = (d?: any) => {
    if (!d && d !== 0) return '—';
    if (typeof d === 'number') return `${d} minutes`;
    if (typeof d === 'string') {
      // common formats: '45', '45 min', '45 minutes'
      const n = parseInt(d.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(n)) return `${n} minutes`;
      return d;
    }
    return String(d);
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <TopBar title="Assessment" />

        <div className="page-container" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="output-layout">

            {/* Full-screen AI processing overlay */}
            <AnimatePresence>
              {isGenerating && (
                <motion.div key="ai-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="ai-overlay">
                  <motion.div className="ai-overlay-card" initial={{ scale: 0.98, y: 8 }} animate={{ scale: 1, y: 0 }}>
                    <div className="ai-overlay-grid">
                      <div>
                        <div className="ai-overlay-school">{user?.schoolName || 'Your Institution'}</div>
                        <h3 className="ai-overlay-title">{getStatusText(displayProgress)}</h3>
                        <p className="ai-overlay-subtitle">AI is generating your paper with smart context analysis.</p>
                        <p className="ai-overlay-note">Thank you for waiting. Larger files may take a little longer.</p>
                      </div>

                      <div className="ai-overlay-right">
                        <CircularProgress progress={displayProgress} />
                        <div className="ai-overlay-log">{fakeTickingItems.slice(-1)[0] || 'Booting AI workflow...'}</div>
                      </div>
                    </div>

                    <ProgressBar progress={displayProgress} />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* MAIN PAPER AREA only (no sidebar cards) */}
            <div className="output-paper-area" ref={paperRef}>
              <AnimatePresence mode="wait">
                {result && sections.length > 0 ? (
                  <motion.div key="paper" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <div className="paper-download-banner">
                      <div className="banner-text">
                        Certainly! Your customized question paper is ready. Download the formatted PDF below.
                      </div>
                      <div className="banner-actions">
                        <button className="btn-download-white" onClick={handleDownloadPDF}>
                          ⬇ Download as PDF
                        </button>
                      </div>
                    </div>

                    <div className="question-paper">
                      <div className="paper-header">
                        <div className="paper-institution">{user?.schoolName || 'Your Institution'}</div>

                        <div className="paper-sub-info">
                          <div className="paper-subject">Subject: {result?.subject || currentAssignment?.subject || '—'}</div>
                          <div className="paper-class">Class: {result?.grade || currentAssignment?.grade || '—'}</div>
                        </div>

                        <div className="paper-details">
                          <div>Time Allowed: {formatDuration(result?.duration ?? currentAssignment?.duration)}</div>
                          <div>Maximum Marks: {resolvedMaxMarks}</div>
                        </div>
                      </div>

                      <div className="paper-student-info">
                        <div className="paper-general-instruction">All questions are compulsory unless stated othervise.</div>
                        <div className="student-line">Name: ____________________</div>
                        <div className="student-line">Roll Number: ____________________</div>
                        <div className="student-line">Class: {result?.grade || currentAssignment?.grade || '____'} Section: ________</div>
                      </div>

                      {sections.map((section: any, sIdx: number) => (
                        <div key={sIdx} className="paper-section">
                          <div className="section-header">
                            <div>
                              <h2 className="section-name">{section.title}</h2>
                              <div className="section-subtitle">{section.name}</div>
                            </div>
                            <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>{section.questions.reduce((acc: number, q: any) => acc + (q.marks || 0), 0)} Marks</div>
                          </div>

                          {section.instructions && (<div className="section-instructions">{section.instructions}</div>)}

                          {section.questions?.map((q: any, qIdx: number) => (
                            <div key={qIdx} className="question-item">
                              <div className="question-header">
                                <div style={{ display: 'flex', alignItems: 'flex-start', flex: 1 }}>
                                  <span className="question-number">{qIdx + 1}.</span>
                                  <span className="question-text">{sanitizeQuestionText(q.question || q.text || '')}</span>
                                </div>
                              </div>

                              {q.options && q.options.length > 0 && (
                                <div className="question-options">
                                  {q.options.map((opt: string, oIdx: number) => (
                                    <div key={oIdx} className="option-item"><span className="option-label">{String.fromCharCode(65+oIdx)}</span>{opt}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}

                      <div style={{ fontWeight: 700, marginTop: 40, fontSize: 14, textAlign: 'center', color: 'var(--text-secondary)' }}>── End of Question Paper ──</div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                    {error ? (
                      <>
                        <div style={{ fontSize: 60, marginBottom: 16 }}>😔</div>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>Generation failed</div>
                        <div style={{ fontSize: 13, marginTop: 8 }}>Use the regenerate button to try again</div>
                      </>
                    ) : (
                      <>
                        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }} style={{ fontSize: 60, marginBottom: 16 }}>📄</motion.div>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>{isGenerating ? 'AI is generating your paper...' : 'Preparing environment...'}</div>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default function AssessmentPage() {
  return <AuthGuard><AssessmentContent /></AuthGuard>;
}

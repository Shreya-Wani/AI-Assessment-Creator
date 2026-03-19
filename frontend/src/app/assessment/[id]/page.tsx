'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAssignmentStore } from '@/store/useAssignmentStore';
import { joinJob, leaveJob, onProgress, onCompleted, onError } from '@/lib/socket';
import { apiFetch } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import AuthGuard from '@/components/AuthGuard';

// ── Helpers ───────────────────────────────────────────────────────────
function getStatusText(progress: number) {
  if (progress === 0) return 'Initializing...';
  if (progress < 30) return 'Analyzing content...';
  if (progress < 50) return 'Preparing questions...';
  if (progress < 75) return 'Generating questions...';
  if (progress < 90) return 'Validating structure...';
  if (progress < 100) return 'Finalizing...';
  return 'Completed ✅';
}

const difficultyColors: Record<string, string> = {
  easy: '#22c55e',
  medium: '#eab308',
  hard: '#ef4444',
};

// ── Progress Bar Component ────────────────────────────────────────────
function ProgressBar({ progress }: { progress: number }) {
  return (
    <div style={{
      width: '100%', height: 8, borderRadius: 4,
      background: 'var(--border-strong)', overflow: 'hidden', marginTop: 16,
    }}>
      <motion.div
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{
          height: '100%', borderRadius: 4,
          background: progress >= 100
            ? 'linear-gradient(90deg, #22c55e, #16a34a)'
            : 'linear-gradient(90deg, #f97316, #f59e0b)',
        }}
      />
    </div>
  );
}

// ── Main Content ──────────────────────────────────────────────────────
function AssessmentContent() {
  const params = useParams();
  const id = params.id as string;
  const paperRef = useRef<HTMLDivElement>(null);

  const {
    currentAssignment,
    fetchAssignment,
    generationStatus,
    progress,
    updateProgress,
  } = useAssignmentStore();

  const [jobId, setJobId] = useState<string | null>(null);
  const [localProgress, setLocalProgress] = useState(0);
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorType, setErrorType] = useState<'quota' | 'temporary' | 'validation' | 'unknown'>('unknown');
  const [isRetryable, setIsRetryable] = useState(true);
  const [retryInfo, setRetryInfo] = useState<{ attempt?: number; maxAttempts?: number; willRetry?: boolean }>({});
  const [result, setResult] = useState<any>(null);
  const [fakeTickingItems, setFakeTickingItems] = useState<string[]>([]);

  // ── Fetch assignment on mount ─────────────────────────────────────
  useEffect(() => {
    if (id) {
      // Only fetch if we don't already have the assignment with jobId
      if (!currentAssignment || currentAssignment._id !== id) {
        fetchAssignment(id);
      }
    }
  }, [id, fetchAssignment]);

  // ── Sync state from store ─────────────────────────────────────────
  useEffect(() => {
    if (currentAssignment) {
      console.log('Current assignment:', currentAssignment);
      console.log('Job ID:', currentAssignment.jobId);
      console.log('Status:', currentAssignment.status);
      
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

  // ── Fake ticking logs during generation ───────────────────────────
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
      const i = setInterval(() => {
        setFakeTickingItems(prev => [...prev.slice(-3), logs[Math.floor(Math.random() * logs.length)]]);
      }, 2000);
      return () => clearInterval(i);
    }
  }, [generationStatus, localProgress, error]);

  // ── WebSocket: Join job room + listen ─────────────────────────────
  useEffect(() => {
    const activeJobId = jobId;
    if (!activeJobId) {
      console.log('No jobId available, cannot join WebSocket room');
      return;
    }

    console.log('Joining WebSocket room for job:', activeJobId);
    joinJob(activeJobId);

    const unsubProgress = onProgress((data) => {
      console.log('Progress event:', data);
      if (data.jobId === activeJobId) {
        setLocalProgress(data.progress);
        updateProgress(data.progress, data.status);
      }
    });

    const unsubCompleted = onCompleted((data) => {
      console.log('Completed event:', data);
      if (data.assignmentId === id) {
        setLocalProgress(100);
        setResult(data.result);
        setError(false);
        updateProgress(100, 'completed');
      }
    });

    const unsubError = onError((data) => {
      console.log('Error event:', data);
      if (data.jobId === activeJobId) {
        setError(true);
        setErrorMsg(data.error || 'Generation failed');
        
        // Extract error type and retry info if available in the error message or data
        const isQuotaError = data.error?.includes('quota') || data.error?.includes('Quota');
        const isTemporaryError = data.error?.toLowerCase().includes('temporary') || data.error?.toLowerCase().includes('attempt');
        
        if (isQuotaError) {
          setErrorType('quota');
          setIsRetryable(false);
        } else if (isTemporaryError) {
          setErrorType('temporary');
          setIsRetryable(true);
          // Extract attempt info from error message (e.g., "error (Attempt 1/3)")
          const attemptMatch = data.error?.match(/Attempt (\d+)\/(\d+)/);
          if (attemptMatch) {
            setRetryInfo({ 
              attempt: parseInt(attemptMatch[1]), 
              maxAttempts: parseInt(attemptMatch[2]),
              willRetry: parseInt(attemptMatch[1]) < parseInt(attemptMatch[2])
            });
          }
        } else {
          setErrorType('unknown');
          setIsRetryable(true);
        }
        
        setLocalProgress(0);
        updateProgress(0, 'failed');
      }
    });

    return () => {
      leaveJob(activeJobId);
      unsubProgress();
      unsubCompleted();
      unsubError();
    };
  }, [jobId, id, updateProgress]);

  // ── Regenerate Handler ────────────────────────────────────────────
  const handleRegenerate = useCallback(async () => {
    try {
      const res = await apiFetch(`/assignments/${id}/regenerate`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Regenerate failed');
      }
      const data = await res.json();

      setJobId(data.jobId);
      setLocalProgress(0);
      setError(false);
      setErrorMsg('');
      setErrorType('unknown');
      setIsRetryable(true);
      setRetryInfo({});
      setResult(null);
      setFakeTickingItems([]);
      updateProgress(0, 'pending');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }, [id, updateProgress]);

  // ── Download PDF from backend ─────────────────────────────────────
  const handleDownloadPDF = useCallback(async () => {
    try {
      const res = await apiFetch(`/assignments/${id}/pdf`);
      if (!res.ok) throw new Error('PDF download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentAssignment?.title || 'Assessment'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download error:', err);
    }
  }, [id, currentAssignment]);

  // ── Derived State ─────────────────────────────────────────────────
  const isGenerating = !result && !error && (
    generationStatus === 'processing' ||
    generationStatus === 'pending' ||
    currentAssignment?.status === 'pending' ||
    currentAssignment?.status === 'processing'
  );

  const sections = result?.sections || [];

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <TopBar title="Assessment" />

        <div className="page-container" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="output-layout">

            {/* ── LEFT SIDEBAR ──────────────────────────────────── */}
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="output-sidebar"
            >
              <div className="output-message-card">
                <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                  {result
                    ? '✅ Your question paper has been generated successfully!'
                    : error
                      ? '❌ Generation encountered an issue.'
                      : '⏳ AI is generating your assessment...'}
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-download-pdf"
                  onClick={handleDownloadPDF}
                  disabled={!result}
                  style={{ opacity: result ? 1 : 0.4 }}
                >
                  <span style={{ fontSize: 16 }}>📥</span> Download as PDF
                </motion.button>
              </div>

              {/* ── PROGRESS STATE ────────────────────────────── */}
              <AnimatePresence>
                {isGenerating && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{
                      textAlign: 'center', padding: '32px 20px',
                      background: 'var(--bg-surface)', borderRadius: 20,
                      border: '1px solid var(--border-light)',
                    }}
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                      style={{
                        width: 48, height: 48,
                        border: '3px solid var(--border-strong)',
                        borderTopColor: 'var(--brand-orange)',
                        borderRadius: '50%', margin: '0 auto 20px',
                      }}
                    />

                    <h3 style={{ fontSize: 16, marginBottom: 4, color: 'var(--text-primary)' }}>
                      {getStatusText(localProgress)}
                    </h3>

                    <ProgressBar progress={localProgress} />

                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                      {localProgress}% Complete
                    </p>

                    <div style={{ marginTop: 20, fontSize: 11, color: 'var(--text-secondary)', textAlign: 'left' }}>
                      <AnimatePresence>
                        {fakeTickingItems.map((log, i) => (
                          <motion.div
                            key={`${i}-${log}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{ marginBottom: 4 }}
                          >
                            ✓ {log}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── ERROR STATE ───────────────────────────────── */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    style={{
                      textAlign: 'center', padding: '32px 20px',
                      background: 'var(--bg-surface)', borderRadius: 20,
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                    }}
                  >
                    <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                    <h3 style={{ fontSize: 16, color: '#ef4444', fontWeight: 700, marginBottom: 8 }}>
                      Generation Failed
                    </h3>
                    
                    {/* Error Message */}
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
                      {errorMsg || 'Something went wrong during AI processing. Please try again.'}
                    </p>

                    {/* Error Type Specific Information */}
                    {errorType === 'quota' && (
                      <div style={{
                        padding: '12px 16px', borderRadius: 12,
                        background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                        marginBottom: 16, fontSize: 12, color: '#dc2626', textAlign: 'left', lineHeight: 1.5
                      }}>
                        <strong>⚡ Action Required:</strong> Your Google Gemini API quota has been exceeded. 
                        <br/>Please check your Google AI Studio quota limits and upgrade your plan if needed.
                        <br/><a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer"
                          style={{ color: '#dc2626', textDecoration: 'underline' }}>
                          Go to Google AI Studio →
                        </a>
                      </div>
                    )}

                    {errorType === 'temporary' && isRetryable && retryInfo.willRetry && (
                      <div style={{
                        padding: '12px 16px', borderRadius: 12,
                        background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)',
                        marginBottom: 16, fontSize: 12, color: '#b45309', textAlign: 'left', lineHeight: 1.5
                      }}>
                        <strong>🔄 Retrying:</strong> This was a temporary error (Attempt {retryInfo.attempt}/{retryInfo.maxAttempts}). 
                        <br/>The system will automatically retry in the background.
                      </div>
                    )}

                    {/* Regenerate Button - Conditional Display */}
                    {!isRetryable || errorType === 'quota' ? (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        This error cannot be automatically retried. Please fix the issue and try again.
                      </div>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleRegenerate}
                        style={{
                          padding: '12px 24px', borderRadius: 12, border: 'none',
                          background: 'linear-gradient(135deg, #f97316, #f59e0b)',
                          color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                        }}
                      >
                        🔁 Regenerate
                      </motion.button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── COMPLETED STATE (Sidebar Info) ────────────── */}
              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      padding: '20px', background: 'var(--bg-surface)',
                      borderRadius: 16, border: '1px solid var(--border-light)',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>
                      📊 Paper Summary
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                      <div>Total Sections: <strong>{sections.length}</strong></div>
                      <div>Total Questions: <strong>{sections.reduce((a: number, s: any) => a + (s.questions?.length || 0), 0)}</strong></div>
                      <div>Total Marks: <strong>{sections.reduce((a: number, s: any) => a + (s.questions?.reduce((b: number, q: any) => b + (q.marks || 0), 0) || 0), 0)}</strong></div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleRegenerate}
                      style={{
                        marginTop: 16, width: '100%', padding: '10px 0',
                        borderRadius: 10, border: '1px solid var(--border-strong)',
                        background: 'transparent', color: 'var(--text-primary)',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      🔁 Regenerate New Paper
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* ── MAIN PAPER AREA ────────────────────────────────── */}
            <div className="output-paper-area" ref={paperRef}>
              <AnimatePresence mode="wait">
                {result && sections.length > 0 ? (
                  <motion.div
                    key="paper"
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="paper-header">
                      <div className="paper-title">{currentAssignment?.title || 'Generated Assessment'}</div>
                      <div className="paper-meta">
                        Due: {currentAssignment?.dueDate ? new Date(currentAssignment.dueDate).toLocaleDateString() : 'N/A'}
                      </div>
                    </motion.div>

                    <div className="paper-student-info">
                      Name: _______________________________<br />
                      Roll Number: ________________________<br />
                      Date: ____________________
                    </div>

                    {sections.map((section: any, sIdx: number) => (
                      <motion.div
                        key={sIdx}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: sIdx * 0.1 }}
                      >
                        <div className="paper-section-title">{section.title}</div>
                        {section.instructions && (
                          <div style={{ fontStyle: 'italic', fontSize: 13, marginBottom: 20, color: 'var(--text-secondary)' }}>
                            {section.instructions}
                          </div>
                        )}

                        {section.questions?.map((q: any, qIdx: number) => (
                          <motion.div
                            key={qIdx}
                            className="question-item"
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: qIdx * 0.05 }}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                              <span style={{ fontWeight: 700, minWidth: 28 }}>{qIdx + 1}.</span>
                              <div style={{ flex: 1 }}>
                                <span>{q.question}</span>
                                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                                  <span style={{
                                    fontSize: 11, padding: '2px 8px', borderRadius: 6,
                                    background: `${difficultyColors[q.difficulty] || '#94a3b8'}22`,
                                    color: difficultyColors[q.difficulty] || '#94a3b8',
                                    fontWeight: 600,
                                  }}>
                                    {q.difficulty}
                                  </span>
                                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                                    [{q.marks} {q.marks === 1 ? 'Mark' : 'Marks'}]
                                  </span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    ))}

                    <div style={{ fontWeight: 700, marginTop: 40, fontSize: 14, textAlign: 'center', color: 'var(--text-secondary)' }}>
                      ── End of Question Paper ──
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      height: '100%', color: 'var(--text-muted)',
                    }}
                  >
                    {error ? (
                      <>
                        <div style={{ fontSize: 60, marginBottom: 16 }}>😔</div>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>Generation failed</div>
                        <div style={{ fontSize: 13, marginTop: 8 }}>Use the regenerate button to try again</div>
                      </>
                    ) : (
                      <>
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                          style={{ fontSize: 60, marginBottom: 16 }}
                        >
                          📄
                        </motion.div>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>
                          {isGenerating ? 'AI is generating your paper...' : 'Preparing environment...'}
                        </div>
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

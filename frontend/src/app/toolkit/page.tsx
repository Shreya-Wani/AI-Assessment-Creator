'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AuthGuard from '@/components/AuthGuard';
import { apiFetch } from '@/lib/api';

type HelperResult = {
  summary: string;
  strengths: string[];
  gaps: string[];
  nextSteps: string[];
  scoreBand: string;
};

function ToolkitContent() {
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [question, setQuestion] = useState('');
  const [answerKey, setAnswerKey] = useState('');
  const [studentAnswer, setStudentAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<HelperResult | null>(null);

  const runHelper = async () => {
    if (!question.trim() || !answerKey.trim() || !studentAnswer.trim()) {
      setError('Question, answer key, and student answer are required.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await apiFetch('/toolkit/answer-helper', {
        method: 'POST',
        body: JSON.stringify({
          subject: subject.trim(),
          grade: grade.trim(),
          question: question.trim(),
          answerKey: answerKey.trim(),
          studentAnswer: studentAnswer.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to evaluate answer');
      setResult(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to evaluate answer';
      setError(message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 'clamp(14px, 3vw, 28px)', maxWidth: 1040, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>AI Teacher Toolkit</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
          One focused helper: evaluate a student&apos;s answer instantly and get actionable teaching feedback.
        </p>

        <div className="profile-card" style={{ padding: 22, marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Answer Insight Helper</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 12 }}>
            <input className="form-input" placeholder="Subject (optional)" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <input className="form-input" placeholder="Grade (optional)" value={grade} onChange={(e) => setGrade(e.target.value)} />
          </div>

          <label className="form-label">Question</label>
          <textarea className="form-textarea" style={{ minHeight: 84, marginBottom: 10 }} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Enter the question asked to students" />

          <label className="form-label">Ideal Answer / Marking Key</label>
          <textarea className="form-textarea" style={{ minHeight: 110, marginBottom: 10 }} value={answerKey} onChange={(e) => setAnswerKey(e.target.value)} placeholder="Write the ideal expected answer" />

          <label className="form-label">Student Answer</label>
          <textarea className="form-textarea" style={{ minHeight: 110 }} value={studentAnswer} onChange={(e) => setStudentAnswer(e.target.value)} placeholder="Paste the student&apos;s response" />

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button className="btn-nav-next" onClick={runHelper} disabled={loading}>
              {loading ? 'Analyzing...' : 'Generate Insight'}
            </button>
          </div>
        </div>

        {error ? <div style={{ color: '#ef4444', fontWeight: 600, fontSize: 13, marginBottom: 12 }}>{error}</div> : null}

        <AnimatePresence>
          {result && (
            <motion.div className="profile-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ padding: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                <h3 style={{ fontSize: 17, fontWeight: 700 }}>Feedback Summary</h3>
                <span style={{ fontSize: 12, padding: '6px 10px', borderRadius: 999, background: 'var(--bg-main)', border: '1px solid var(--border-strong)' }}>
                  Score Band: <strong>{result.scoreBand}</strong>
                </span>
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 12 }}>{result.summary}</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Strengths</div>
                  {result.strengths.length ? result.strengths.map((item) => <div key={item} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 5 }}>• {item}</div>) : <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No strengths identified.</div>}
                </div>
                <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Learning Gaps</div>
                  {result.gaps.length ? result.gaps.map((item) => <div key={item} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 5 }}>• {item}</div>) : <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No gaps identified.</div>}
                </div>
                <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Next Steps</div>
                  {result.nextSteps.length ? result.nextSteps.map((item) => <div key={item} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 5 }}>• {item}</div>) : <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No steps generated.</div>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default function ToolkitPage() {
  return (
    <AuthGuard>
      <ToolkitContent />
    </AuthGuard>
  );
}

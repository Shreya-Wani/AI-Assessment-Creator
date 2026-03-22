'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAssignmentStore } from '@/store/useAssignmentStore';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import AuthGuard from '@/components/AuthGuard';

type FormDataExtra = {
  examDate?: string;
  duration?: string | number;
};

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {children}
      {error && <div className="form-error">⚠ {error}</div>}
    </div>
  );
}

function HomeContent() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { formData, setFormField, createAssignment, isSubmitting } = useAssignmentStore();

  const [qTypes, setQTypes] = useState([
    { id: '1', type: 'Multiple Choice Questions', count: 4, marks: 1 },
    { id: '2', type: 'Short Questions',           count: 3, marks: 2 },
    { id: '3', type: 'Diagram/Graph-Based Questions', count: 5, marks: 5 },
    { id: '4', type: 'Numerical Problems',        count: 5, marks: 5 },
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const extendedFormData = formData as typeof formData & FormDataExtra;

  const handleUpdate = (index: number, field: string, val: number) => {
    const newTypes = [...qTypes];
    newTypes[index] = { ...newTypes[index], [field]: Math.max(1, val) };
    setQTypes(newTypes);
  };

  const removeType = (id: string) => {
    if (qTypes.length > 1) setQTypes(qTypes.filter((q) => q.id !== id));
  };

  const addType = () => {
    setQTypes([
      ...qTypes,
      { id: Date.now().toString(), type: 'New Custom Question', count: 1, marks: 1 },
    ]);
  };

  const totalQ = qTypes.reduce((a, b) => a + b.count, 0);
  const totalM = qTypes.reduce((a, b) => a + b.count * b.marks, 0);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.title?.trim())    e.title    = 'Title is required';
    if (!formData.subject?.trim())  e.subject  = 'Subject is required';
    if (!formData.grade?.trim())    e.grade    = 'Grade is required';
    if (!extendedFormData.examDate) e.examDate = 'Exam date & time is required';
    if (!extendedFormData.duration || Number(extendedFormData.duration) <= 0)
      e.duration = 'Duration is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      const questionsConfig = qTypes.map((q) => {
        let type = 'short_answer';
        if (q.type.includes('Multiple')) type = 'mcq';
        else if (q.type.includes('Short')) type = 'short_answer';
        else if (q.type.includes('Diagram')) type = 'long_answer';
        else if (q.type.includes('Numerical')) type = 'numerical';
        return { type, count: q.count, marks: q.marks };
      });

      const payload = {
        title:       formData.title,
        subject:     formData.subject,
        grade:       formData.grade,
        topic:       formData.topic || '',
        dueDate:     extendedFormData.examDate ? String(extendedFormData.examDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
        examDate:    extendedFormData.examDate || '',
        duration:    extendedFormData.duration || '',
        totalMarks:  totalM,
        numberOfQuestions: totalQ,
        questionsConfig,
        instructions: formData.additionalInstructions || '',
        fileUrl: '',
      };

      const id = await createAssignment(payload);
      if (id) {
        router.push(`/assessment/${id}`);
      } else {
        alert('Failed to create assignment. Please check console for errors.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create assignment';
      alert(`Error: ${message}`);
    }
  };

  const itemVariants = {
    hidden:  { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <motion.div
        className="main-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <TopBar title="Assignment" />

        <div className="page-container">
          <motion.div
            className="form-container"
            initial="hidden"
            animate="visible"
            variants={{
              hidden:   { opacity: 0, scale: 0.98 },
              visible:  { opacity: 1, scale: 1, transition: { staggerChildren: 0.08 } },
            }}
          >
            {/* ── Header ── */}
            <motion.div variants={itemVariants} style={{ textAlign: 'center', marginBottom: 32 }}>
              <div className="form-section-title" style={{ fontSize: 20 }}>Create Assignment</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Set up a new assignment for your students
              </div>
              <div style={{ width: '100%', height: 1, background: 'var(--border-strong)', margin: '24px 0' }} />
            </motion.div>

            {/* ══ SECTION 1 – Assignment Details ══ */}
            <motion.div variants={itemVariants}>
              <div className="form-section-title" style={{ textAlign: 'left' }}>Assignment Details</div>
              <div className="form-section-subtitle" style={{ textAlign: 'left' }}>
                Basic information about your assignment
              </div>
            </motion.div>

            {/* File upload */}
            <motion.div
              variants={itemVariants}
              className="file-upload-box"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={(e) => setFormField('file', e.target.files?.[0] || null)}
              />
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="upload-icon"
              >
                ☁️
              </motion.div>
              <div className="upload-text">
                {formData.file ? formData.file.name : 'Choose a file or drag & drop it here'}
              </div>
              <div className="upload-hint">JPEG, PNG, PDF, upto 10MB</div>
              <button className="btn-browse" type="button">Browse Files</button>
            </motion.div>
            <motion.div
              variants={itemVariants}
              style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24, marginTop: -16 }}
            >
              Upload images of your preferred document/image
            </motion.div>

            {/* Title */}
            <motion.div variants={itemVariants}>
              <Field label="Assignment Title *" error={errors.title}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Mid-Term Examination 2025"
                  value={formData.title || ''}
                  onChange={(e) => setFormField('title', e.target.value)}
                />
              </Field>
            </motion.div>

            {/* Subject + Grade in one row */}
            <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Subject *" error={errors.subject}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Mathematics"
                  value={formData.subject || ''}
                  onChange={(e) => setFormField('subject', e.target.value)}
                />
              </Field>

              <Field label="Class / Grade *" error={errors.grade}>
                <select
                  className="form-input"
                  style={{ cursor: 'pointer' }}
                  value={formData.grade || ''}
                  onChange={(e) => setFormField('grade', e.target.value)}
                >
                  <option value="">Select Grade</option>
                  {['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6',
                    'Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12',
                    'Undergraduate','Postgraduate'].map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </Field>
            </motion.div>

            {/* Topic */}
            <motion.div variants={itemVariants}>
              <Field label="Topic / Chapter">
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Algebra, Thermodynamics"
                  value={formData.topic || ''}
                  onChange={(e) => setFormField('topic', e.target.value)}
                />
              </Field>
            </motion.div>

            {/* Exam Date + Duration in one row */}
            <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Exam Date & Time *" error={errors.examDate}>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={extendedFormData.examDate || ''}
                  onChange={(e) => setFormField('examDate', e.target.value)}
                />
              </Field>

              <Field label="Duration (minutes) *" error={errors.duration}>
                <input
                  type="number"
                  className="form-input"
                  min={1}
                  placeholder="e.g., 60"
                  value={extendedFormData.duration || ''}
                  onChange={(e) => setFormField('duration', e.target.value)}
                />
              </Field>
            </motion.div>

            {/* ══ SECTION 2 – Question Types ══ */}
            <motion.div variants={itemVariants} style={{ marginTop: 8 }}>
              <div className="form-section-title" style={{ textAlign: 'left', marginBottom: 4 }}>
                Question Types
              </div>
              <div className="form-section-subtitle" style={{ textAlign: 'left' }}>
                Configure question types and marks
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="form-group">
              <AnimatePresence>
                {qTypes.map((q, idx) => (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, x: -20, height: 0 }}
                    animate={{ opacity: 1, x: 0, height: 'auto' }}
                    exit={{ opacity: 0, x: 50, height: 0, margin: 0 }}
                    className="question-type-card"
                  >
                    <button
                      type="button"
                      onClick={() => removeType(q.id)}
                      style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 18, color: '#9ca3af', cursor: 'pointer' }}
                    >
                      ×
                    </button>
                    <select
                      value={q.type}
                      onChange={(e) => {
                        const newT = [...qTypes];
                        newT[idx].type = e.target.value;
                        setQTypes(newT);
                      }}
                    >
                      <option>Multiple Choice Questions</option>
                      <option>Short Questions</option>
                      <option>Diagram/Graph-Based Questions</option>
                      <option>Numerical Problems</option>
                      <option>New Custom Question</option>
                    </select>

                    <div className="type-config-row">
                      <div className="type-config-col">
                        No. of Questions
                        <div className="number-stepper">
                          <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={() => handleUpdate(idx, 'count', q.count - 1)}>-</motion.button>
                          <motion.input key={`c-${q.count}`} initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} type="text" readOnly value={`${q.count} +`} />
                          <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={() => handleUpdate(idx, 'count', q.count + 1)}>+</motion.button>
                        </div>
                      </div>

                      <div className="type-config-col">
                        Marks
                        <div className="number-stepper">
                          <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={() => handleUpdate(idx, 'marks', q.marks - 1)}>-</motion.button>
                          <motion.input key={`m-${q.marks}`} initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} type="text" readOnly value={`${q.marks} +`} />
                          <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={() => handleUpdate(idx, 'marks', q.marks + 1)}>+</motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-add-type"
                onClick={addType}
              >
                <span style={{ fontSize: 16, paddingRight: 4 }}>+</span> Add Question Type
              </motion.button>

              <div className="totals-section">
                Total Questions:{' '}
                <motion.span key={totalQ} initial={{ scale: 1.2, color: 'var(--brand-orange)' }} animate={{ scale: 1, color: 'var(--text-secondary)' }}>
                  {totalQ}
                </motion.span>
                <br />
                Total Marks:{' '}
                <motion.span key={totalM} initial={{ scale: 1.2, color: 'var(--brand-orange)' }} animate={{ scale: 1, color: 'var(--text-secondary)' }}>
                  {totalM}
                </motion.span>
              </div>
            </motion.div>

            {/* ══ SECTION 3 – Additional Info ══ */}
            <motion.div variants={itemVariants} className="form-group" style={{ marginTop: 8 }}>
              <label className="form-label" style={{ fontSize: 13 }}>
                Additional Information (For better output)
              </label>
              <textarea
                className="form-textarea"
                placeholder="e.g Generate a question paper for 3 hour exam duration..."
                value={formData.additionalInstructions || ''}
                onChange={(e) => setFormField('additionalInstructions', e.target.value)}
              />
            </motion.div>

            {/* ══ Footer ══ */}
            <motion.div variants={itemVariants} className="form-footer">
              <motion.button
                type="button"
                whileHover={{ backgroundColor: '#f3f4f6' }}
                whileTap={{ scale: 0.95 }}
                className="btn-nav-prev"
                onClick={() => router.push('/assignments')}
              >
                ← Previous
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.05, boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}
                whileTap={{ scale: 0.95 }}
                className="btn-nav-next"
                onClick={handleSubmit}
                disabled={isSubmitting}
                animate={isSubmitting ? { opacity: 0.7 } : { opacity: 1 }}
              >
                {isSubmitting ? 'Generating...' : 'Next →'}
              </motion.button>
            </motion.div>

          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

export default function Home() {
  return <AuthGuard><HomeContent /></AuthGuard>;
}
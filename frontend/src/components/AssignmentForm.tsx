'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAssignmentStore } from '@/store/useAssignmentStore';
import { QUESTION_TYPES, DIFFICULTY_LEVELS } from '@/types';

export default function AssignmentForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const {
    formData,
    setFormField,
    resetForm,
    createAssignment,
    isSubmitting,
    error,
  } = useAssignmentStore();
  const extendedFormData = formData as typeof formData & {
    examDate?: string;
    duration?: string | number;
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.subject.trim()) newErrors.subject = 'Subject is required';
    if (!formData.grade.trim()) newErrors.grade = 'Grade/Level is required';
    if (!formData.dueDate) newErrors.dueDate = 'Due date is required';
    if (!extendedFormData.examDate) newErrors.examDate = 'Exam date & time is required';
    if (formData.questionTypes.length === 0) newErrors.questionTypes = 'Select at least one question type';
    if (formData.numberOfQuestions < 1 || formData.numberOfQuestions > 100)
      newErrors.numberOfQuestions = 'Must be between 1 and 100';
    if (formData.totalMarks < 1) newErrors.totalMarks = 'Must be a positive number';
    if (formData.totalMarks < formData.numberOfQuestions)
      newErrors.totalMarks = 'Total marks must be ≥ number of questions';
    if (!extendedFormData.duration || Number(extendedFormData.duration) <= 0)
      newErrors.duration = 'Enter duration in minutes';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTypeToggle = (typeId: string) => {
    const current = formData.questionTypes;
    if (current.includes(typeId)) {
      if (current.length > 1) {
        setFormField('questionTypes', current.filter((t) => t !== typeId));
      }
    } else {
      setFormField('questionTypes', [...current, typeId]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormField('file', file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      const fd = new FormData();
      fd.append('title', formData.title);
      fd.append('subject', formData.subject);
      fd.append('grade', formData.grade);
      fd.append('duration', String(extendedFormData.duration || ''));
      if (extendedFormData.examDate) fd.append('examDate', extendedFormData.examDate);
      fd.append('topic', formData.topic);
      fd.append('dueDate', formData.dueDate);
      fd.append('questionTypes', JSON.stringify(formData.questionTypes));
      fd.append('numberOfQuestions', String(formData.numberOfQuestions));
      fd.append('totalMarks', String(formData.totalMarks));
      fd.append('difficulty', formData.difficulty);
      fd.append('additionalInstructions', formData.additionalInstructions);

      if (formData.file) {
        fd.append('file', formData.file);
      }

      const assignmentId = await createAssignment(fd);
      resetForm();
      router.push(`/assessment/${assignmentId}`);
    } catch {
      // Error is handled by the store
    }
  };

  return (
    <form onSubmit={handleSubmit} className="slide-up">

      {/* ── 1. Assignment Details ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="card-icon">📝</div>
            <div className="card-title">Assignment Details</div>
          </div>
        </div>

        {/* Title */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Assignment Title *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., Mid-Term Examination 2025"
              value={formData.title}
              onChange={(e) => setFormField('title', e.target.value)}
            />
            {errors.title && <div className="form-error">⚠ {errors.title}</div>}
          </div>
        </div>

        {/* Topic / Due Date / Exam Date */}
        <div className="form-row-3">
          <div className="form-group">
            <label className="form-label">Topic / Chapter</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., Algebra, Thermodynamics"
              value={formData.topic}
              onChange={(e) => setFormField('topic', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Due Date *</label>
            <input
              type="date"
              className="form-input"
              value={formData.dueDate}
              onChange={(e) => setFormField('dueDate', e.target.value)}
            />
            {errors.dueDate && <div className="form-error">⚠ {errors.dueDate}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Exam Date &amp; Time *</label>
            <input
              type="datetime-local"
              className="form-input"
              value={extendedFormData.examDate || ''}
              onChange={(e) => setFormField('examDate', e.target.value)}
            />
            {errors.examDate && <div className="form-error">⚠ {errors.examDate}</div>}
          </div>
        </div>
      </div>

      {/* ── 2. Paper Metadata ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="card-icon">📚</div>
            <div className="card-title">Paper Metadata</div>
          </div>
        </div>

        <div className="form-row-3">
          <div className="form-group">
            <label className="form-label">Subject *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., Mathematics, English"
              value={formData.subject}
              onChange={(e) => setFormField('subject', e.target.value)}
            />
            {errors.subject && <div className="form-error">⚠ {errors.subject}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Class / Grade *</label>
            <select
              className="form-select"
              value={formData.grade}
              onChange={(e) => setFormField('grade', e.target.value)}
            >
              <option value="">Select Grade</option>
              <option value="Grade 1">Grade 1</option>
              <option value="Grade 2">Grade 2</option>
              <option value="Grade 3">Grade 3</option>
              <option value="Grade 4">Grade 4</option>
              <option value="Grade 5">Grade 5</option>
              <option value="Grade 6">Grade 6</option>
              <option value="Grade 7">Grade 7</option>
              <option value="Grade 8">Grade 8</option>
              <option value="Grade 9">Grade 9</option>
              <option value="Grade 10">Grade 10</option>
              <option value="Grade 11">Grade 11</option>
              <option value="Grade 12">Grade 12</option>
              <option value="Undergraduate">Undergraduate</option>
              <option value="Postgraduate">Postgraduate</option>
            </select>
            {errors.grade && <div className="form-error">⚠ {errors.grade}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Time Allowed (minutes) *</label>
            <input
              type="number"
              className="form-input"
              min={1}
              placeholder="e.g., 60"
              value={extendedFormData.duration || ''}
              onChange={(e) => setFormField('duration', e.target.value)}
            />
            {errors.duration && <div className="form-error">⚠ {errors.duration}</div>}
          </div>
        </div>
      </div>

      {/* ── 3. Question Configuration ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="card-icon">⚙️</div>
            <div className="card-title">Question Configuration</div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Question Types *</label>
          <div className="toggle-group">
            {QUESTION_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                className={`toggle-btn ${formData.questionTypes.includes(type.id) ? 'active' : ''}`}
                onClick={() => handleTypeToggle(type.id)}
              >
                <span className="toggle-icon">{type.icon}</span>
                {type.label}
              </button>
            ))}
          </div>
          {errors.questionTypes && <div className="form-error">⚠ {errors.questionTypes}</div>}
        </div>

        <div className="form-row-3">
          <div className="form-group">
            <label className="form-label">Number of Questions *</label>
            <input
              type="number"
              className="form-input"
              min={1}
              max={100}
              value={formData.numberOfQuestions}
              onChange={(e) => setFormField('numberOfQuestions', parseInt(e.target.value) || 0)}
            />
            {errors.numberOfQuestions && (
              <div className="form-error">⚠ {errors.numberOfQuestions}</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Total Marks *</label>
            <input
              type="number"
              className="form-input"
              min={1}
              value={formData.totalMarks}
              onChange={(e) => setFormField('totalMarks', parseInt(e.target.value) || 0)}
            />
            {errors.totalMarks && <div className="form-error">⚠ {errors.totalMarks}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Difficulty Level</label>
            <div className="toggle-group">
              {DIFFICULTY_LEVELS.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  className={`toggle-btn ${formData.difficulty === level.id ? 'active' : ''}`}
                  onClick={() => setFormField('difficulty', level.id)}
                  style={
                    formData.difficulty === level.id
                      ? { borderColor: level.color, color: level.color }
                      : {}
                  }
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Additional Resources ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="card-icon">📎</div>
            <div className="card-title">Additional Resources</div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Upload Reference Material (Optional)</label>
          <div
            className={`file-upload ${formData.file ? 'has-file' : ''}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            {formData.file ? (
              <>
                <div className="file-upload-icon">📄</div>
                <div className="file-name">✓ {formData.file.name}</div>
                <div className="file-upload-hint" style={{ marginTop: 4 }}>
                  Click to change file
                </div>
              </>
            ) : (
              <>
                <div className="file-upload-icon">☁️</div>
                <div className="file-upload-text">Click to upload or drag and drop</div>
                <div className="file-upload-hint">PDF or Text files up to 10MB</div>
              </>
            )}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Additional Instructions</label>
          <textarea
            className="form-textarea"
            placeholder="Any specific instructions for question generation... e.g., Focus on application-based questions, Include diagram-based questions"
            value={formData.additionalInstructions}
            onChange={(e) => setFormField('additionalInstructions', e.target.value)}
            rows={4}
          />
        </div>
      </div>

      {/* ── Global error ── */}
      {error && (
        <div
          className="toast-error"
          style={{
            padding: '14px 20px',
            borderRadius: 'var(--radius-md)',
            marginBottom: 16,
            fontSize: 14,
          }}
        >
          ⚠ {error}
        </div>
      )}

      {/* ── Actions ── */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            resetForm();
            setErrors({});
          }}
        >
          Reset
        </button>
        <button
          type="submit"
          className="btn btn-primary btn-lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span
                className="loading-spinner"
                style={{ width: 18, height: 18, borderWidth: 2 }}
              />
              Generating...
            </>
          ) : (
            <>✨ Generate Question Paper</>
          )}
        </button>
      </div>
    </form>
  );
}
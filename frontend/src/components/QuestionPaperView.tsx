'use client';

import React from 'react';
import { QuestionPaper } from '@/types';

interface Props {
  paper: QuestionPaper;
  paperRef?: React.RefObject<HTMLDivElement | null>;
}

export default function QuestionPaperView({ paper, paperRef }: Props) {
  const getDifficultyClass = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'easy';
      case 'medium':
        return 'medium';
      case 'hard':
        return 'hard';
      default:
        return 'medium';
    }
  };

  const sanitizeQuestionText = (text?: string) => {
    if (!text) return '';
    // remove patterns like "(2 Marks)", "[2 Marks]", "(2 Mark)", case-insensitive
    return text.replace(/[\[\(]\s*\d+\s*Marks?\s*[\]\)]/gi, '').trim();
  };

  return (
    <div className="question-paper slide-up" ref={paperRef}>
      {/* Paper Header */}
      <div className="paper-header">
        <div className="paper-institution">Assessment Paper</div>
        <h1 className="paper-title">{paper.title}</h1>
        <div className="paper-subject">{paper.subject}</div>
        <div className="paper-meta">
          <div className="paper-meta-item">
            🕐 <strong>Duration:</strong> {paper.duration}
          </div>
          <div className="paper-meta-item">
            📊 <strong>Total Marks:</strong> {paper.totalMarks}
          </div>
          <div className="paper-meta-item">
            📝 <strong>Questions:</strong>{' '}
            {paper.sections.reduce((acc, s) => acc + s.questions.length, 0)}
          </div>
        </div>
      </div>

      {/* Student Info Section */}
      <div className="student-info">
        <div className="student-field">
          <label className="student-field-label">Student Name</label>
          <input
            type="text"
            className="student-field-input"
            placeholder="Enter your full name"
          />
        </div>
        <div className="student-field">
          <label className="student-field-label">Roll Number</label>
          <input
            type="text"
            className="student-field-input"
            placeholder="Enter roll number"
          />
        </div>
        <div className="student-field">
          <label className="student-field-label">Section</label>
          <input
            type="text"
            className="student-field-input"
            placeholder="Enter section"
          />
        </div>
      </div>

      {/* General Instructions */}
      {paper.generalInstructions && paper.generalInstructions.length > 0 && (
        <div className="paper-instructions">
          <div className="paper-instructions-title">📋 General Instructions</div>
          <ul className="paper-instructions-list">
            {paper.generalInstructions.map((instruction, idx) => (
              <li key={idx}>{instruction}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Sections */}
      {paper.sections.map((section, sIdx) => (
        <div key={sIdx} className="paper-section">
          <div className="section-header">
            <div>
              <h2 className="section-name">{section.name}</h2>
              <div className="section-subtitle">{section.title}</div>
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>
              {section.questions.reduce((acc, q) => acc + q.marks, 0)} Marks
            </div>
          </div>

          {section.instructions && (
            <div className="section-instructions">{section.instructions}</div>
          )}

          {section.questions.map((question, qIdx) => (
            <div
              key={qIdx}
              className="question-item"
              style={{ animationDelay: `${qIdx * 0.05}s` }}
            >
              <div className="question-header">
                <div style={{ display: 'flex', alignItems: 'flex-start', flex: 1 }}>
                  <span className="question-number">Q{question.number}.</span>
                  <span className="question-text">{sanitizeQuestionText(question.text)}</span>
                </div>
                <div className="question-meta">
                  <span
                    className={`question-difficulty-paper ${getDifficultyClass(
                      question.difficulty
                    )}`}
                  >
                    {question.difficulty}
                  </span>
                </div>
              </div>

              {/* MCQ Options */}
              {question.options && question.options.length > 0 && (
                <div className="question-options">
                  {question.options.map((option, oIdx) => (
                    <div key={oIdx} className="option-item">
                      <span className="option-label">
                        {String.fromCharCode(65 + oIdx)}
                      </span>
                      {option}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      {/* Footer */}
      <div
        style={{
          padding: '24px 40px',
          borderTop: '2px solid #e5e7eb',
          textAlign: 'center',
          background: '#f8f9fc',
        }}
      >
        <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>
            End of Question Paper
        </div>
        <div style={{ fontSize: 11, color: '#d1d5db', marginTop: 4 }}>
          Generated by VedaAI Assessment Creator
        </div>
      </div>
    </div>
  );
}

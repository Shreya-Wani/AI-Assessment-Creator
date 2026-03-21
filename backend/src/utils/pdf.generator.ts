import PDFDocument from 'pdfkit';
import { Response } from 'express';

// Generate a clean, printable PDF without difficulty labels (only question text and marks).
export const generatePdf = (assignment: any, res: Response, user?: any) => {
  const doc = new PDFDocument({ margin: 64, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${(assignment.title || 'Assessment').replace(/[^a-z0-9\- ]/gi, '')}.pdf"`);
  doc.pipe(res);

  const pageBottomPadding = 72;
  const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const ensureSpace = (minSpace: number) => {
    if (doc.y + minSpace > doc.page.height - pageBottomPadding) {
      doc.addPage();
    }
  };

  // Header
  const school = (user && (user.schoolName || user.name)) || assignment.schoolName || '';
  if (school) {
    doc.font('Helvetica-Bold').fontSize(24).fillColor('#111').text(school, { align: 'center' });
    doc.moveDown(0.25);
  }

  if (assignment.title) {
    doc.font('Helvetica').fontSize(12).fillColor('#334155').text(assignment.title, { align: 'center' });
    doc.moveDown(0.5);
  }

  const subject = assignment.result?.subject || assignment.subject || '';
  const grade = assignment.result?.grade || assignment.grade || '';
  const duration = assignment.result?.duration || assignment.duration || '';
  const totalMarks = assignment.result?.totalMarks || assignment.totalMarks || '';
  const examDateRaw = assignment.result?.examDate || assignment.examDate || '';
  let examDateFormatted = '';
  try {
    if (examDateRaw) examDateFormatted = new Date(examDateRaw).toLocaleString();
  } catch {}

  // Sub header (centered)
  doc.font('Helvetica-Bold').fontSize(14).fillColor('#111').text(subject ? `Subject: ${subject}` : '', { align: 'center' });
  if (grade) doc.font('Helvetica-Bold').fontSize(13).text(`Class: ${grade}`, { align: 'center' });
  doc.moveDown(0.8);

  // Metadata row
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#1f2937');
  const left = `Time Allowed: ${duration || '—'}`;
  const right = `Maximum Marks: ${totalMarks || '—'}`;
  doc.text(left, { align: 'left' });
  doc.text(right, { align: 'right' });
  doc.moveDown(0.45);

  if (examDateFormatted) {
    doc.font('Helvetica').fontSize(10).fillColor('#475569').text(`Exam Date: ${examDateFormatted}`, { align: 'left' });
    doc.moveDown(0.4);
  }

  // Divider
  doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).strokeColor('#CBD5E1').lineWidth(1).stroke();
  doc.moveDown(0.8);

  // Student info lines
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#1f2937').text('All questions are compulsory unless stated otherwise.');
  doc.moveDown(0.8);
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827').text('Name: _________________________');
  doc.moveDown(0.25);
  doc.text('Roll Number: ___________________');
  doc.moveDown(0.25);
  doc.text(`Class: ${grade || '______'}    Section: ___________`);
  doc.moveDown(0.9);

  // Iterate sections and questions. Only include question text and marks (no difficulty labels).
  assignment.result.sections.forEach((section: any, sIdx: number) => {
    ensureSpace(120);
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#0f172a').text(section.title, { align: 'center' });
    doc.moveDown(0.55);
    if (section.instructions) {
      doc.font('Helvetica-Oblique').fontSize(11).fillColor('#475569').text(section.instructions, { lineGap: 2 });
      doc.moveDown(0.45);
    }

    section.questions.forEach((q: any, i: number) => {
      ensureSpace(70);
      // Sanitize question text: remove any embedded difficulty words or bracketed difficulty markers
      let text = String(q.question || q.text || '').replace(/[\[\(]\s*\d+\s*Marks?\s*[\)\]]/gi, '').trim();
      // Remove trailing difficulty tokens like ' - easy' or '(easy)'
      text = text.replace(/\s*[-—–:]?\s*(easy|medium|hard)\s*$/i, '').trim();

      const marks = q.marks || q.mark || '';
      doc.font('Helvetica').fontSize(12).fillColor('#111827').text(`${i + 1}. ${text}`, { width: contentWidth, lineGap: 3, continued: true });
      if (marks !== '') {
        doc.font('Helvetica-Bold').text(`  [${marks} Marks]`);
      } else {
        doc.text('');
      }
      doc.moveDown(0.35);

      // If options exist, print them on separate indented lines
      if (Array.isArray(q.options) && q.options.length > 0) {
        q.options.forEach((opt: string, oi: number) => {
          ensureSpace(26);
          doc.font('Helvetica').fontSize(11).fillColor('#1f2937').text(`   ${String.fromCharCode(65 + oi)}. ${opt}`, { indent: 18, lineGap: 2 });
          doc.moveDown(0.18);
        });
      }

      doc.moveDown(0.42);
    });

    doc.moveDown(0.5);
  });

  ensureSpace(40);
  doc.moveDown(0.4);
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#666').text('── End of Question Paper ──', { align: 'center' });

  doc.end();
};

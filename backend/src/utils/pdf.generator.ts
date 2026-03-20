import PDFDocument from 'pdfkit';
import { Response } from 'express';

// Generate a clean, printable PDF without difficulty labels (only question text and marks).
export const generatePdf = (assignment: any, res: Response, user?: any) => {
  const doc = new PDFDocument({ margin: 56, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${(assignment.title || 'Assessment').replace(/[^a-z0-9\- ]/gi, '')}.pdf"`);
  doc.pipe(res);

  // Header
  doc.font('Helvetica-Bold').fontSize(20).text(assignment.title || 'Assessment Paper', { align: 'center' });
  doc.moveDown(0.3);

  const school = (user && (user.schoolName || user.name)) || assignment.schoolName || '';
  if (school) {
    doc.font('Helvetica').fontSize(12).fillColor('#111').text(school, { align: 'center' });
    doc.moveDown(0.2);
  }

  const subject = assignment.result?.subject || assignment.subject || '';
  const grade = assignment.result?.grade || assignment.grade || '';
  const duration = assignment.result?.duration || assignment.duration || '';
  const totalMarks = assignment.result?.totalMarks || assignment.totalMarks || '';

  // Sub header (centered)
  doc.font('Helvetica-Bold').fontSize(12).text(subject ? `${subject}` : '', { align: 'center' });
  if (grade) doc.font('Helvetica').fontSize(11).text(`Class: ${grade}`, { align: 'center' });
  doc.moveDown(0.5);

  // Metadata row
  doc.font('Helvetica').fontSize(10).fillColor('#444');
  const left = `Time Allowed: ${duration || '—'}`;
  const right = `Maximum Marks: ${totalMarks || '—'}`;
  doc.text(left, { align: 'left' });
  doc.text(right, { align: 'right' });
  doc.moveDown(0.8);

  // Student info lines
  doc.moveDown(0.4);
  const lineY = doc.y;
  doc.font('Helvetica').fontSize(11).fillColor('#000').text('Name: _________________________', { continued: true });
  doc.text('   ', { continued: true });
  doc.text('Roll Number: ___________________', { align: 'right' });
  doc.moveDown(0.6);

  // Iterate sections and questions. Only include question text and marks (no difficulty labels).
  assignment.result.sections.forEach((section: any, sIdx: number) => {
    doc.moveDown(0.4);
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#111').text(section.title);
    doc.moveDown(0.2);
    if (section.instructions) {
      doc.font('Helvetica-Oblique').fontSize(10).fillColor('#333').text(section.instructions);
      doc.moveDown(0.3);
    }

    section.questions.forEach((q: any, i: number) => {
      // Sanitize question text: remove any embedded difficulty words or bracketed difficulty markers
      let text = String(q.question || q.text || '').replace(/[\[\(]\s*\d+\s*Marks?\s*[\)\]]/gi, '').trim();
      // Remove trailing difficulty tokens like ' - easy' or '(easy)'
      text = text.replace(/\s*[-—–:]?\s*(easy|medium|hard)\s*$/i, '').trim();

      const marks = q.marks || q.mark || '';
      doc.font('Helvetica').fontSize(11).fillColor('#000').text(`${i + 1}. ${text}`, { continued: true });
      if (marks !== '') {
        doc.text(`  [${marks} Marks]`);
      } else {
        doc.text('');
      }
      doc.moveDown(0.15);

      // If options exist, print them on separate indented lines
      if (Array.isArray(q.options) && q.options.length > 0) {
        q.options.forEach((opt: string, oi: number) => {
          doc.font('Helvetica').fontSize(11).fillColor('#111').text(`   ${String.fromCharCode(65 + oi)}. ${opt}`, { indent: 16 });
          doc.moveDown(0.05);
        });
      }

      doc.moveDown(0.2);
      // Page break if near bottom
      if (doc.y > doc.page.height - 100) doc.addPage();
    });

    doc.moveDown(0.6);
  });

  doc.moveDown(0.6);
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#666').text('── End of Question Paper ──', { align: 'center' });

  doc.end();
};

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const cvParser = require('./cvParser');

async function exportToPdf(cvText, jobTitle = 'CV') {
  const EXPORT_DIR = path.join(__dirname, '..', 'exports');
  if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });
  
  const parsedCV = cvParser.parseCV(cvText);
  const filename = `CV_${jobTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}.pdf`;
  const filepath = path.join(EXPORT_DIR, filename);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filepath);
    stream.on('finish', resolve);
    stream.on('error', reject);
    doc.pipe(stream);

    // NAME
    if (parsedCV.header.name) {
      doc.fontSize(20).font('Helvetica-Bold').text(parsedCV.header.name);
      doc.moveDown(0.3);
    }

    // CONTACT
    const contact = [parsedCV.header.location, parsedCV.header.phone, parsedCV.header.email].filter(Boolean);
    if (contact.length > 0) {
      doc.fontSize(10).font('Helvetica').text(contact.join(' | '));
      doc.moveDown(1.5);
    }

    // PROFILE
    if (parsedCV.summary) {
      doc.fontSize(14).font('Helvetica-Bold').text('PROFILE');
      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica').text(parsedCV.summary, { align: 'justify' });
      doc.moveDown(1);
    }

    // KEY SKILLS
    if (parsedCV.skills.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('KEY SKILLS');
      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica').text(parsedCV.skills.join(' · '));
      doc.moveDown(1);
    }

    // PROFESSIONAL EXPERIENCE
    if (parsedCV.experience.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('PROFESSIONAL EXPERIENCE');
      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
      doc.moveDown(0.5);
      
      parsedCV.experience.forEach(exp => {
        const titleLine = [exp.title, exp.company].filter(Boolean).join(' | ');
        if (titleLine) {
          doc.fontSize(11).font('Helvetica-Bold').text(titleLine);
        }
        
        const dateLine = [exp.location, exp.startDate, exp.endDate].filter(Boolean).join(' · ');
        if (dateLine) {
          doc.fontSize(10).font('Helvetica-Oblique').text(dateLine);
          doc.moveDown(0.3);
        }
        
        exp.bullets.forEach(bullet => {
          doc.fontSize(10).font('Helvetica').text(`• ${bullet}`, { indent: 20 });
        });
        
        doc.moveDown(0.5);
      });
    }

    // EDUCATION
    if (parsedCV.education.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('EDUCATION');
      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
      doc.moveDown(0.5);
      
      parsedCV.education.forEach(edu => {
        const line1 = [edu.degree, edu.institution].filter(Boolean).join(' | ');
        if (line1) {
          doc.fontSize(11).font('Helvetica-Bold').text(line1);
        }
        
        const line2 = [edu.location, edu.year].filter(Boolean).join(' · ');
        if (line2) {
          doc.fontSize(10).font('Helvetica').text(line2);
        }
        
        doc.moveDown(0.5);
      });
    }

    doc.end();
  });

  logger.info(`✅ PDF: ${filename}`);
  return { filename, filepath, downloadUrl: `/exports/${filename}` };
}

module.exports = { exportToPdf };
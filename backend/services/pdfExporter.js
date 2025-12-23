const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const cvParser = require('./cvParser');

const EXPORT_DIR = process.env.EXPORT_DIRECTORY || path.join(__dirname, '..', 'exports');

function safeFileName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

function toTitleCase(str) {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

async function exportToPdf(cvText, jobTitle = 'CV') {
  if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });
  
  const parsedCV = cvParser.parseCV(cvText);
  
  // Fix capitalization
  if (parsedCV.header) {
    if (parsedCV.header.name) parsedCV.header.name = toTitleCase(parsedCV.header.name);
    if (parsedCV.header.location) parsedCV.header.location = toTitleCase(parsedCV.header.location);
  }
  
  const ts = Date.now();
  const baseName = safeFileName(jobTitle || 'cv');
  const filename = `CV_${baseName}_${ts}.pdf`;
  const filepath = path.join(EXPORT_DIR, filename);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filepath);
    stream.on('finish', resolve);
    stream.on('error', reject);
    doc.pipe(stream);

    // NAME
    if (parsedCV.header && parsedCV.header.name) {
      doc.fontSize(20).font('Helvetica-Bold').text(parsedCV.header.name);
      doc.moveDown(0.3);

      // CONTACT
      const contact = [];
      if (parsedCV.header.location) contact.push(parsedCV.header.location);
      if (parsedCV.header.phone) contact.push(parsedCV.header.phone);
      if (parsedCV.header.email) contact.push(parsedCV.header.email);
      if (contact.length) {
        doc.fontSize(10).font('Helvetica').text(contact.join(' | '));
      }
      doc.moveDown(1.2);
    }

    const addSection = (title) => {
      doc.fontSize(14).font('Helvetica-Bold').text(title.toUpperCase());
      doc.moveTo(doc.x, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
      doc.moveDown(0.4);
    };

    // PROFILE
    if (parsedCV.summary) {
      addSection('Profile');
      doc.fontSize(11).font('Helvetica').text(parsedCV.summary, { align: 'justify' });
      doc.moveDown(1);
    }

    // SKILLS
    if (parsedCV.skills && parsedCV.skills.length) {
      addSection('Key Skills');
      doc.fontSize(11).font('Helvetica').text(parsedCV.skills.join(' · '));
      doc.moveDown(1);
    }

    // EXPERIENCE
    if (parsedCV.experience && parsedCV.experience.length) {
      addSection('Professional Experience');
      parsedCV.experience.forEach(exp => {
        doc.fontSize(11).font('Helvetica-Bold').text(`${exp.title || 'Position'} | ${exp.company || 'Company'}`);
        doc.fontSize(10).font('Helvetica-Oblique').text(`${exp.startDate || ''} - ${exp.endDate || 'Present'}`);
        doc.moveDown(0.3);
        if (exp.bullets && exp.bullets.length) {
          exp.bullets.forEach(bullet => {
            doc.fontSize(10).font('Helvetica').text(`• ${bullet}`, { indent: 20, align: 'left' });
          });
        }
        doc.moveDown(0.5);
      });
    }

    // EDUCATION
    if (parsedCV.education && parsedCV.education.length) {
      addSection('Education');
      parsedCV.education.forEach(edu => {
        doc.fontSize(11).font('Helvetica-Bold').text(edu.degree || 'Degree');
        doc.fontSize(10).font('Helvetica').text(edu.institution || 'Institution');
        if (edu.year) doc.fontSize(9).font('Helvetica-Oblique').text(edu.year);
        doc.moveDown(0.5);
      });
    }

    doc.end();
  });

  logger.info(`✅ PDF exported: ${filename}`);
  return { filename, filepath, downloadUrl: `/exports/${filename}` };
}

module.exports = { exportToPdf };
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const EXPORT_DIR = process.env.EXPORT_DIRECTORY || path.join(__dirname, '..', 'exports');

function safeFileName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

async function exportToPdf(cvText, jobTitle = 'CV') {
  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
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

    doc.fontSize(14).text(jobTitle, { align: 'center' });
    doc.moveDown();
    doc.fontSize(11).text(cvText, { align: 'left' });

    doc.end();
  });

  logger.info(`📄 PDF exported successfully: ${filename}`);

  return { filename, filepath };
}

module.exports = { exportToPdf };
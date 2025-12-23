const { Document, Packer, Paragraph, TextRun } = require('docx');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const cvParser = require('./cvParser');

class DocxExporter {
  constructor() {
    this.outputDir = path.join(__dirname, '../exports');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async exportToDocx(cvText, jobTitle = 'CV', options = {}) {
    try {
      logger.info(`📄 Exporting CV to DOCX: ${jobTitle}`);
      const parsedCV = cvParser.parseCV(cvText);
      const children = [];

      // NAME (20pt, bold)
      if (parsedCV.header.name) {
        children.push(new Paragraph({
          children: [new TextRun({ text: parsedCV.header.name, bold: true, size: 40 })],
          spacing: { after: 120 }
        }));
      }

      // CONTACT (11pt, single line)
      const contact = [
        parsedCV.header.location,
        parsedCV.header.phone,
        parsedCV.header.email
      ].filter(Boolean);
      
      if (contact.length > 0) {
        children.push(new Paragraph({
          children: [new TextRun({ text: contact.join(' | '), size: 22 })],
          spacing: { after: 240 }
        }));
      }

      // Sections
      if (parsedCV.summary) {
        this.addSection(children, 'PROFILE', parsedCV.summary);
      }

      if (parsedCV.skills.length > 0) {
        this.addSection(children, 'KEY SKILLS', parsedCV.skills.join(' · '));
      }

      if (parsedCV.experience.length > 0) {
        this.addSectionHeader(children, 'PROFESSIONAL EXPERIENCE');
        parsedCV.experience.forEach((exp, i) => {
          const titleLine = [exp.title, exp.company].filter(Boolean).join(' | ');
          const dateLine = [exp.location, exp.startDate, exp.endDate].filter(Boolean).join(' · ');
          
          if (titleLine) {
            children.push(new Paragraph({
              children: [new TextRun({ text: titleLine, bold: true, size: 22 })],
              spacing: { before: i === 0 ? 200 : 260, after: 40 }
            }));
          }
          
          if (dateLine) {
            children.push(new Paragraph({
              children: [new TextRun({ text: dateLine, italics: true, size: 22 })],
              spacing: { after: 80 }
            }));
          }

          exp.bullets.forEach(bullet => {
            children.push(new Paragraph({
              text: bullet,
              bullet: { level: 0 },
              spacing: { after: 80 },
              children: [new TextRun({ text: bullet, size: 22 })]
            }));
          });
        });
      }

      if (parsedCV.education.length > 0) {
        this.addSectionHeader(children, 'EDUCATION');
        parsedCV.education.forEach((edu, i) => {
          const line1 = [edu.degree, edu.institution].filter(Boolean).join(' | ');
          const line2 = [edu.location, edu.year].filter(Boolean).join(' · ');
          
          if (line1) {
            children.push(new Paragraph({
              children: [new TextRun({ text: line1, bold: true, size: 22 })],
              spacing: { before: i === 0 ? 200 : 260, after: 40 }
            }));
          }
          
          if (line2) {
            children.push(new Paragraph({
              children: [new TextRun({ text: line2, size: 22 })],
              spacing: { after: 120 }
            }));
          }
        });
      }

      const doc = new Document({
        sections: [{
          properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
          children
        }]
      });

      const filename = `CV_${jobTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}.docx`;
      const filepath = path.join(this.outputDir, filename);
      const buffer = await Packer.toBuffer(doc);
      fs.writeFileSync(filepath, buffer);
      
      logger.info(`✅ DOCX: ${filename}`);
      return { success: true, filename, filepath, downloadUrl: `/exports/${filename}` };
    } catch (error) {
      logger.error('❌ DOCX failed:', error);
      throw error;
    }
  }

  addSectionHeader(children, title) {
    children.push(new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 28, underline: {} })],
      spacing: { before: 360, after: 180 }
    }));
  }

  addSection(children, title, content) {
    this.addSectionHeader(children, title);
    children.push(new Paragraph({
      children: [new TextRun({ text: content, size: 22 })],
      spacing: { after: 240 }
    }));
  }
}

module.exports = new DocxExporter();
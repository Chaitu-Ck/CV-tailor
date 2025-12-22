/**
 * DOCX Exporter Service
 * Generates professional DOCX files from CV data
 * Uses docx library for proper formatting and styling
 */

const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, convertInchesToTwip } = require('docx');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const cvParser = require('./cvParser');

class DocxExporter {
  constructor() {
    this.outputDir = path.join(__dirname, '../exports');
    // Create exports directory if it doesn't exist
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Export CV to DOCX format
   */
  async exportToDocx(cvText, jobTitle = 'CV', options = {}) {
    try {
      logger.info(`📄 Exporting CV to DOCX format: ${jobTitle}`);

      const parsedCV = cvParser.parseCV(cvText);
      const sections = [];

      // 1. Header Section
      sections.push(...this.createHeaderSection(parsedCV.header));

      // 2. Professional Summary
      if (parsedCV.summary) {
        sections.push(...this.createSectionHeader('PROFESSIONAL SUMMARY'));
        sections.push(new Paragraph({
          text: parsedCV.summary,
          spacing: { line: 240, lineRule: 'auto' },
          indent: { left: 360 }
        }));
        sections.push(new Paragraph(''));
      }

      // 3. Core Competencies
      if (parsedCV.skills && parsedCV.skills.length > 0) {
        sections.push(...this.createSectionHeader('CORE COMPETENCIES'));
        sections.push(this.createSkillsSection(parsedCV.skills));
        sections.push(new Paragraph(''));
      }

      // 4. Professional Experience
      if (parsedCV.experience && parsedCV.experience.length > 0) {
        sections.push(...this.createSectionHeader('PROFESSIONAL EXPERIENCE'));
        sections.push(...this.createExperienceSection(parsedCV.experience));
        sections.push(new Paragraph(''));
      }

      // 5. Education
      if (parsedCV.education && parsedCV.education.length > 0) {
        sections.push(...this.createSectionHeader('EDUCATION'));
        sections.push(...this.createEducationSection(parsedCV.education));
        sections.push(new Paragraph(''));
      }

      // 6. Certifications
      if (parsedCV.certifications && parsedCV.certifications.length > 0) {
        sections.push(...this.createSectionHeader('CERTIFICATIONS'));
        sections.push(...this.createCertificationsSection(parsedCV.certifications));
        sections.push(new Paragraph(''));
      }

      // 7. Projects
      if (parsedCV.projects && parsedCV.projects.length > 0) {
        sections.push(...this.createSectionHeader('PROJECTS'));
        sections.push(...this.createProjectsSection(parsedCV.projects));
      }

      // Create document
      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margins: {
                  top: convertInchesToTwip(0.5),
                  right: convertInchesToTwip(0.5),
                  bottom: convertInchesToTwip(0.5),
                  left: convertInchesToTwip(0.5)
                }
              }
            },
            children: sections
          }
        ]
      });

      // Generate filename
      const timestamp = Date.now();
      const safeName = jobTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `CV_${safeName}_${timestamp}.docx`;
      const filepath = path.join(this.outputDir, filename);

      // Save document
      const buffer = await Packer.toBuffer(doc);
      fs.writeFileSync(filepath, buffer);

      logger.info(`✅ DOCX exported successfully: ${filename}`);

      return {
        success: true,
        filename,
        filepath,
        size: buffer.length,
        downloadUrl: `/exports/${filename}`
      };
    } catch (error) {
      logger.error('❌ DOCX export failed:', error);
      throw error;
    }
  }

  /**
   * Create header section with name and contact info
   */
  createHeaderSection(header) {
    const sections = [];

    if (header && header.name) {
      // Name
      sections.push(new Paragraph({
        text: header.name.toUpperCase(),
        bold: true,
        size: 28,
        spacing: { after: 100 }
      }));

      // Contact info
      const contactParts = [];
      if (header.location) contactParts.push(header.location);
      if (header.phone) contactParts.push(header.phone);
      if (header.email) contactParts.push(header.email);
      if (header.linkedin) contactParts.push(header.linkedin);

      if (contactParts.length > 0) {
        sections.push(new Paragraph({
          text: contactParts.join(' | '),
          size: 20,
          spacing: { after: 200 }
        }));
      }
    }

    return sections;
  }

  /**
   * Create section header
   */
  createSectionHeader(title) {
    return [
      new Paragraph({
        text: title,
        bold: true,
        size: 24,
        spacing: { before: 200, after: 100 },
        border: {
          bottom: {
            color: '2980B9',
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6
          }
        }
      })
    ];
  }

  /**
   * Create skills section
   */
  createSkillsSection(skills) {
    const skillText = skills.slice(0, 20).join(' • ');
    return new Paragraph({
      text: skillText,
      spacing: { line: 240 },
      indent: { left: 360 }
    });
  }

  /**
   * Create experience section
   */
  createExperienceSection(experiences) {
    const sections = [];

    for (const exp of experiences) {
      // Job title and company
      sections.push(new Paragraph({
        text: `${exp.title || 'Position'} | ${exp.company || 'Company'}`,
        bold: true,
        spacing: { before: 100, after: 50 }
      }));

      // Dates
      if (exp.startDate || exp.endDate) {
        sections.push(new Paragraph({
          text: `${exp.startDate || 'Start'} - ${exp.endDate || 'Present'}`,
          italics: true,
          spacing: { after: 100 }
        }));
      }

      // Bullets
      if (exp.bullets && exp.bullets.length > 0) {
        for (const bullet of exp.bullets) {
          sections.push(new Paragraph({
            text: bullet,
            spacing: { after: 80, line: 240 },
            indent: { left: 360 },
            bullet: {
              level: 0
            }
          }));
        }
      }

      sections.push(new Paragraph(''));
    }

    return sections;
  }

  /**
   * Create education section
   */
  createEducationSection(education) {
    const sections = [];

    for (const edu of education) {
      sections.push(new Paragraph({
        text: `${edu.degree || 'Degree'} | ${edu.institution || 'Institution'}`,
        bold: true,
        spacing: { after: 50 }
      }));

      if (edu.year) {
        sections.push(new Paragraph({
          text: `Year: ${edu.year}`,
          spacing: { after: 100 }
        }));
      }
    }

    return sections;
  }

  /**
   * Create certifications section
   */
  createCertificationsSection(certifications) {
    const sections = [];

    for (const cert of certifications.slice(0, 15)) {
      sections.push(new Paragraph({
        text: cert,
        spacing: { after: 60, line: 240 },
        indent: { left: 360 },
        bullet: {
          level: 0
        }
      }));
    }

    return sections;
  }

  /**
   * Create projects section
   */
  createProjectsSection(projects) {
    const sections = [];

    for (const project of projects.slice(0, 10)) {
      sections.push(new Paragraph({
        text: project,
        spacing: { after: 60, line: 240 },
        indent: { left: 360 },
        bullet: {
          level: 0
        }
      }));
    }

    return sections;
  }

  /**
   * Clean up old exported files (older than 24 hours)
   */
  cleanupOldFiles() {
    try {
      const files = fs.readdirSync(this.outputDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      for (const file of files) {
        const filepath = path.join(this.outputDir, file);
        const stats = fs.statSync(filepath);
        const age = now - stats.mtimeMs;

        if (age > maxAge) {
          fs.unlinkSync(filepath);
          logger.info(`🗑 Cleaned up old export: ${file}`);
        }
      }
    } catch (error) {
      logger.error('Error cleaning up old files:', error);
    }
  }

  /**
   * Get export file path
   */
  getExportPath(filename) {
    return path.join(this.outputDir, filename);
  }
}

module.exports = new DocxExporter();

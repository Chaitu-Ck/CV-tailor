const { Document, Packer, Paragraph, TextRun, AlignmentType } = require('docx');
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
      
      // Fix parsed data - ensure proper capitalization
      if (parsedCV.header) {
        if (parsedCV.header.name) parsedCV.header.name = this.toTitleCase(parsedCV.header.name);
        if (parsedCV.header.location) parsedCV.header.location = this.toTitleCase(parsedCV.header.location);
      }
      
      const docxPath = await this.createProfessionalDocx(parsedCV, { title: jobTitle, _id: Date.now() });
      const filename = path.basename(docxPath);
      
      return {
        success: true,
        filename,
        filepath: docxPath,
        size: fs.statSync(docxPath).size,
        downloadUrl: `/exports/${filename}`
      };
    } catch (error) {
      logger.error('❌ DOCX export failed:', error);
      throw error;
    }
  }

  toTitleCase(str) {
    if (!str) return str;
    return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }

  async createProfessionalDocx(cv, job) {
    const children = [];
    const nameFontSize = 40; // 20pt
    const contactFontSize = 22; // 11pt
    const sectionHeaderSize = 28; // 14pt
    const bodyFontSize = 22; // 11pt

    // ========== NAME (Large, Bold) ==========
    if (cv.header && cv.header.name) {
      children.push(
        new Paragraph({
          text: cv.header.name,
          spacing: { after: 120 },
          style: {
            paragraph: {
              spacing: { after: 120 }
            },
            run: {
              bold: true,
              size: nameFontSize
            }
          }
        })
      );
    }

    // ========== CONTACT INFO (Single Line with |) ==========
    if (cv.header) {
      const contactParts = [];
      if (cv.header.location) contactParts.push(cv.header.location);
      if (cv.header.phone) contactParts.push(cv.header.phone);
      if (cv.header.email) contactParts.push(cv.header.email);
      if (cv.header.linkedin) contactParts.push(cv.header.linkedin);
      
      if (contactParts.length > 0) {
        children.push(
          new Paragraph({
            text: contactParts.join(" | "),
            spacing: { after: 240 },
            style: {
              run: { size: contactFontSize }
            }
          })
        );
      }
    }

    // ========== HELPER: Add Section Header ==========
    const addSectionHeader = (title) => {
      children.push(
        new Paragraph({
          text: title.toUpperCase(),
          spacing: { before: 360, after: 180 },
          style: {
            run: {
              bold: true,
              size: sectionHeaderSize,
              underline: {}
            }
          }
        })
      );
    };

    // ========== HELPER: Add Bullet ==========
    const addBullet = (text) => {
      children.push(
        new Paragraph({
          text: text,
          bullet: { level: 0 },
          spacing: { after: 80 },
          style: {
            run: { size: bodyFontSize }
          }
        })
      );
    };

    // ========== PROFILE / SUMMARY ==========
    if (cv.summary && cv.summary.trim()) {
      addSectionHeader("Profile");
      children.push(
        new Paragraph({
          text: cv.summary.trim(),
          spacing: { after: 240 },
          style: {
            run: { size: bodyFontSize }
          }
        })
      );
    }

    // ========== KEY SKILLS ==========
    if (cv.skills && cv.skills.length > 0) {
      addSectionHeader("Key Skills");
      children.push(
        new Paragraph({
          text: cv.skills.join(" · "),
          spacing: { after: 240 },
          style: {
            run: { size: bodyFontSize }
          }
        })
      );
    }

    // ========== PROFESSIONAL EXPERIENCE ==========
    if (cv.experience && cv.experience.length > 0) {
      addSectionHeader("Professional Experience");
      
      cv.experience.forEach((exp, idx) => {
        // Company | Title
        const titleLine = [exp.title || "Role", exp.company || ""].filter(Boolean).join(" | ");
        if (titleLine) {
          children.push(
            new Paragraph({
              text: titleLine,
              spacing: { before: idx === 0 ? 200 : 260, after: 40 },
              style: {
                run: {
                  bold: true,
                  size: bodyFontSize
                }
              }
            })
          );
        }

        // Location · Dates
        const dateLine = [
          exp.location || "",
          (exp.startDate || "").trim(),
          (exp.endDate || "Present").trim()
        ].filter(Boolean).join(" · ");
        
        if (dateLine) {
          children.push(
            new Paragraph({
              text: dateLine,
              spacing: { after: 80 },
              style: {
                run: {
                  italics: true,
                  size: bodyFontSize
                }
              }
            })
          );
        }

        // Bullets
        if (exp.bullets && exp.bullets.length > 0) {
          exp.bullets.slice(0, 6).forEach(bullet => addBullet(bullet));
        }
      });
    }

    // ========== EDUCATION ==========
    if (cv.education && cv.education.length > 0) {
      addSectionHeader("Education");
      
      cv.education.forEach((edu, idx) => {
        const line1 = [edu.degree || "", edu.institution || ""].filter(Boolean).join(" | ");
        if (line1) {
          children.push(
            new Paragraph({
              text: line1,
              spacing: { before: idx === 0 ? 200 : 260, after: 40 },
              style: {
                run: {
                  bold: true,
                  size: bodyFontSize
                }
              }
            })
          );
        }

        const line2 = [edu.location || "", edu.year || ""].filter(Boolean).join(" · ");
        if (line2) {
          children.push(
            new Paragraph({
              text: line2,
              spacing: { after: 120 },
              style: {
                run: { size: bodyFontSize }
              }
            })
          );
        }
      });
    }

    // ========== CERTIFICATIONS ==========
    if (cv.certifications && cv.certifications.length > 0) {
      addSectionHeader("Certifications");
      cv.certifications.forEach(cert => addBullet(cert));
    }

    // ========== PROJECTS ==========
    if (cv.projects && cv.projects.length > 0) {
      addSectionHeader("Projects");
      cv.projects.forEach(proj => addBullet(proj));
    }

    // ========== CREATE DOCUMENT ==========
    const doc = new Document({
      creator: "CV Tailor System",
      title: `CV - ${job.title}`,
      sections: [{
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 }
          }
        },
        children: children
      }]
    });

    const fileName = `CV_${job.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}.docx`;
    const filePath = path.join(this.outputDir, fileName);
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(filePath, buffer);
    logger.info(`✅ DOCX generated: ${filePath}`);
    return filePath;
  }

  cleanupOldFiles() {
    try {
      const files = fs.readdirSync(this.outputDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000;
      files.forEach(file => {
        const filepath = path.join(this.outputDir, file);
        const stats = fs.statSync(filepath);
        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filepath);
          logger.info(`🗑 Cleaned: ${file}`);
        }
      });
    } catch (error) {
      logger.error('Cleanup error:', error);
    }
  }
}

module.exports = new DocxExporter();
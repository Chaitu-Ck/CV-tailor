const { Document, Paragraph, TextRun, AlignmentType } = require('docx');

/**
 * Minimal ATS-Friendly Template
 * Clean, simple format optimized for ATS systems
 * No fancy formatting - just clear structure for maximum compatibility
 */
module.exports = {
  build(parsedCV, jobTitle = 'CV') {
    const sections = [];
    
    // Header with name
    if (parsedCV.header && parsedCV.header.name) {
      sections.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: parsedCV.header.name.toUpperCase(),
              bold: true,
              size: 32,
            }),
          ],
          spacing: { after: 100 },
        })
      );

      // Contact info
      const contactParts = [];
      if (parsedCV.header.email) contactParts.push(parsedCV.header.email);
      if (parsedCV.header.phone) contactParts.push(parsedCV.header.phone);
      if (parsedCV.header.location) contactParts.push(parsedCV.header.location);
      
      if (contactParts.length > 0) {
        sections.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: contactParts.join(' | '),
                size: 20,
              }),
            ],
            spacing: { after: 200 },
          })
        );
      }
    }

    // Professional Summary
    if (parsedCV.summary) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'PROFESSIONAL SUMMARY',
              bold: true,
              size: 24,
            }),
          ],
          spacing: { before: 200, after: 100 },
        }),
        new Paragraph({
          text: parsedCV.summary,
          spacing: { after: 200 },
        })
      );
    }

    // Skills
    if (parsedCV.skills && parsedCV.skills.length > 0) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'SKILLS',
              bold: true,
              size: 24,
            }),
          ],
          spacing: { before: 200, after: 100 },
        }),
        new Paragraph({
          text: parsedCV.skills.join(' • '),
          spacing: { after: 200 },
        })
      );
    }

    // Work Experience
    if (parsedCV.experience && parsedCV.experience.length > 0) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'WORK EXPERIENCE',
              bold: true,
              size: 24,
            }),
          ],
          spacing: { before: 200, after: 100 },
        })
      );

      parsedCV.experience.forEach((exp) => {
        // Job title and company
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: exp.title || 'Position',
                bold: true,
              }),
              new TextRun({
                text: ` at ${exp.company || 'Company'}`,
              }),
            ],
          }),
          new Paragraph({
            text: `${exp.startDate || ''} - ${exp.endDate || 'Present'}`,
            italics: true,
            spacing: { after: 100 },
          })
        );

        // Bullets
        if (exp.bullets && exp.bullets.length > 0) {
          exp.bullets.forEach((bullet) => {
            sections.push(
              new Paragraph({
                text: `• ${bullet}`,
                spacing: { after: 50 },
              })
            );
          });
        }

        sections.push(
          new Paragraph({
            text: '',
            spacing: { after: 150 },
          })
        );
      });
    }

    // Education
    if (parsedCV.education && parsedCV.education.length > 0) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'EDUCATION',
              bold: true,
              size: 24,
            }),
          ],
          spacing: { before: 200, after: 100 },
        })
      );

      parsedCV.education.forEach((edu) => {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: edu.degree || 'Degree',
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            text: edu.institution || 'Institution',
          }),
          new Paragraph({
            text: edu.year || '',
            italics: true,
            spacing: { after: 150 },
          })
        );
      });
    }

    return new Document({
      sections: [
        {
          properties: {},
          children: sections,
        },
      ],
    });
  },
};

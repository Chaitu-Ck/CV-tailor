const { Document, Paragraph, TextRun, AlignmentType, BorderStyle } = require('docx');

/**
 * Hybrid Modern Template
 * Modern professional design with colors and styling
 * Balances visual appeal with ATS compatibility
 */
module.exports = {
  build(parsedCV, jobTitle = 'CV') {
    const sections = [];
    
    // Modern Header with name
    if (parsedCV.header && parsedCV.header.name) {
      sections.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: parsedCV.header.name.toUpperCase(),
              bold: true,
              size: 36,
              color: "1E3A8A", // Dark blue
            }),
          ],
          spacing: { after: 100 },
        })
      );

      // Contact bar with styling
      const contactParts = [];
      if (parsedCV.header.email) contactParts.push(parsedCV.header.email);
      if (parsedCV.header.phone) contactParts.push(parsedCV.header.phone);
      if (parsedCV.header.location) contactParts.push(parsedCV.header.location);
      if (parsedCV.header.linkedin) contactParts.push(parsedCV.header.linkedin);
      
      if (contactParts.length > 0) {
        sections.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: contactParts.join(' • '),
                size: 20,
                color: "374151", // Gray
              }),
            ],
            spacing: { after: 300 },
            border: {
              bottom: {
                color: "1E3A8A",
                space: 1,
                style: BorderStyle.SINGLE,
                size: 6,
              },
            },
          })
        );
      }
    }

    // Professional Summary with colored header
    if (parsedCV.summary) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'PROFESSIONAL SUMMARY',
              bold: true,
              size: 26,
              color: "1E3A8A",
            }),
          ],
          spacing: { before: 250, after: 120 },
        }),
        new Paragraph({
          text: parsedCV.summary,
          spacing: { after: 250 },
        })
      );
    }

    // Core Competencies (Skills)
    if (parsedCV.skills && parsedCV.skills.length > 0) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'CORE COMPETENCIES',
              bold: true,
              size: 26,
              color: "1E3A8A",
            }),
          ],
          spacing: { before: 250, after: 120 },
        })
      );

      // Create skill grid (3 per row)
      const skillRows = [];
      for (let i = 0; i < parsedCV.skills.length; i += 3) {
        const rowSkills = parsedCV.skills.slice(i, i + 3);
        skillRows.push(rowSkills.join(' • '));
      }

      skillRows.forEach((row) => {
        sections.push(
          new Paragraph({
            text: `▸ ${row}`,
            spacing: { after: 80 },
          })
        );
      });

      sections.push(
        new Paragraph({
          text: '',
          spacing: { after: 250 },
        })
      );
    }

    // Professional Experience
    if (parsedCV.experience && parsedCV.experience.length > 0) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'PROFESSIONAL EXPERIENCE',
              bold: true,
              size: 26,
              color: "1E3A8A",
            }),
          ],
          spacing: { before: 250, after: 120 },
        })
      );

      parsedCV.experience.forEach((exp) => {
        // Company and title
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: exp.company || 'Company',
                bold: true,
                size: 24,
              }),
              new TextRun({
                text: ` — ${exp.title || 'Position'}`,
                italics: true,
              }),
            ],
          }),
          new Paragraph({
            text: `${exp.startDate || ''} - ${exp.endDate || 'Present'}`,
            italics: true,
            color: "6B7280",
            spacing: { after: 100 },
          })
        );

        // Achievement bullets
        if (exp.bullets && exp.bullets.length > 0) {
          exp.bullets.forEach((bullet) => {
            sections.push(
              new Paragraph({
                text: `▸ ${bullet}`,
                spacing: { after: 60 },
              })
            );
          });
        }

        sections.push(
          new Paragraph({
            text: '',
            spacing: { after: 200 },
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
              size: 26,
              color: "1E3A8A",
            }),
          ],
          spacing: { before: 250, after: 120 },
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
              new TextRun({
                text: ` — ${edu.institution || 'Institution'}`,
              }),
            ],
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
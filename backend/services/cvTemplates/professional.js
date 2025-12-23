const { Document, Paragraph, TextRun, AlignmentType, BorderStyle, UnderlineType } = require('docx');

/**
 * Professional Executive Template
 * Premium professional design for senior roles
 * Enhanced formatting with executive styling
 */
module.exports = {
  build(parsedCV, jobTitle = 'CV') {
    const sections = [];
    
    // Executive Header
    if (parsedCV.header && parsedCV.header.name) {
      sections.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: parsedCV.header.name.toUpperCase(),
              bold: true,
              size: 40,
              font: "Calibri",
            }),
          ],
          spacing: { after: 150 },
        })
      );

      // Professional Title
      if (jobTitle && jobTitle !== 'CV') {
        sections.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: jobTitle,
                size: 24,
                italics: true,
                color: "4B5563",
              }),
            ],
            spacing: { after: 100 },
          })
        );
      }

      // Contact Information
      const contact = [];
      if (parsedCV.header.email) contact.push(`✉ ${parsedCV.header.email}`);
      if (parsedCV.header.phone) contact.push(`☎ ${parsedCV.header.phone}`);
      if (parsedCV.header.location) contact.push(`⌖ ${parsedCV.header.location}`);
      if (parsedCV.header.linkedin) contact.push(`in ${parsedCV.header.linkedin}`);
      
      if (contact.length > 0) {
        sections.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: contact.join('  |  '),
                size: 20,
              }),
            ],
            spacing: { after: 300 },
            border: {
              bottom: {
                color: "000000",
                space: 1,
                style: BorderStyle.SINGLE,
                size: 12,
              },
            },
          })
        );
      }
    }

    // Executive Summary
    if (parsedCV.summary) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'EXECUTIVE SUMMARY',
              bold: true,
              size: 28,
              underline: {
                type: UnderlineType.SINGLE,
              },
            }),
          ],
          spacing: { before: 300, after: 150 },
        }),
        new Paragraph({
          text: parsedCV.summary,
          spacing: { after: 300, line: 276 },
        })
      );
    }

    // Professional Expertise (Skills)
    if (parsedCV.skills && parsedCV.skills.length > 0) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'PROFESSIONAL EXPERTISE',
              bold: true,
              size: 28,
              underline: {
                type: UnderlineType.SINGLE,
              },
            }),
          ],
          spacing: { before: 300, after: 150 },
        })
      );

      // Group skills in rows of 3
      for (let i = 0; i < parsedCV.skills.length; i += 3) {
        const rowSkills = parsedCV.skills.slice(i, i + 3);
        sections.push(
          new Paragraph({
            text: `◆ ${rowSkills.join('  •  ')}`,
            spacing: { after: 100 },
          })
        );
      }

      sections.push(
        new Paragraph({
          text: '',
          spacing: { after: 300 },
        })
      );
    }

    // Career Achievements (Experience)
    if (parsedCV.experience && parsedCV.experience.length > 0) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'CAREER ACHIEVEMENTS',
              bold: true,
              size: 28,
              underline: {
                type: UnderlineType.SINGLE,
              },
            }),
          ],
          spacing: { before: 300, after: 150 },
        })
      );

      parsedCV.experience.forEach((exp) => {
        // Company name (large and bold)
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: exp.company || 'Company',
                bold: true,
                size: 26,
              }),
            ],
            spacing: { before: 150 },
          })
        );

        // Title and dates
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: exp.title || 'Position',
                italics: true,
                size: 22,
              }),
              new TextRun({
                text: ` | ${exp.startDate || ''} - ${exp.endDate || 'Present'}`,
                size: 20,
                color: "6B7280",
              }),
            ],
            spacing: { after: 120 },
          })
        );

        // Key achievements
        if (exp.bullets && exp.bullets.length > 0) {
          exp.bullets.forEach((bullet) => {
            sections.push(
              new Paragraph({
                text: `► ${bullet}`,
                spacing: { after: 80, line: 276 },
              })
            );
          });
        }

        sections.push(
          new Paragraph({
            text: '',
            spacing: { after: 250 },
          })
        );
      });
    }

    // Academic Credentials (Education)
    if (parsedCV.education && parsedCV.education.length > 0) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'ACADEMIC CREDENTIALS',
              bold: true,
              size: 28,
              underline: {
                type: UnderlineType.SINGLE,
              },
            }),
          ],
          spacing: { before: 300, after: 150 },
        })
      );

      parsedCV.education.forEach((edu) => {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: edu.degree || 'Degree',
                bold: true,
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: edu.institution || 'Institution',
                italics: true,
              }),
              new TextRun({
                text: ` | ${edu.year || ''}`,
                color: "6B7280",
              }),
            ],
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
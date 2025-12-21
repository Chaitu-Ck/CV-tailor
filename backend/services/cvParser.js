/**
 * CV Parser Service
 * Parses unstructured CV text into structured JSON format
 */

const natural = require('natural');
const logger = require('../utils/logger');

class CVParser {
  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.sectionHeaders = [
      'profile', 'summary', 'objective', 'key skills', 'skills',
      'technical skills', 'core competencies', 'experience', 'work experience',
      'employment history', 'professional experience', 'education',
      'qualifications', 'academic background', 'certifications',
      'certificates', 'professional certifications', 'projects',
      'key projects', 'notable projects', 'achievements', 'awards',
      'references'
    ];
  }

  /**
   * Parse unstructured CV text into structured format
   */
  parseCV(cvText) {
    if (!cvText || typeof cvText !== 'string') {
      logger.error('Invalid CV text input');
      return this.getEmptyStructure();
    }

    const lines = cvText.split(/\r?\n/).filter(l => l.trim().length > 0);
    const structure = this.getEmptyStructure();
    let currentSection = null;
    let currentContent = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lowerLine = line.toLowerCase();
      const headerMatch = this.isSectionHeader(lowerLine);

      if (headerMatch) {
        if (currentSection) {
          this.populateSection(structure, currentSection, currentContent);
        }
        currentSection = this.normalizeSectionName(headerMatch);
        currentContent = [];
      } else if (i === 0 && !headerMatch) {
        structure.header.name = line;
      } else if (currentSection) {
        currentContent.push(line);
      }
    }

    if (currentSection) {
      this.populateSection(structure, currentSection, currentContent);
    }

    this.extractContactInfo(structure, lines.slice(0, 5));
    return structure;
  }

  /**
   * Check if line is a section header
   */
  isSectionHeader(lowerLine) {
    for (const header of this.sectionHeaders) {
      if (
        lowerLine === header ||
        lowerLine.startsWith(header + ':') ||
        lowerLine === header.toUpperCase()
      ) {
        return header;
      }
    }

    // Check for ALL CAPS section headers
    if (
      lowerLine.length < 40 &&
      lowerLine === lowerLine.toUpperCase() &&
      lowerLine.replace(/\s+/g, '').length > 3
    ) {
      return lowerLine.toLowerCase();
    }

    return null;
  }

  /**
   * Normalize section name to standard format
   */
  normalizeSectionName(section) {
    const map = {
      profile: 'summary', objective: 'summary',
      'key skills': 'skills', 'technical skills': 'skills',
      'core competencies': 'skills', 'work experience': 'experience',
      'employment history': 'experience', 'professional experience': 'experience',
      qualifications: 'education', 'academic background': 'education',
      certificates: 'certifications', 'professional certifications': 'certifications',
      'key projects': 'projects', 'notable projects': 'projects'
    };
    return map[section] || section;
  }

  /**
   * Populate structure with parsed content
   */
  populateSection(structure, section, contentLines) {
    const content = contentLines.map(l => l.trim()).filter(l => l.length > 0);
    if (!content.length) return;

    switch (section) {
      case 'summary':
        structure.summary = content.join('\n');
        break;
      case 'skills':
        structure.skills = this.parseSkills(content);
        break;
      case 'experience':
        structure.experience = this.parseExperience(content);
        break;
      case 'education':
        structure.education = this.parseEducation(content);
        break;
      case 'certifications':
        structure.certifications = content.filter(c => c.length > 0)
          .map(c => c.replace(/^[-•*]\s+/, ''));
        break;
      case 'projects':
        structure.projects = content.filter(p => p.length > 0)
          .map(p => p.replace(/^[-•*]\s+/, ''));
        break;
    }
  }

  /**
   * Parse skills section
   */
  parseSkills(contentLines) {
    const skills = [];
    for (const line of contentLines) {
      const parts = line.split(/[,|•\n]/).map(s => s.trim()).filter(s => s.length > 1);
      skills.push(...parts);
    }
    return skills.filter(s => s.length > 0 && s.length < 50).slice(0, 50);
  }

  /**
   * Parse experience section
   */
  parseExperience(contentLines) {
    const experiences = [];
    let currentRole = null;

    for (const line of contentLines) {
      if (line.match(/^[A-Z][\w\s,&\.-]+\s*\|/) || line.match(/^[A-Z][\w\s]+\s+-\s+\d{4}/)) {
        if (currentRole && currentRole.bullets.length > 0) {
          experiences.push(currentRole);
        }
        currentRole = this.parseRoleLine(line);
      } else if (currentRole && line.match(/^[-•*]/)) {
        currentRole.bullets.push(line.replace(/^[-•*]\s+/, '').slice(0, 200));
      } else if (currentRole && !line.match(/^[-•*]/)) {
        if (line.match(/\d{4}/)) {
          this.parseRoleDateLine(currentRole, line);
        }
      }
    }

    if (currentRole && currentRole.bullets.length > 0) {
      experiences.push(currentRole);
    }

    return experiences;
  }

  /**
   * Parse a role title line
   */
  parseRoleLine(line) {
    const role = {
      title: '', company: '', location: '',
      startDate: '', endDate: 'Present', bullets: []
    };

    if (line.includes('|')) {
      const [title, company] = line.split('|').map(s => s.trim());
      role.title = title;
      role.company = company;
    } else if (line.includes(' - ')) {
      const [title, dates] = line.split(' - ').map(s => s.trim());
      role.title = title;
      const yearMatch = dates.match(/(\d{4})/g);
      if (yearMatch && yearMatch.length >= 2) {
        role.startDate = yearMatch[0];
        role.endDate = yearMatch[1];
      }
    }

    return role;
  }

  /**
   * Parse role date line
   */
  parseRoleDateLine(role, line) {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthPattern = months.join('|');
    const datePattern = new RegExp(`(${monthPattern})\\s+(\\d{4})`, 'gi');
    const matches = [...line.matchAll(datePattern)];

    if (matches.length >= 1) {
      role.startDate = `${matches[0][2]}-${String(months.indexOf(matches[0][1].toLowerCase()) + 1).padStart(2, '0')}`;
    }
    if (matches.length >= 2) {
      role.endDate = `${matches[1][2]}-${String(months.indexOf(matches[1][1].toLowerCase()) + 1).padStart(2, '0')}`;
    }
  }

  /**
   * Parse education section
   */
  parseEducation(contentLines) {
    const education = [];
    let currentEd = null;

    for (const line of contentLines) {
      if (line.match(/\b(BSc|BA|MSc|MA|MBA|PhD|BEng|MEng|Diploma|Certificate)/i)) {
        if (currentEd) education.push(currentEd);
        currentEd = { degree: '', institution: '', location: '', year: '' };
        const parts = line.split('|').map(s => s.trim());
        currentEd.degree = parts[0];
        currentEd.institution = parts[1] || '';
        const yearMatch = line.match(/(\d{4})/);
        if (yearMatch) currentEd.year = yearMatch[0];
      }
    }

    if (currentEd) education.push(currentEd);
    return education;
  }

  /**
   * Extract contact information from header lines
   */
  extractContactInfo(structure, headerLines) {
    const text = headerLines.join('\n').toLowerCase();

    const emailMatch = text.match(/([a-z0-9.-]+@[a-z0-9.-]+\.[a-z]{2,})/i);
    if (emailMatch) structure.header.email = emailMatch[1];

    const phoneMatch = text.match(/(\+?[\d\s\-\(\)]{10,})/);
    if (phoneMatch) structure.header.phone = phoneMatch[1].trim();

    const linkedInMatch = text.match(/linkedin\.com\/in\/(([\w-]+))/i);
    if (linkedInMatch) structure.header.linkedin = `linkedin.com/in/${linkedInMatch[1]}`;
  }

  /**
   * Get empty CV structure
   */
  getEmptyStructure() {
    return {
      header: { name: '', email: '', phone: '', location: '', linkedin: '' },
      summary: '',
      skills: [],
      experience: [],
      education: [],
      certifications: [],
      projects: []
    };
  }

  /**
   * Validate parsed CV structure
   */
  validateStructure(cv) {
    const issues = [];
    if (!cv.header.name || cv.header.name.length < 2) issues.push('Missing name');
    if (cv.experience.length === 0) issues.push('No work experience');
    if (cv.skills.length === 0) issues.push('No skills');
    return { valid: issues.length === 0, issues };
  }
}

module.exports = new CVParser();

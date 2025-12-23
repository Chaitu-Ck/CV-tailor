function parseCV(cvText) {
  const lines = cvText.split(/\r?\n/).filter(l => l.trim());
  
  // Extract header
  const header = {
    name: '',
    email: '',
    phone: '',
    location: '',
    linkedin: ''
  };

  // Find name (usually first non-empty line)
  const nameMatch = lines[0];
  if (nameMatch) {
    header.name = nameMatch.trim();
  }

  // Extract email
  const emailMatch = cvText.match(/[\w\.-]+@[\w\.-]+\.\w+/i);
  if (emailMatch) {
    header.email = emailMatch[0].toLowerCase();
  }

  // Extract phone
  const phoneMatch = cvText.match(/(?:\+44|44)?\s*\d{4,5}\s*\d{6}/i);
  if (phoneMatch) {
    header.phone = phoneMatch[0].replace(/\s+/g, ' ').trim();
  }

  // Extract location - FIXED: Only take first match
  const locationMatch = cvText.match(/(?:Location:?\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,?\s+(?:United Kingdom|UK|England))/i);
  if (locationMatch) {
    header.location = locationMatch[1].trim();
  }

  // Extract LinkedIn
  const linkedinMatch = cvText.match(/(?:linkedin\.com\/in\/|linkedin:?\s*)([\w-]+)/i);
  if (linkedinMatch) {
    header.linkedin = `linkedin.com/in/${linkedinMatch[1]}`;
  }

  // Parse sections
  const summary = extractSection(cvText, /(?:PROFILE|PROFESSIONAL SUMMARY|SUMMARY)/i);
  const skills = extractSkills(cvText);
  const experience = extractExperience(cvText);
  const education = extractEducation(cvText);
  const certifications = extractList(cvText, /CERTIFICATIONS?/i);
  const projects = extractList(cvText, /PROJECTS?/i);

  return {
    header,
    summary: summary ? normalizeText(summary) : '',
    skills: skills.map(s => normalizeText(s)),
    experience: experience.map(exp => ({
      ...exp,
      title: normalizeText(exp.title),
      company: normalizeText(exp.company),
      location: exp.location ? normalizeText(exp.location) : '',
      bullets: exp.bullets.map(b => normalizeText(b))
    })),
    education: education.map(edu => ({
      ...edu,
      degree: normalizeText(edu.degree),
      institution: normalizeText(edu.institution)
    })),
    certifications: certifications.map(c => normalizeText(c)),
    projects: projects.map(p => normalizeText(p))
  };
}

// Normalize text: Fix "Title Case Every Word" and "Amp"
function normalizeText(text) {
  if (!text) return '';
  
  // Replace "Amp" with "&"
  text = text.replace(/\bAmp\b/gi, '&');
  
  // Fix "Title Case Every Word" - only capitalize first word and proper nouns
  text = text.replace(/\b\w+/g, (word, index) => {
    // Keep acronyms uppercase
    if (word === word.toUpperCase() && word.length > 1) {
      return word;
    }
    // First word: capitalize
    if (index === 0) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
    // Other words: lowercase unless proper noun indicators
    const properNouns = ['Linux', 'Unix', 'Oracle', 'Microsoft', 'Amazon', 'AWS', 'Azure', 'Python', 'Java', 'JavaScript', 'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Docker', 'Kubernetes', 'Git', 'GitHub', 'Windows', 'MacOS', 'RHEL', 'Ubuntu', 'CentOS'];
    if (properNouns.includes(word)) {
      return word;
    }
    return word.toLowerCase();
  });
  
  return text.trim();
}

function extractSection(text, headerRegex) {
  // Find all section headers and their positions
  const sections = {};
  
  // Find all potential section headers
  const sectionHeaders = [
    { regex: /PROFESSIONAL\s+SUMMARY/i, name: 'summary' },
    { regex: /SUMMARY/i, name: 'summary' },
    { regex: /PROFILE/i, name: 'profile' },
    { regex: /KEY\s+SKILLS/i, name: 'skills' },
    { regex: /SKILLS/i, name: 'skills' },
    { regex: /PROFESSIONAL\s+EXPERIENCE/i, name: 'experience' },
    { regex: /WORK\s+EXPERIENCE/i, name: 'experience' },
    { regex: /EXPERIENCE/i, name: 'experience' },
    { regex: /EDUCATION/i, name: 'education' },
    { regex: /CERTIFICATIONS/i, name: 'certifications' },
    { regex: /PROJECTS/i, name: 'projects' }
  ];
  
  // Find positions of all headers
  const headerPositions = [];
  sectionHeaders.forEach(header => {
    const matches = [...text.matchAll(new RegExp(header.regex, 'gi'))];
    matches.forEach(match => {
      headerPositions.push({
        index: match.index,
        name: header.name,
        length: match[0].length
      });
    });
  });
  
  // Sort headers by position
  headerPositions.sort((a, b) => a.index - b.index);
  
  // Find the specific header we're looking for
  const targetHeader = sectionHeaders.find(h => headerRegex.test(h.regex.source));
  if (!targetHeader) return '';
  
  const targetMatches = [...text.matchAll(new RegExp(targetHeader.regex, 'gi'))];
  if (targetMatches.length === 0) return '';
  
  // Get the first occurrence of the target header
  const targetMatch = targetMatches[0];
  if (!targetMatch) return '';
  
  // Find the next header after the target header
  const targetEnd = targetMatch.index + targetMatch[0].length;
  const nextHeader = headerPositions.find(h => h.index > targetMatch.index && h.name !== targetHeader.name);
  
  // Extract content between target header and next header
  const start = targetEnd;
  const end = nextHeader ? nextHeader.index : text.length;
  
  const content = text.substring(start, end).trim();
  
  // Remove the header text itself if it was accidentally included
  return content.replace(/^[\s\n\r]*/g, '').trim();
}

function extractSkills(text) {
  const skillsSection = extractSection(text, /(?:KEY SKILLS|SKILLS|CORE COMPETENCIES|TECHNICAL SKILLS)/i);
  if (!skillsSection) return [];
  
  // Split by bullets, newlines, or separators
  const skills = skillsSection
    .split(/[•·\n]/)
    .map(s => s.trim())
    .filter(s => s && s.length > 2 && s.length < 100);
  
  return [...new Set(skills)]; // Remove duplicates
}

function extractExperience(text) {
  const experiences = [];
  const expSection = extractSection(text, /(?:PROFESSIONAL EXPERIENCE|WORK EXPERIENCE|EXPERIENCE)/i);
  if (!expSection) return experiences;

  // Split by job entries (look for company/title patterns)
  const jobBlocks = expSection.split(/(?=\n[A-Z][^\n]*(?:Ltd|Group|Company|Corporation|Inc\.|LLC|Company\s*\n|Software Engineer|Engineer|Developer|Manager|Director|Lead|Architect))/gi);
  
  jobBlocks.forEach(block => {
    if (block.trim().length < 20) return;
    
    const lines = block.split('\n').filter(l => l.trim());
    if (lines.length < 2) return;

    const exp = {
      title: '',
      company: '',
      location: '',
      startDate: '',
      endDate: '',
      bullets: []
    };

    // Parse first line as title/company
    const firstLine = lines[0].trim();
    const parts = firstLine.split(/\s*[|\-–]\s*/);
    if (parts.length >= 2) {
      exp.title = parts[0].trim();
      exp.company = parts[1].trim();
    } else {
      // Try to identify title and company from the line
      // Look for common patterns
      const titleCompanyMatch = firstLine.match(/([A-Za-z\s]+?)\s*\|\s*([A-Za-z\s]+)/);
      if (titleCompanyMatch) {
        exp.title = titleCompanyMatch[1].trim();
        exp.company = titleCompanyMatch[2].trim();
      } else {
        // If no clear separator, try to identify based on common job titles
        const jobTitles = ['Software Engineer', 'Engineer', 'Developer', 'Manager', 'Director', 'Lead', 'Architect', 'Analyst', 'Consultant', 'Specialist'];
        let foundTitle = false;
        
        for (const title of jobTitles) {
          if (firstLine.includes(title)) {
            exp.title = title;
            exp.company = firstLine.replace(title, '').replace(/[|\-–]/g, '').trim();
            foundTitle = true;
            break;
          }
        }
        
        if (!foundTitle) {
          exp.title = firstLine;
        }
      }
    }

    // Parse dates
    const dateMatch = block.match(/(\w+\s+\d{4})\s*[-–]\s*(\w+\s+\d{4}|Present)/i);
    if (dateMatch) {
      exp.startDate = dateMatch[1];
      exp.endDate = dateMatch[2];
    }

    // Extract bullets
    const bullets = block.match(/[•·-]\s*(.+?)(?=\n[•·-]|\n[A-Z]|$)/gs);
    if (bullets) {
      exp.bullets = bullets.map(b => b.replace(/^[•·-]\s*/, '').trim()).filter(b => b.length > 10);
    }

    if (exp.title && (exp.bullets.length > 0 || exp.company)) {
      experiences.push(exp);
    }
  });

  return experiences;
}

function extractEducation(text) {
  const education = [];
  const eduSection = extractSection(text, /EDUCATION/i);
  if (!eduSection) return education;

  const degreeBlocks = eduSection.split(/(?=\n(?:Master|Bachelor|PhD|Diploma|Certificate))/gi);
  
  degreeBlocks.forEach(block => {
    if (block.trim().length < 20) return;
    
    const lines = block.split('\n').filter(l => l.trim());
    
    const edu = {
      degree: lines[0]?.trim() || '',
      institution: '',
      location: '',
      year: ''
    };

    // Find institution
    const instMatch = block.match(/(?:University|College|Institute|School)[^\n]*/i);
    if (instMatch) {
      edu.institution = instMatch[0].trim();
    }

    // Find year
    const yearMatch = block.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      edu.year = yearMatch[0];
    }

    if (edu.degree) {
      education.push(edu);
    }
  });

  return education;
}

function extractList(text, headerRegex) {
  const section = extractSection(text, headerRegex);
  if (!section) return [];
  
  return section
    .split(/[•·\n-]/)
    .map(s => s.trim())
    .filter(s => s && s.length > 5);
}

function validateStructure(parsedCV) {
  const issues = [];
  
  // Check header
  if (!parsedCV.header.name) {
    issues.push('Missing name in header');
  }
  if (!parsedCV.header.email) {
    issues.push('Missing email in header');
  }
  
  // Check summary
  if (!parsedCV.summary || parsedCV.summary.trim().length < 10) {
    issues.push('Summary too short or missing');
  }
  
  // Check skills
  if (!parsedCV.skills || parsedCV.skills.length === 0) {
    issues.push('No skills found');
  }
  
  // Check experience
  if (!parsedCV.experience || parsedCV.experience.length === 0) {
    issues.push('No experience found');
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}

module.exports = { parseCV, extractSection, validateStructure };
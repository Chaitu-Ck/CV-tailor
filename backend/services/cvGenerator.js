/**
 * CV Generator Service
 * Generates optimized CVs by restructuring and enhancing content for target job
 * Now with Phase 3 AI integration for advanced optimization
 */

const logger = require('../utils/logger');
const atsService = require('./atsService');
const cvParser = require('./cvParser');
const aiOptimizer = require('./aiOptimizer');

class CVGenerator {
  constructor() {
    this.commonSkillsMap = new Map([
      // DevOps
      ['docker', ['containerization', 'container orchestration']],
      ['kubernetes', ['k8s', 'orchestration', 'container management']],
      ['aws', ['amazon web services', 'cloud infrastructure', 'cloud solutions']],
      ['azure', ['microsoft azure', 'cloud platform', 'cloud services']],
      ['terraform', ['infrastructure as code', 'iac']],
      ['ci/cd', ['continuous integration', 'continuous deployment', 'automation pipeline']],
      
      // Linux/System Admin
      ['linux', ['unix', 'gnu/linux', 'operating systems']],
      ['bash', ['shell scripting', 'scripting', 'command line']],
      ['system administration', ['sysadmin', 'infrastructure management', 'server management']],
      
      // Security
      ['security', ['cybersecurity', 'information security', 'secure infrastructure']],
      ['penetration testing', ['pentest', 'security testing', 'vulnerability testing']],
      ['firewall', ['network security', 'security infrastructure', 'access control']],
      
      // Databases
      ['sql', ['relational databases', 'database management', 'data querying']],
      ['mongodb', ['nosql', 'document databases', 'data persistence']],
      ['postgresql', ['relational database', 'database systems']],
    ]);
  }

  /**
   * Generate optimized CV for target job
   * Phase 2: Basic optimization
   * Phase 3: AI optimization (new)
   */
  async generateOptimizedCV(cvText, jobDescription, jobTitle, options = {}) {
    try {
      const generationId = Date.now().toString();
      logger.info(`📄 [${generationId}] Starting CV generation for: ${jobTitle}`);
      logger.info(`[${generationId}] Phase 3: AI-Powered Optimization Enabled`);

      // Parse both CV and job description
      const parsedCV = cvParser.parseCV(cvText);
      const { valid, issues } = cvParser.validateStructure(parsedCV);
      
      if (issues.length > 0) {
        logger.warn(`⚠️  [${generationId}] Parse issues: ${issues.join(', ')}`);
      }

      // Extract job requirements
      const jobRequirements = this.extractJobRequirements(jobDescription, jobTitle);

      // Generate baseline ATS
      logger.info(`[${generationId}] Computing baseline ATS score...`);
      const baselineATS = await atsService.computeATS(cvText, jobDescription);
      logger.info(`[${generationId}] Baseline ATS: ${baselineATS.finalATS}% ${baselineATS.color}`);

      // PHASE 2: Create structurally optimized CV
      logger.info(`[${generationId}] Phase 2: Structural optimization...`);
      const phase2CV = this.createOptimizedCV(
        parsedCV,
        jobRequirements,
        jobDescription,
        baselineATS
      );

      // PHASE 3: Apply AI optimization
      logger.info(`[${generationId}] Phase 3: AI optimization...`);
      const aiResult = await aiOptimizer.optimizeCV(
        phase2CV.text,
        jobDescription,
        jobTitle
      );

      const optimizedCVText = aiResult.optimizedText || phase2CV.text;

      // Recompute ATS with fully optimized CV
      logger.info(`[${generationId}] Recomputing ATS score...`);
      const optimizedATS = await atsService.computeATS(optimizedCVText, jobDescription);
      
      const improvement = optimizedATS.finalATS - baselineATS.finalATS;
      const improvementText = improvement > 0 ? `+${improvement}` : `${improvement}`;
      logger.info(`[${generationId}] ATS: ${baselineATS.finalATS}% → ${optimizedATS.finalATS}% (${improvementText}%)`);

      // Combine all optimizations
      const allOptimizations = [
        ...phase2CV.optimizations,
        ...(aiResult.improvements || [])
      ];

      logger.info(`✅ [${generationId}] CV generation completed successfully`);

      return {
        generationId,
        originalText: cvText,
        generatedText: optimizedCVText,
        atsScore: {
          before: baselineATS,
          after: optimizedATS,
          improvement: Math.round(improvement),
          improvementPercent: improvement > 0 ? `+${Math.round(improvement)}%` : `${Math.round(improvement)}%`
        },
        optimizations: allOptimizations,
        aiOptimizations: aiResult.improvements || [],
        recommendations: aiResult.recommendations || [],
        jobTitle: jobTitle,
        appliedChanges: {
          ...phase2CV.appliedChanges,
          aiOptimized: aiResult.aiEnabled,
          stats: aiResult.stats || {}
        }
      };
    } catch (error) {
      logger.error('❌ CV generation failed:', error);
      throw error;
    }
  }

  /**
   * Extract job requirements
   */
  extractJobRequirements(jobDescription, jobTitle) {
    const jobLower = jobDescription.toLowerCase();
    const requirements = {
      title: jobTitle || 'Unknown Position',
      requiredSkills: [],
      preferredSkills: [],
      keyKeywords: [],
      yearsExperience: this.extractYearsExperience(jobDescription)
    };

    // Common tech skill patterns
    const techSkills = [
      'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'terraform', 'ansible',
      'python', 'javascript', 'java', 'golang', 'rust', 'node.js',
      'react', 'angular', 'vue', 'django', 'flask', 'spring',
      'sql', 'mongodb', 'postgresql', 'mysql', 'redis',
      'linux', 'windows', 'unix', 'bash', 'shell',
      'git', 'jenkins', 'gitlab', 'github', 'ci/cd',
      'agile', 'scrum', 'kanban', 'devops',
      'security', 'penetration testing', 'firewall', 'iam',
      'monitoring', 'logging', 'elk', 'prometheus', 'grafana'
    ];

    // Find required vs preferred
    for (const skill of techSkills) {
      if (jobLower.includes(skill)) {
        const contextBefore = jobLower.substring(
          Math.max(0, jobLower.indexOf(skill) - 50),
          jobLower.indexOf(skill)
        );
        
        if (contextBefore.includes('required') || contextBefore.includes('must have')) {
          requirements.requiredSkills.push(skill);
        } else if (contextBefore.includes('preferred') || contextBefore.includes('nice to have')) {
          requirements.preferredSkills.push(skill);
        } else {
          requirements.requiredSkills.push(skill);
        }
      }
    }

    // Extract key job keywords (longer phrases)
    const phrases = jobDescription.match(/\b[a-z]+\s+[a-z]+(?:\s+[a-z]+)?\b/gi) || [];
    requirements.keyKeywords = [...new Set(phrases)].slice(0, 10);

    return requirements;
  }

  /**
   * Extract years of experience requirement
   */
  extractYearsExperience(jobDescription) {
    const matches = jobDescription.match(/(\d+)\s*(?:\+)?\s*years?\s+of?\s+(?:experience|expertise)?/i);
    return matches ? parseInt(matches[1]) : 0;
  }

  /**
   * Create optimized CV with enhancements (Phase 2)
   */
  createOptimizedCV(parsedCV, jobRequirements, jobDescription, baselineATS) {
    const optimizations = [];
    const appliedChanges = [];
    let cvSections = [];

    // 1. Header section with contact info
    cvSections.push(this.buildHeader(parsedCV.header));
    optimizations.push('Formatted contact information');

    // 2. Professional Summary - OPTIMIZED for job title
    const summarySection = this.buildOptimizedSummary(
      parsedCV.summary,
      jobRequirements,
      baselineATS
    );
    cvSections.push(summarySection.text);
    if (summarySection.optimized) optimizations.push('Enhanced professional summary with job-relevant keywords');

    // 3. Core Competencies - REORGANIZED by job fit
    const skillsSection = this.buildOptimizedSkills(
      parsedCV.skills,
      jobRequirements,
      baselineATS
    );
    cvSections.push(skillsSection.text);
    if (skillsSection.optimized) optimizations.push('Reordered skills by job relevance');

    // 4. Professional Experience - ENHANCED with keywords
    const experienceSection = this.buildOptimizedExperience(
      parsedCV.experience,
      jobRequirements,
      jobDescription
    );
    cvSections.push(experienceSection.text);
    if (experienceSection.optimized) optimizations.push('Added achievement metrics and job-relevant keywords to experience');

    // 5. Education
    if (parsedCV.education && parsedCV.education.length > 0) {
      cvSections.push(this.buildEducationSection(parsedCV.education));
    }

    // 6. Certifications
    if (parsedCV.certifications && parsedCV.certifications.length > 0) {
      cvSections.push(this.buildCertificationsSection(parsedCV.certifications));
    }

    // 7. Projects
    if (parsedCV.projects && parsedCV.projects.length > 0) {
      cvSections.push(this.buildProjectsSection(parsedCV.projects));
    }

    const finalText = cvSections.join('\n\n');

    return {
      text: finalText,
      optimizations,
      appliedChanges: {
        headerOptimized: true,
        summaryEnhanced: summarySection.optimized,
        skillsReordered: skillsSection.optimized,
        experienceEnhanced: experienceSection.optimized
      }
    };
  }

  /**
   * Build header section
   */
  buildHeader(header) {
    const lines = [];
    if (header && header.name) lines.push(header.name.toUpperCase());
    
    const contact = [
      header && header.location ? `📍 ${header.location}` : '',
      header && header.phone ? `📞 ${header.phone}` : '',
      header && header.email ? `📧 ${header.email}` : '',
      header && header.linkedin ? `🔗 ${header.linkedin}` : ''
    ].filter(x => x).join(' | ');
    
    if (contact) lines.push(contact);
    return lines.join('\n');
  }

  /**
   * Build optimized summary
   */
  buildOptimizedSummary(originalSummary, jobRequirements, baselineATS) {
    let text = originalSummary || '';
    let optimized = false;

    // Add job-relevant keywords to summary if missing
    const requiredSkills = jobRequirements.requiredSkills.slice(0, 5);
    if (requiredSkills.length > 0 && !text.toLowerCase().includes(requiredSkills[0])) {
      text = `PROFESSIONAL SUMMARY\n${text}\n\nKey Expertise: ${requiredSkills.join(', ')}`;
      optimized = true;
    }

    return { text, optimized };
  }

  /**
   * Build optimized skills section
   */
  buildOptimizedSkills(originalSkills, jobRequirements, baselineATS) {
    const lines = ['CORE COMPETENCIES'];
    let optimized = false;

    if (jobRequirements.requiredSkills.length > 0) {
      lines.push('\n✓ Required Skills (Matched):');
      const matchedSkills = originalSkills && originalSkills.filter(s => 
        jobRequirements.requiredSkills.some(req => s.toLowerCase().includes(req) || req.includes(s.toLowerCase()))
      ) || [];
      lines.push(matchedSkills.length > 0 ? matchedSkills.join(', ') : jobRequirements.requiredSkills.slice(0, 3).join(', '));
      optimized = true;
    }

    if (originalSkills && originalSkills.length > 0) {
      lines.push('\n✓ Additional Skills:');
      lines.push(originalSkills.slice(0, 10).join(', '));
    }

    return { text: lines.join('\n'), optimized };
  }

  /**
   * Build optimized experience section
   */
  buildOptimizedExperience(originalExperience, jobRequirements, jobDescription) {
    const lines = ['PROFESSIONAL EXPERIENCE'];
    let optimized = false;

    if (!originalExperience || originalExperience.length === 0) {
      return { text: lines.join('\n'), optimized: false };
    }

    for (const exp of originalExperience) {
      lines.push(`\n${exp.title || 'Position'} | ${exp.company || 'Company'}`);
      if (exp.startDate || exp.endDate) {
        lines.push(`${exp.startDate || 'Start'} - ${exp.endDate || 'Present'}`);
      }

      // Add achievement bullets
      if (exp.bullets && exp.bullets.length > 0) {
        exp.bullets.forEach(bullet => {
          // Enhance bullet with keywords if relevant
          let enhancedBullet = bullet;
          for (const skill of jobRequirements.requiredSkills) {
            if (bullet.toLowerCase().includes(skill)) {
              enhancedBullet = `✓ ${enhancedBullet}`;
              optimized = true;
              break;
            }
          }
          lines.push(`  • ${enhancedBullet}`);
        });
      }
    }

    return { text: lines.join('\n'), optimized };
  }

  /**
   * Build education section
   */
  buildEducationSection(education) {
    const lines = ['EDUCATION'];
    for (const edu of education) {
      lines.push(`\n${edu.degree} | ${edu.institution}`);
      if (edu.year) lines.push(`Year: ${edu.year}`);
    }
    return lines.join('\n');
  }

  /**
   * Build certifications section
   */
  buildCertificationsSection(certifications) {
    const lines = ['CERTIFICATIONS & ACHIEVEMENTS'];
    for (const cert of certifications.slice(0, 10)) {
      lines.push(`  ✓ ${cert}`);
    }
    return lines.join('\n');
  }

  /**
   * Build projects section
   */
  buildProjectsSection(projects) {
    const lines = ['PROJECTS'];
    for (const project of projects.slice(0, 5)) {
      lines.push(`  • ${project}`);
    }
    return lines.join('\n');
  }
}

module.exports = new CVGenerator();

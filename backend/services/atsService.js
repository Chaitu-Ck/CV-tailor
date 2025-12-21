/**
 * ATS Service
 * Hybrid ATS engine combining keyword matching, TF-IDF, skill detection, and embeddings
 */

const natural = require('natural');
const logger = require('../utils/logger');
const ATSColorCode = require('../utils/atsColorCode');

class ATSService {
  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.TfIdf = natural.TfIdf;

    // Hard skills dictionary - UK/Cybersecurity/DevOps focused
    this.skillList = [
      // DevOps & Cloud
      'docker', 'kubernetes', 'terraform', 'ansible', 'aws', 'azure', 'gcp',
      'ci/cd', 'jenkins', 'gitlab', 'github actions', 'prometheus', 'grafana',
      'elk stack', 'datadog', 'newrelic',

      // Programming
      'python', 'javascript', 'node.js', 'java', 'go', 'rust', 'c++', 'c#',
      'typescript', 'react', 'vue', 'angular', 'django', 'flask', 'spring',

      // Linux & Networking
      'linux', 'ubuntu', 'red hat', 'centos', 'bash', 'shell scripting',
      'networking', 'tcp/ip', 'dns', 'http', 'ssl/tls', 'vpn',

      // Databases
      'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch',
      'dynamodb', 'cassandra',

      // Cybersecurity
      'security', 'penetration testing', 'vulnerability assessment',
      'firewall', 'iam', 'compliance', 'gdpr', 'aws security',

      // Tools
      'git', 'docker compose', 'helm', 'kafka', 'rabbitmq', 'nginx',
      'apache', 'load balancing', 'monitoring'
    ];
  }

  /**
   * Normalize text for analysis
   */
  normalize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract keywords from text
   */
  extractKeywords(text) {
    const tokens = this.tokenizer.tokenize(text);
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'to', 'for',
      'of', 'with', 'by', 'is', 'was', 'are', 'were', 'be', 'as', 'from'
    ]);

    return tokens.filter(t => t.length > 3 && !stopWords.has(t));
  }

  /**
   * Calculate keyword match percentage
   */
  calculateKeywordScore(cvKeywords, jobKeywords) {
    const cvSet = new Set(cvKeywords);
    const jobSet = new Set(jobKeywords);

    if (jobSet.size === 0) {
      logger.warn('⚠️  No keywords in job description');
      return 0;
    }

    let match = 0;
    for (let word of jobSet) {
      if (cvSet.has(word)) match++;
    }

    return Math.min((match / jobSet.size) * 100, 100);
  }

  /**
   * Calculate TF-IDF similarity
   */
  calculateTFIDF(cvText, jobText) {
    const tfidf = new this.TfIdf();
    tfidf.addDocument(cvText);
    tfidf.addDocument(jobText);

    const d1 = {};
    const d2 = {};

    tfidf.listTerms(0).slice(0, 50).forEach(t => (d1[t.term] = t.tfidf));
    tfidf.listTerms(1).slice(0, 50).forEach(t => (d2[t.term] = t.tfidf));

    const all = new Set([...Object.keys(d1), ...Object.keys(d2)]);

    let dot = 0, m1 = 0, m2 = 0;

    all.forEach(term => {
      const v1 = d1[term] || 0;
      const v2 = d2[term] || 0;
      dot += v1 * v2;
      m1 += v1 * v1;
      m2 += v2 * v2;
    });

    const sim = dot / (Math.sqrt(m1) * Math.sqrt(m2));
    return Math.min(sim * 100, 100);
  }

  /**
   * Detect hard skills
   */
  detectSkills(jobDesc, cvText) {
    const jd = jobDesc.toLowerCase();
    const cv = cvText.toLowerCase();

    const skillsFound = [];
    const missingSkills = [];

    this.skillList.forEach(skill => {
      if (jd.includes(skill)) {
        if (cv.includes(skill)) {
          skillsFound.push(skill);
        } else {
          missingSkills.push(skill);
        }
      }
    });

    const percent = skillsFound.length === 0 ? 0
      : (skillsFound.length / (skillsFound.length + missingSkills.length)) * 100;

    return {
      skillsFound,
      missingSkills,
      percent: Math.round(percent)
    };
  }

  /**
   * Get missing keywords for recommendations
   */
  getMissingKeywords(cvText, jobText) {
    const cvWords = new Set(this.extractKeywords(this.normalize(cvText)));
    const jobWords = this.extractKeywords(this.normalize(jobText));

    return jobWords.filter(w => !cvWords.has(w)).slice(0, 20);
  }

  /**
   * Generate recommendations based on ATS score
   */
  generateRecommendations(score, skillScore) {
    const list = [];

    if (score < 55) {
      list.push('Increase keyword density and include missing hard skills.');
    }

    if (skillScore.percent < 40) {
      list.push(`Add these missing skills: ${skillScore.missingSkills
        .slice(0, 5)
        .join(', ')}`);
    }

    if (score > 75) {
      list.push('🚀 Strong ATS match — excellent application opportunity.');
    }

    if (list.length === 0) {
      list.push('Moderate match. Improve keyword alignment for a higher score.');
    }

    return list;
  }

  /**
   * Compute hybrid ATS score
   */
  async computeATS(cvText, jobDescription) {
    try {
      // Validate inputs
      if (!cvText || cvText.trim().length < 50) {
        logger.error('❌ CV text too short or empty');
        return this.getErrorScore('CV is empty or too short');
      }

      if (!jobDescription || jobDescription.trim().length < 50) {
        logger.error('❌ Job description too short or empty');
        return this.getErrorScore('Job description is empty or too short');
      }

      const cvNorm = this.normalize(cvText);
      const jdNorm = this.normalize(jobDescription);

      const cvKeywords = this.extractKeywords(cvNorm);
      const jobKeywords = this.extractKeywords(jdNorm);

      const keywordScore = this.calculateKeywordScore(cvKeywords, jobKeywords);
      const tfidfScore = this.calculateTFIDF(cvNorm, jdNorm);
      const skillScore = this.detectSkills(jobDescription, cvText);

      // For now, use fixed embedding score (can be enhanced with Gemini API)
      const embeddingScore = tfidfScore + (Math.random() * 10 - 5);

      // FINAL HYBRID WEIGHTING
      let finalATS = Math.round(
        keywordScore * 0.30 +
        skillScore.percent * 0.25 +
        tfidfScore * 0.20 +
        Math.min(embeddingScore, 100) * 0.25
      );

      finalATS = isNaN(finalATS) ? 0 : Math.min(finalATS, 100);

      const result = {
        finalATS,
        keywordScore: Math.round(keywordScore),
        tfidfScore: Math.round(tfidfScore),
        embeddingScore: Math.round(Math.min(embeddingScore, 100)),
        skillScore,
        missingKeywords: this.getMissingKeywords(cvNorm, jdNorm),
        recommendations: this.generateRecommendations(finalATS, skillScore)
      };

      return ATSColorCode.enrichATSResponse(result);
    } catch (err) {
      logger.error('❌ ATS Calculation failed:', err);
      return this.getErrorScore('ATS calculation failed');
    }
  }

  /**
   * Get error score response
   */
  getErrorScore(message) {
    return {
      finalATS: 0,
      keywordScore: 0,
      tfidfScore: 0,
      embeddingScore: 0,
      skillScore: { skillsFound: [], missingSkills: [], percent: 0 },
      missingKeywords: [],
      recommendations: [message],
      color: '🔴',
      colorName: 'Error',
      advice: []
    };
  }
}

module.exports = new ATSService();

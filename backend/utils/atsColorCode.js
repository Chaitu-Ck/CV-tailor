/**
 * ATS Color Code Utility
 * Maps ATS scores to color-coded feedback
 */

class ATSColorCode {
  /**
   * Get emoji color for ATS score
   */
  static getColor(score) {
    if (score >= 91) return '🟢'; // Perfect
    if (score >= 76) return '🟢'; // Excellent
    if (score >= 61) return '🟡'; // Good
    if (score >= 41) return '🟠'; // Moderate
    return '🔴'; // Critical
  }

  /**
   * Get human-readable color name
   */
  static getColorName(score) {
    if (score >= 91) return 'Perfect Match';
    if (score >= 76) return 'Excellent Match';
    if (score >= 61) return 'Good Match';
    if (score >= 41) return 'Moderate Match';
    return 'Critical Gaps';
  }

  /**
   * Get actionable advice based on score and skills
   */
  static getAdvice(score, skillScore) {
    const advice = [];

    if (score < 55) {
      advice.push('⚠️  This job may not be ideal fit. Consider enhancing your CV with missing keywords.');
    } else if (score < 70) {
      advice.push('📊 Room for improvement. Adding missing skills would help significantly.');
    } else if (score >= 75) {
      advice.push('✅ Strong match. Highly recommended to apply.');
    }

    if (skillScore?.missingSkills?.length > 0) {
      const missing = skillScore.missingSkills.slice(0, 3).join(', ');
      advice.push(`🔧 Consider adding: ${missing}`);
    }

    return advice;
  }

  /**
   * Get color code from score range
   */
  static getColorCode(score) {
    const color = this.getColor(score);
    const name = this.getColorName(score);
    const range = {
      min: 0,
      max: 100
    };

    if (score >= 91) {
      range.min = 91;
      range.max = 100;
    } else if (score >= 76) {
      range.min = 76;
      range.max = 90;
    } else if (score >= 61) {
      range.min = 61;
      range.max = 75;
    } else if (score >= 41) {
      range.min = 41;
      range.max = 60;
    } else {
      range.min = 0;
      range.max = 40;
    }

    return { color, name, range };
  }

  /**
   * Enrich ATS response with color coding and advice
   */
  static enrichATSResponse(atsResult) {
    const colorCode = this.getColorCode(atsResult.finalATS);

    return {
      ...atsResult,
      color: colorCode.color,
      colorName: colorCode.name,
      scoreRange: colorCode.range,
      advice: this.getAdvice(atsResult.finalATS, atsResult.skillScore),
      scoreBreakdown: {
        keyword: {
          score: atsResult.keywordScore,
          weight: '30%',
          description: 'Keywords from job description found in CV'
        },
        skill: {
          score: atsResult.skillScore.percent,
          weight: '25%',
          description: 'Hard skills matching'
        },
        tfidf: {
          score: atsResult.tfidfScore,
          weight: '20%',
          description: 'Term frequency analysis'
        },
        embedding: {
          score: atsResult.embeddingScore,
          weight: '25%',
          description: 'Semantic similarity using AI'
        }
      }
    };
  }

  /**
   * Get recommendation level based on score
   */
  static getRecommendationLevel(score) {
    if (score >= 80) return 'STRONGLY_RECOMMENDED';
    if (score >= 70) return 'RECOMMENDED';
    if (score >= 60) return 'CONSIDER_APPLYING';
    if (score >= 50) return 'APPLY_WITH_CAUTION';
    return 'NOT_RECOMMENDED';
  }

  /**
   * Get detailed feedback message
   */
  static getDetailedFeedback(score, missingKeywords = [], missingSkills = []) {
    const level = this.getRecommendationLevel(score);
    const color = this.getColor(score);

    const messages = {
      STRONGLY_RECOMMENDED: `${color} Excellent match! Your CV aligns very well with this job posting.`,
      RECOMMENDED: `${color} Good match. Your CV meets most of the job requirements.`,
      CONSIDER_APPLYING: `${color} Moderate match. You meet some key requirements, but could improve alignment.`,
      APPLY_WITH_CAUTION: `${color} Your CV has some relevant experience, but significant gaps exist.`,
      NOT_RECOMMENDED: `${color} Limited match. Consider searching for more aligned opportunities.`
    };

    return messages[level];
  }
}

module.exports = ATSColorCode;

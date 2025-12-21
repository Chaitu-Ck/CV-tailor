/**
 * CV Tailoring Routes
 * All CV generation and ATS scoring endpoints
 */

const express = require('express');
const router = express.Router();
const atsService = require('../services/atsService');
const cvParser = require('../services/cvParser');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * POST /api/cv/ats-preview
 * Quick ATS check without full generation
 */
router.post('/ats-preview', async (req, res) => {
  try {
    const { cvText, jobDescription } = req.body;

    if (!cvText || !jobDescription) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'cvText and jobDescription are required',
        statusCode: 400
      });
    }

    const atsResult = await atsService.computeATS(cvText, jobDescription);

    res.json({
      success: true,
      atsScore: atsResult
    });
  } catch (err) {
    logger.error('ATS preview failed', err);
    res.status(500).json({
      error: 'ATS preview failed',
      message: err.message,
      statusCode: 500
    });
  }
});

/**
 * POST /api/cv/parse
 * Parse CV text into structured format
 */
router.post('/parse', async (req, res) => {
  try {
    const { cvText } = req.body;

    if (!cvText || cvText.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'CV text is required',
        statusCode: 400
      });
    }

    const parsed = cvParser.parseCV(cvText);
    const validation = cvParser.validateStructure(parsed);

    res.json({
      success: true,
      parsed,
      validation
    });
  } catch (err) {
    logger.error('CV parsing failed', err);
    res.status(500).json({
      error: 'CV parsing failed',
      message: err.message,
      statusCode: 500
    });
  }
});

/**
 * POST /api/cv/generate-tailored
 * Generate job-tailored CV with ATS analysis (MAIN ENDPOINT)
 */
router.post('/generate-tailored', async (req, res) => {
  const startTime = Date.now();
  const generationId = uuidv4();

  try {
    const {
      masterCVText,
      jobDescription,
      jobTitle = 'Unknown Job',
      templateType = 'mix'
    } = req.body;

    // Validate inputs
    if (!masterCVText || masterCVText.trim().length < 100) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Master CV text is required and must be at least 100 characters',
        statusCode: 400
      });
    }

    if (!jobDescription || jobDescription.trim().length < 100) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Job description is required and must be at least 100 characters',
        statusCode: 400
      });
    }

    logger.info(`📄 [${generationId}] Starting CV generation for: ${jobTitle}`);

    // Step 1: Parse master CV
    const parsedCV = cvParser.parseCV(masterCVText);
    const parseValidation = cvParser.validateStructure(parsedCV);

    if (!parseValidation.valid) {
      logger.warn(`⚠️  [${generationId}] Parse issues: ${parseValidation.issues.join(', ')}`);
    }

    // Step 2: Compute baseline ATS score
    logger.info(`[${generationId}] Computing baseline ATS score...`);
    const atsBeforeRewrite = await atsService.computeATS(
      masterCVText,
      jobDescription
    );
    logger.info(
      `[${generationId}] Baseline ATS: ${atsBeforeRewrite.finalATS}% ${atsBeforeRewrite.color}`
    );

    // Step 3: For now, the optimized text is the same (will be enhanced with AI later)
    // In production, this would call Gemini API for AI optimization
    const optimizedText = masterCVText;

    // Step 4: Compute final ATS score
    logger.info(`[${generationId}] Recomputing ATS score...`);
    const atsAfterRewrite = await atsService.computeATS(
      optimizedText,
      jobDescription
    );
    const atsImprovement = atsAfterRewrite.finalATS - atsBeforeRewrite.finalATS;

    logger.info(
      `[${generationId}] ATS: ${atsBeforeRewrite.finalATS}% → ${atsAfterRewrite.finalATS}% (+${atsImprovement}%)`
    );

    // Step 5: Parse optimized CV
    const optimizedParsed = cvParser.parseCV(optimizedText);

    const totalTimeMs = Date.now() - startTime;

    // Build response
    const response = {
      success: true,
      generationId,
      atsScore: {
        finalATS: atsAfterRewrite.finalATS,
        color: atsAfterRewrite.color,
        colorName: atsAfterRewrite.colorName,
        keywordScore: atsAfterRewrite.keywordScore,
        skillScore: atsAfterRewrite.skillScore.percent,
        tfidfScore: atsAfterRewrite.tfidfScore,
        embeddingScore: atsAfterRewrite.embeddingScore,
        missingKeywords: atsAfterRewrite.missingKeywords.slice(0, 5),
        missingSkills: atsAfterRewrite.skillScore.missingSkills.slice(0, 5),
        recommendations: atsAfterRewrite.recommendations,
        advice: atsAfterRewrite.advice
      },
      atsComparison: {
        before: atsBeforeRewrite.finalATS,
        after: atsAfterRewrite.finalATS,
        improvement: atsImprovement,
        improvementPercent: atsBeforeRewrite.finalATS === 0 ? 0
          : parseFloat(((atsImprovement / atsBeforeRewrite.finalATS) * 100).toFixed(1))
      },
      generatedCV: optimizedParsed,
      jobTitle,
      templateType,
      metrics: {
        totalTimeMs
      }
    };

    logger.info(`✅ [${generationId}] CV generation completed successfully`);

    res.json(response);
  } catch (err) {
    logger.error(`❌ [${generationId}] CV generation failed:`, err);
    res.status(500).json({
      error: 'CV generation failed',
      message: err.message,
      statusCode: 500
    });
  }
});

/**
 * GET /api/cv/health
 * Health check for CV service
 */
router.get('/health', (req, res) => {
  res.json({
    service: 'CV Service',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

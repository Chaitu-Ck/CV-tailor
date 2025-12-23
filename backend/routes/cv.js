/**
 * CV Tailoring Routes
 * All CV generation and ATS scoring endpoints
 */

const express = require('express');
const router = express.Router();
const atsService = require('../services/atsService');
const cvParser = require('../services/cvParser');
const cvGenerator = require('../services/cvGenerator');
const docxExporter = require('../services/docxExporter');
const pdfExporter = require('../services/pdfExporter');
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
 * Now uses improved CV Generator with keyword optimization
 */
router.post('/generate-tailored', async (req, res) => {
  const startTime = Date.now();
  const generationId = uuidv4();

  try {
    const {
      masterCVText,
      jobDescription,
      jobTitle = 'Unknown Job',
      templateType = 'modern'
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

    // Use improved CV Generator (AWAIT the async function)
    const generationResult = await cvGenerator.generateOptimizedCV(
      masterCVText,
      jobDescription,
      jobTitle
    );

    // Parse optimized CV for response
    const optimizedParsed = cvParser.parseCV(generationResult.generatedText);

    const totalTimeMs = Date.now() - startTime;

    // Build response
    const response = {
      success: true,
      generationId: generationResult.generationId,
      atsScore: {
        finalATS: generationResult.atsScore.after.finalATS,
        color: generationResult.atsScore.after.color,
        colorName: generationResult.atsScore.after.colorName,
        keywordScore: generationResult.atsScore.after.keywordScore,
        skillScore: generationResult.atsScore.after.skillScore.percent,
        tfidfScore: generationResult.atsScore.after.tfidfScore,
        embeddingScore: generationResult.atsScore.after.embeddingScore,
        missingKeywords: generationResult.atsScore.after.missingKeywords.slice(0, 5),
        missingSkills: generationResult.atsScore.after.skillScore.missingSkills.slice(0, 5),
        recommendations: generationResult.atsScore.after.recommendations,
        advice: generationResult.atsScore.after.advice
      },
      atsComparison: {
        before: generationResult.atsScore.before.finalATS,
        after: generationResult.atsScore.after.finalATS,
        improvement: generationResult.atsScore.improvement,
        improvementPercent: generationResult.atsScore.improvementPercent
      },
      generatedCV: optimizedParsed,
      optimizations: generationResult.optimizations,
      appliedChanges: generationResult.appliedChanges,
      jobTitle,
      templateType,
      metrics: {
        totalTimeMs
      }
    };

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
 * POST /api/cv/export-docx
 * Export CV to DOCX format
 */
router.post('/export-docx', async (req, res) => {
  try {
    const { cvText, jobTitle = 'CV' } = req.body;

    if (!cvText) {
      return res.status(400).json({
        error: 'CV text is required',
        statusCode: 400,
      });
    }

    const { filename, filepath } = await docxExporter.exportToDocx(cvText, jobTitle);

    return res.json({
      success: true,
      filename,
      downloadUrl: `/exports/${filename}`,
    });
  } catch (err) {
    console.error('DOCX export failed', err);
    return res.status(500).json({
      error: 'DOCX export failed',
      message: err.message,
      statusCode: 500,
    });
  }
});

/**
 * POST /api/cv/export-pdf
 * Export CV to PDF format
 */
router.post('/export-pdf', async (req, res) => {
  try {
    const { cvText, jobTitle = 'CV' } = req.body;

    if (!cvText) {
      return res.status(400).json({
        error: 'CV text is required',
        statusCode: 400,
      });
    }

    const { filename, filepath } = await pdfExporter.exportToPdf(cvText, jobTitle);

    return res.json({
      success: true,
      filename,
      downloadUrl: `/exports/${filename}`,
    });
  } catch (err) {
    console.error('PDF export failed', err);
    return res.status(500).json({
      error: 'PDF export failed',
      message: err.message,
      statusCode: 500,
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

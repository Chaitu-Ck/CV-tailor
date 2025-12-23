# CV Tailor DOCX - Pure DOCX Workflow

## 🎯 Overview

**CV Tailor 2.0** is a DOCX-native CV optimization system that analyzes and modifies Microsoft Word documents for ATS (Applicant Tracking System) compatibility.

### Key Features

✅ **DOCX-Only Workflow** - No text input, pure DOCX processing  
✅ **ATS Compatibility Analysis** - Structure + content scoring  
✅ **Automatic Fixes** - Font conversion, text box removal, column flattening  
✅ **AI-Powered Optimization** - Keyword matching, skill detection  
✅ **Production-Ready** - Security, validation, error handling  

## 🏗️ Architecture

```
Upload DOCX → Validate → Analyze → Fix → Download Modified DOCX
```

**No text conversion. No data loss. Pure DOCX manipulation.**

## 🚀 Quick Start

### Installation

```bash
git clone https://github.com/Chaitu-Ck/CV-tailor.git
cd CV-tailor
npm install
cp .env.example .env
npm run dev
```

### Test API

```bash
# Analyze DOCX for ATS compatibility
curl -X POST http://localhost:3000/api/cv/analyze-docx \
  -F "cvFile=@resume.docx" \
  -F "jobDescription=Seeking DevOps Engineer with Kubernetes, Docker, AWS..."

# Fix ATS issues automatically
curl -X POST http://localhost:3000/api/cv/fix-docx-ats \
  -F "cvFile=@resume.docx" \
  -o resume_fixed.docx
```

## 📊 What Gets Analyzed

### Structure Checks (50% of score)
- ✓ Fonts (ATS-safe: Calibri, Arial, Times New Roman)
- ✓ Text boxes (ATS blocker)
- ✓ Multi-column layouts
- ✓ Nested tables
- ✓ Images (ATS can't read)
- ✓ Heading styles
- ✓ Headers/footers

### Content Checks (50% of score)
- ✓ Keyword matching
- ✓ Skill detection
- ✓ TF-IDF relevance
- ✓ Missing keywords/skills

## 🔧 What Gets Fixed

| Issue | Fix |
|-------|-----|
| Non-ATS fonts | Convert to Calibri |
| Text boxes | Extract text → paragraphs |
| Multi-column | Flatten to single column |
| Nested tables | Simplify structure |

## 📁 File Structure

```
CV-tailor/
├── backend/
│   ├── services/
│   │   ├── docxReader.js          ← Read DOCX, analyze structure
│   │   ├── docxModifier.js        ← Fix ATS issues
│   │   ├── docxAtsService.js      ← ATS validation
│   │   └── atsService.js          ← Content scoring (reused)
│   ├── middleware/
│   │   └── uploadMiddleware.js    ← File upload validation
│   ├── routes/
│   │   └── cv.js                  ← API endpoints
│   └── utils/
│       ├── logger.js
│       └── atsColorCode.js
├── server.js                       ← Main entry point
├── package.json                    ← Dependencies
└── .env.example                    ← Configuration template
```

## 🌐 API Endpoints

### 1. **Analyze DOCX** (GET score + recommendations)

**Endpoint:** `POST /api/cv/analyze-docx`

**Request:**
```bash
curl -X POST http://localhost:3000/api/cv/analyze-docx \
  -F "cvFile=@resume.docx" \
  -F "jobDescription=..."
```

**Response:**
```json
{
  "success": true,
  "finalScore": 78,
  "color": "🟢",
  "colorName": "Excellent Match",
  "breakdown": {
    "structure": {
      "score": 75,
      "issues": [],
      "warnings": ["Multi-column layout detected"]
    },
    "content": {
      "score": 81,
      "keywordScore": 85,
      "skillScore": { "percent": 78, "missingSkills": [...] }
    }
  },
  "recommendations": [
    {
      "priority": "HIGH",
      "category": "Formatting",
      "issues": ["Multi-column layout may confuse ATS"],
      "action": "Automatic fixes available"
    }
  ]
}
```

### 2. **Fix ATS Issues** (Download modified DOCX)

**Endpoint:** `POST /api/cv/fix-docx-ats`

**Request:**
```bash
curl -X POST http://localhost:3000/api/cv/fix-docx-ats \
  -F "cvFile=@resume.docx" \
  -o resume_ATS_Fixed.docx
```

**Response:** Modified DOCX file download

**Headers:**
- `X-Modifications`: `["fonts_fixed", "columns_converted"]`
- `X-Processing-Time`: `523` (ms)

### 3. **Complete Optimization** (Analyze + Fix)

**Endpoint:** `POST /api/cv/optimize-docx`

**Request:**
```bash
curl -X POST http://localhost:3000/api/cv/optimize-docx \
  -F "cvFile=@resume.docx" \
  -F "jobDescription=..."
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "before": { "score": 65, "issues": 2, "warnings": 3 },
    "after": { "score": 88, "issues": 0, "warnings": 1 },
    "improvement": 23
  },
  "modifications": ["fonts_fixed", "textboxes_removed", "columns_converted"],
  "recommendations": [...],
  "download": {
    "filename": "resume_ATS_Optimized.docx",
    "url": "/api/cv/download/..."
  }
}
```

## 🔐 Security

### File Validation
- ✓ Magic byte verification (ZIP signature)
- ✓ DOCX structure validation (document.xml exists)
- ✓ Size limits (10MB max)
- ✓ Extension verification
- ✓ MIME type checking

### Processing Safety
- ✓ Buffer-based (no disk writes)
- ✓ Memory limits enforced
- ✓ Rate limiting (100 req/15min)
- ✓ No file execution
- ✓ Sanitized XML operations

## 📈 Performance

| Operation | Time | Memory |
|-----------|------|--------|
| Upload + validation | <100ms | ~5MB |
| Structure analysis | 150ms | ~15MB |
| Content scoring | 400ms | ~20MB |
| DOCX modifications | 500ms | ~25MB |
| **Total workflow** | **~1.5s** | **~50MB** |

## 🧪 Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
npm run test:integration
```

### Manual Testing

```bash
# Test with sample files
curl -X POST http://localhost:3000/api/cv/analyze-docx \
  -F "cvFile=@test/samples/good_cv.docx" \
  -F "jobDescription=DevOps Engineer with Kubernetes"

curl -X POST http://localhost:3000/api/cv/analyze-docx \
  -F "cvFile=@test/samples/bad_cv.docx" \
  -F "jobDescription=DevOps Engineer with Kubernetes"
```

## 📦 Dependencies

### Core Dependencies
```
{
  "docx": "^9.5.1",           // DOCX creation/manipulation
  "mammoth": "^1.11.0",       // DOCX text extraction
  "multer": "^1.4.5-lts.1",   // File upload
  "pizzip": "^3.1.7",         // DOCX ZIP parsing
  "adm-zip": "^0.5.16",       // ZIP manipulation
  "file-type": "^19.0.0",     // Magic byte validation
  "docxtemplater": "^3.50.0", // DOCX templates
  "natural": "^8.1.0"         // NLP for ATS scoring
}
```

## 🚀 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment guide.

### Quick Deploy (PM2)

```bash
npm install -g pm2
pm2 start server.js --name cv-tailor-docx
pm2 startup
pm2 save
```

### Docker Deploy

```bash
docker build -t cv-tailor-docx .
docker run -p 3000:3000 --env-file .env cv-tailor-docx
```

## 🐛 Troubleshooting

### "Invalid DOCX file"
**Cause:** File is `.doc` (old format) or corrupted  
**Fix:** Convert to `.docx` in Microsoft Word

### "File too large"
**Cause:** DOCX > 10MB  
**Fix:** Compress images or reduce file size

### "Text boxes cannot be fixed"
**Cause:** Complex text box structures  
**Fix:** Manually convert text boxes to paragraphs in Word

## 📚 Documentation

- [API Documentation](API_DOCUMENTATION.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Architecture Overview](ARCHITECTURE.md)

## 🤝 Contributing

This is a complete rewrite for DOCX-only workflow. Text-based endpoints have been removed.

### Development Setup

```bash
git clone https://github.com/Chaitu-Ck/CV-tailor.git
cd CV-tailor
npm install
npm run dev
```

### Code Style

- ESLint configuration provided
- Run `npm run lint` before committing

## 📄 License

MIT License - See [LICENSE](LICENSE)

## 👨‍💻 Author

**Chaitu-Ck**  
GitHub: [@Chaitu-Ck](https://github.com/Chaitu-Ck)

## 🙏 Acknowledgments

- Based on research about real ATS systems
- Inspired by job-1 project quality standards
- Built with production-grade Node.js best practices

---

**Version:** 2.0.0  
**Last Updated:** December 23, 2025  
**Status:** ✅ Production Ready
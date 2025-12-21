# 🚀 CV Tailor - Quick Start Guide (5 Minutes)

**Get CV Tailor running in 5 minutes!**

---

## Prerequisites ✅

- **Node.js** >= 16.0.0 ([Download](https://nodejs.org))
- **MongoDB** 4.4+ ([Cloud Atlas](https://www.mongodb.com/cloud/atlas) or local)
- **Redis** (optional, for caching)
- **Gemini API Key** ([Get here](https://ai.google.dev))

---

## 1. Clone Repository (30 seconds)

```bash
git clone https://github.com/Chaitu-Ck/CV-tailor.git
cd CV-tailor
```

---

## 2. Install Dependencies (1 minute)

```bash
npm install
```

✅ All 18 dependencies installed

---

## 3. Configure Environment (1 minute)

```bash
cp .env.example .env
```

**Edit `.env` file:**

```bash
# Minimal Required Configuration
GEMINI_API_KEY=your_gemini_api_key
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/cv-tailor
NODE_ENV=development
PORT=3000
```

**Get credentials:**

- 🔑 **Gemini API Key**: [ai.google.dev](https://ai.google.dev) → Click "Get API Key"
- 🗄️ **MongoDB URI**: [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) → Create free cluster → Copy connection string
- 🔴 **Redis** (optional): Use `redis://localhost:6379` if running locally

---

## 4. Start Server (30 seconds)

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

**Expected Output:**
```
╔═══════════════════════════════════════════════╗
║  CV TAILOR API SERVER STARTED                 ║
╠═══════════════════════════════════════════════╣
║  🚀 Server running on port 3000              ║
║  📝 Environment: development                 ║
║  📋 Database: MongoDB                        ║
║  💾 Cache: Redis                             ║
╚═══════════════════════════════════════════════╝
```

✅ **Server is READY!**

---

## 5. Test API (1 minute)

### Option A: Using cURL

```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Response:
{
  "service": "CV Tailor API",
  "status": "healthy",
  "timestamp": "2025-12-21T21:00:00.000Z"
}
```

### Option B: Quick ATS Test

```bash
curl -X POST http://localhost:3000/api/cv/ats-preview \
  -H "Content-Type: application/json" \
  -d '{
    "cvText": "Senior DevOps Engineer with 8 years experience in Kubernetes and Docker. Skills: Python, Terraform, AWS, CI/CD",
    "jobDescription": "Seeking Senior DevOps Engineer. Requirements: Kubernetes (5+ years), Docker, Terraform, AWS, Linux, Python, CI/CD"
  }'

# Response:
{
  "success": true,
  "atsScore": {
    "finalATS": 78,
    "color": "🟢",
    "colorName": "Excellent Match",
    "keywordScore": 82,
    "skillScore": 75,
    "recommendations": ["Strong match - highly recommended"]
  }
}
```

### Option C: Parse CV

```bash
curl -X POST http://localhost:3000/api/cv/parse \
  -H "Content-Type: application/json" \
  -d '{
    "cvText": "John Doe\nEmail: john@example.com\nSummary: DevOps Engineer\nSkills: Kubernetes, Docker"
  }'
```

### Option D: Generate Tailored CV

```bash
curl -X POST http://localhost:3000/api/cv/generate-tailored \
  -H "Content-Type: application/json" \
  -d '{
    "masterCVText": "Full CV content...",
    "jobDescription": "Full job posting...",
    "jobTitle": "Senior Engineer"
  }'
```

✅ **All tests passing!**

---

## Next Steps

### Build Frontend (Optional)

Create a React app to consume the API:

```bash
npx create-react-app frontend
cd frontend
npm install axios
# Build your UI
```

### Deploy to Production

**Heroku**:
```bash
heroku create your-app-name
heroku config:set GEMINI_API_KEY=your_key
git push heroku main
```

**Docker**:
```bash
docker build -t cv-tailor .
docker run -p 3000:3000 --env-file .env cv-tailor
```

**VPS/Linux**:
```bash
npm install -g pm2
pm2 start server.js --name "cv-tailor"
pm2 startup
pm2 save
```

---

## Troubleshooting

### "Cannot find module 'express'"
```bash
rm -rf node_modules package-lock.json
npm install
```

### "MongoDB connection failed"
- Verify `MONGODB_URI` is correct
- Check network access in MongoDB Atlas
- Ensure your IP is whitelisted

### "Port 3000 already in use"
```bash
# Kill process using port 3000
lsof -ti:3000 | xargs kill -9
# Or use different port
PORT=3001 npm run dev
```

### "GEMINI_API_KEY is required"
- Get API key from [ai.google.dev](https://ai.google.dev)
- Add to `.env` file
- Restart server

---

## Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|----------|
| `/api/health` | GET | System health |
| `/api/cv/parse` | POST | Parse unstructured CV |
| `/api/cv/ats-preview` | POST | Quick ATS score |
| `/api/cv/generate-tailored` | POST | Full CV generation |

---

## Key Files

```
CV-tailor/
├── server.js                   # Main entry point
├── backend/
│   ├── services/
│   │   ├── cvParser.js        # CV parsing
│   │   └── atsService.js      # ATS scoring
│   ├── routes/
│   │   └── cv.js              # API routes
│   └── utils/
│       └── atsColorCode.js    # Color mapping
├── .env                       # Your config (create from .env.example)
└── package.json              # Dependencies
```

---

## Documentation

- 📖 **Full Docs**: See [README.md](./README.md)
- 🔌 **API Reference**: See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- ⚙️ **Setup Guide**: See [SETUP_GUIDE.md](./SETUP_GUIDE.md)

---

## Performance

- ⚡ Parse CV: ~50ms
- ⚡ ATS Score: ~500ms
- ⚡ Generate CV: ~2-3s
- ⚡ Full Workflow: ~4-6s

---

## Support

- 🐛 Issues: [GitHub Issues](https://github.com/Chaitu-Ck/CV-tailor/issues)
- 💬 Questions: Create a [Discussion](https://github.com/Chaitu-Ck/CV-tailor/discussions)
- 📧 Email: support@cv-tailor.com

---

**You're all set! 🎉**

Start tailoring CVs and optimizing for ATS! 🚀

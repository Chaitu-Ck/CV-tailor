# CV Tailor DOCX - Deployment Guide

## 🎯 System Requirements

- Node.js >= 18.0.0
- NPM >= 9.0.0
- 2GB RAM minimum
- 10GB disk space

## 📦 Installation

### 1. Clone Repository

```bash
cd ~/Documents
git clone https://github.com/Chaitu-Ck/CV-tailor.git
cd CV-tailor
```

### 2. Install Dependencies

```bash
npm install
```

**New dependencies installed:**
- `multer@1.4.5-lts.1` - File upload
- `adm-zip@0.5.16` - DOCX ZIP manipulation
- `file-type@19.0.0` - Magic byte validation
- `pizzip@3.1.7` - DOCX parsing
- `docxtemplater@3.50.0` - DOCX templates

### 3. Configure Environment

```bash
cp .env.example .env
nano .env
```

**Required settings:**
```
PORT=3000
NODE_ENV=production
GEMINI_API_KEY=your_actual_key
```

### 4. Start Server

**Development**
```bash
npm run dev
```

**Production**
```bash
npm start
```

## 🧪 Testing

### Test 1: Analyze DOCX

```bash
curl -X POST http://localhost:3000/api/cv/analyze-docx \
-F "cvFile=@resume.docx" \
-F "jobDescription=Seeking Senior DevOps Engineer with Kubernetes, Docker, AWS..."
```

**Expected Response:**
```json
{
"success": true,
"finalScore": 75,
"breakdown": {
"structure": {
"score": 70,
"issues": [],
"warnings": [...]
},
"content": {
"score": 80,
"keywordScore": 75,
"skillScore": {...}
}
},
"recommendations": [...]
}
```

### Test 2: Fix ATS Issues

```bash
curl -X POST http://localhost:3000/api/cv/fix-docx-ats \
-F "cvFile=@resume.docx" \
-o resume_fixed.docx
```

**Expected:** Downloads `resume_ATS_Fixed.docx`

### Test 3: Complete Optimization

```bash
curl -X POST http://localhost:3000/api/cv/optimize-docx \
-F "cvFile=@resume.docx" \
-F "jobDescription=..." \
| jq
```

## 📊 API Endpoints

| Endpoint | Method | Purpose | Input | Output |
|----------|--------|---------|-------|--------|
| `/api/cv/analyze-docx` | POST | Analyze ATS compatibility | DOCX + Job Desc | JSON analysis |
| `/api/cv/fix-docx-ats` | POST | Fix ATS issues | DOCX | Modified DOCX |
| `/api/cv/optimize-docx` | POST | Complete workflow | DOCX + Job Desc | Analysis + DOCX |
| `/api/cv/health` | GET | Health check | - | JSON status |

## 🔒 Security Features

1. **File Validation**
   - Magic byte verification
   - ZIP structure validation
   - Size limits (10MB max)
   - Extension verification

2. **Rate Limiting**
   - 100 requests per 15 minutes
   - Per-IP tracking

3. **Memory Safety**
   - Buffer-based processing
   - No disk writes
   - Automatic garbage collection

## 🚀 Production Deployment

### Using PM2

```bash
npm install -g pm2

pm2 start server.js --name "cv-tailor-docx"
pm2 startup
pm2 save
```

### Using Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

```bash
docker build -t cv-tailor-docx .
docker run -p 3000:3000 --env-file .env cv-tailor-docx
```

### Using Systemd

```bash
sudo nano /etc/systemd/system/cv-tailor.service
```

```
[Unit]
Description=CV Tailor DOCX Service
After=network.target

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/CV-tailor
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable cv-tailor
sudo systemctl start cv-tailor
sudo systemctl status cv-tailor
```

## 📈 Performance Tuning

### Recommended Server Specs

- **Development:** 2GB RAM, 2 vCPU
- **Production (< 1000 users):** 4GB RAM, 2 vCPU
- **Production (> 1000 users):** 8GB RAM, 4 vCPU

### Performance Benchmarks

| Operation | Time | Memory |
|-----------|------|--------|
| DOCX upload validation | <50ms | ~5MB |
| Structure analysis | 100-200ms | ~15MB |
| Content ATS scoring | 300-500ms | ~20MB |
| DOCX modification | 400-600ms | ~25MB |
| Complete optimization | 1-2s | ~50MB |

## 🐛 Troubleshooting

### Issue: "Invalid DOCX file"

**Solution:** Ensure file is `.docx` (not `.doc` or `.odt`)

### Issue: "File too large"

**Solution:** Compress images in DOCX or reduce file size

### Issue: "Memory limit exceeded"

**Solution:** Increase Node.js memory:
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

### Health Check

```bash
curl http://localhost:3000/api/cv/health
```

### Logs

**View logs**
```bash
tail -f logs/combined.log
```

**Error logs only**
```bash
tail -f logs/error.log
```

## 🔄 Updates

```bash
git pull origin main
npm install
pm2 restart cv-tailor-docx
```
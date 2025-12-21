# CV Tailor API Documentation

**Version**: 1.0.0  
**Base URL**: `http://localhost:3000/api`  
**Authentication**: Currently open (JWT coming soon)

---

## Table of Contents
1. [Health Endpoints](#health-endpoints)
2. [CV Parsing](#cv-parsing)
3. [ATS Scoring](#ats-scoring)
4. [CV Generation](#cv-generation)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Code Examples](#code-examples)

---

## Health Endpoints

### 1. System Health Check

**Endpoint**: `GET /health`

**Description**: Check overall system health including database and cache connections.

**Request**:
```http
GET /health HTTP/1.1
Host: localhost:3000
```

**Response** (200 OK):
```json
{
  "service": "CV Tailor API",
  "status": "healthy",
  "timestamp": "2025-12-21T21:00:00.000Z",
  "version": "1.0.0",
  "database": "connected",
  "cache": "connected"
}
```

---

### 2. Database Health

**Endpoint**: `GET /health/db`

**Description**: Check MongoDB connection status.

**Response** (200 OK):
```json
{
  "service": "MongoDB",
  "status": "connected",
  "database": "cv-tailor",
  "timestamp": "2025-12-21T21:00:00.000Z"
}
```

---

## CV Parsing

### Parse Unstructured CV

**Endpoint**: `POST /cv/parse`

**Description**: Convert unstructured CV text into structured JSON format.

**Request Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "cvText": "John Doe\nEmail: john@example.com\nPhone: +44 20 1234 5678\n\nSummary\nExperienced DevOps engineer with 8 years...\n\nExperience\nSenior DevOps Engineer | Tech Corp | 2020-2023\n- Led Kubernetes migration\n- Reduced deployment time by 40%\n\nSkills\nKubernetes, Docker, Terraform, Python, AWS\n\nEducation\nB.Sc. Computer Science | University of London | 2015"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "parsed": {
    "header": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+44 20 1234 5678",
      "location": "",
      "linkedin": ""
    },
    "summary": "Experienced DevOps engineer with 8 years...",
    "skills": [
      "Kubernetes",
      "Docker",
      "Terraform",
      "Python",
      "AWS"
    ],
    "experience": [
      {
        "title": "Senior DevOps Engineer",
        "company": "Tech Corp",
        "location": "",
        "startDate": "2020",
        "endDate": "2023",
        "bullets": [
          "Led Kubernetes migration",
          "Reduced deployment time by 40%"
        ]
      }
    ],
    "education": [
      {
        "degree": "B.Sc. Computer Science",
        "institution": "University of London",
        "location": "",
        "year": "2015"
      }
    ],
    "certifications": [],
    "projects": []
  },
  "validation": {
    "valid": true,
    "issues": []
  }
}
```

**Error Response** (400 Bad Request):
```json
{
  "error": "Validation Error",
  "message": "CV text is required",
  "statusCode": 400
}
```

---

## ATS Scoring

### Quick ATS Preview

**Endpoint**: `POST /cv/ats-preview`

**Description**: Quick ATS scoring without full CV generation. Returns color-coded feedback.

**Request Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "cvText": "Senior DevOps Engineer with 8 years experience. Skills: Kubernetes, Docker, Terraform, Python, AWS, CI/CD",
  "jobDescription": "Seeking Senior DevOps Engineer. Requirements: Kubernetes (5+ years), Docker, Terraform, AWS, Linux, strong Python skills, experience with CI/CD pipelines"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "atsScore": {
    "finalATS": 78,
    "color": "🟢",
    "colorName": "Excellent Match",
    "keywordScore": 82,
    "skillScore": 75,
    "tfidfScore": 76,
    "embeddingScore": 76,
    "missingKeywords": [
      "linux",
      "ansible",
      "jenkins",
      "security",
      "monitoring"
    ],
    "missingSkills": [
      "linux",
      "ansible",
      "jenkins"
    ],
    "recommendations": [
      "🚀 Strong ATS match — excellent application opportunity."
    ],
    "advice": [
      "✅ Strong match. Highly recommended to apply.",
      "🔧 Consider adding: linux, ansible, jenkins"
    ]
  }
}
```

### ATS Score Breakdown

The `finalATS` score is calculated as a weighted average:

```
finalATS = (keywordScore × 0.30) + 
           (skillScore × 0.25) + 
           (tfidfScore × 0.20) + 
           (embeddingScore × 0.25)
```

**Score Ranges & Color Codes**:

| Score | Color | Meaning |
|-------|-------|----------|
| 91-100 | 🟢 | Perfect Match - High priority |
| 76-90 | 🟢 | Excellent Match - Highly recommended |
| 61-75 | 🟡 | Good Match - Room for improvement |
| 41-60 | 🟠 | Moderate Match - Significant gaps |
| 0-40 | 🔴 | Critical Gaps - Consider alternatives |

**Error Response** (400 Bad Request):
```json
{
  "error": "Validation Error",
  "message": "cvText and jobDescription are required",
  "statusCode": 400
}
```

---

## CV Generation

### Generate Job-Tailored CV

**Endpoint**: `POST /cv/generate-tailored`

**Description**: Main endpoint for full CV tailoring with ATS analysis and optimization.

**Request Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "masterCVText": "Full unstructured CV text here...",
  "jobDescription": "Full job posting text here...",
  "jobTitle": "Senior DevOps Engineer",
  "templateType": "modern"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "generationId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "atsScore": {
    "finalATS": 78,
    "color": "🟢",
    "colorName": "Excellent Match",
    "keywordScore": 82,
    "skillScore": 75,
    "tfidfScore": 76,
    "embeddingScore": 76,
    "missingKeywords": ["linux", "ansible"],
    "missingSkills": ["linux", "ansible"],
    "recommendations": ["Strong match - highly recommended"],
    "advice": ["✅ Strong match. Highly recommended to apply."]
  },
  "atsComparison": {
    "before": 62,
    "after": 78,
    "improvement": 16,
    "improvementPercent": 25.8
  },
  "generatedCV": {
    "header": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+44 20 1234 5678",
      "location": "",
      "linkedin": ""
    },
    "summary": "Optimized summary for job...",
    "skills": [...],
    "experience": [...],
    "education": [...]
  },
  "jobTitle": "Senior DevOps Engineer",
  "templateType": "modern",
  "metrics": {
    "totalTimeMs": 2340
  }
}
```

**Request Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `masterCVText` | string | Yes | Full CV content (min 100 chars) |
| `jobDescription` | string | Yes | Job posting (min 100 chars) |
| `jobTitle` | string | No | Job title for tracking |
| `templateType` | string | No | Template style: `modern`, `traditional`, `mix` (default: `mix`) |

**Error Responses**:

```json
{
  "error": "Validation Error",
  "message": "Master CV text is required and must be at least 100 characters",
  "statusCode": 400
}
```

```json
{
  "error": "CV generation failed",
  "message": "Timeout waiting for Gemini API response",
  "statusCode": 500
}
```

---

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "error": "Error Type",
  "message": "Human-readable error message",
  "statusCode": 400,
  "stack": "Error stack trace (development only)"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|----------|
| 200 | Success |
| 400 | Bad Request - Invalid input |
| 404 | Not Found - Endpoint doesn't exist |
| 429 | Too Many Requests - Rate limited |
| 500 | Server Error - Internal error |
| 503 | Service Unavailable - Database/external service down |

### Common Error Scenarios

**Missing Required Field**:
```json
{
  "error": "Validation Error",
  "message": "cvText and jobDescription are required",
  "statusCode": 400
}
```

**Invalid Format**:
```json
{
  "error": "Validation Error",
  "message": "Master CV text is required and must be at least 100 characters",
  "statusCode": 400
}
```

**Database Error**:
```json
{
  "error": "Database Error",
  "message": "MongoDB connection failed",
  "statusCode": 500
}
```

---

## Rate Limiting

### Limits
- **Default**: 5 CV generations per hour per IP
- **Window**: 3600 seconds (1 hour)

### Rate Limit Headers

Responses include rate limit information:

```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1640091600
```

### Rate Limit Response (429)

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Max 5 requests per hour.",
  "statusCode": 429,
  "retryAfter": 300
}
```

---

## Code Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

const client = axios.create({
  baseURL: 'http://localhost:3000/api'
});

// Quick ATS Preview
async function previewATS(cvText, jobDescription) {
  try {
    const response = await client.post('/cv/ats-preview', {
      cvText,
      jobDescription
    });
    console.log(`ATS Score: ${response.data.atsScore.finalATS}% ${response.data.atsScore.color}`);
    return response.data.atsScore;
  } catch (error) {
    console.error('Error:', error.response.data);
  }
}

// Parse CV
async function parseCV(cvText) {
  try {
    const response = await client.post('/cv/parse', { cvText });
    console.log('Parsed CV:', response.data.parsed);
    return response.data.parsed;
  } catch (error) {
    console.error('Error:', error.response.data);
  }
}

// Generate Tailored CV
async function generateTailoredCV(masterCV, jobDescription, jobTitle) {
  try {
    const response = await client.post('/cv/generate-tailored', {
      masterCVText: masterCV,
      jobDescription,
      jobTitle
    });
    console.log(`\nGeneration Results:`);
    console.log(`ID: ${response.data.generationId}`);
    console.log(`ATS: ${response.data.atsComparison.before}% → ${response.data.atsComparison.after}%`);
    console.log(`Improvement: +${response.data.atsComparison.improvement}%`);
    return response.data;
  } catch (error) {
    console.error('Error:', error.response.data);
  }
}

// Usage
(async () => {
  const cvText = `John Doe
  Email: john@example.com
  ...(full CV text)...`;
  
  const jobDesc = `Senior DevOps Engineer
  Requirements: Kubernetes, Docker, Terraform
  ...(full job posting)...`;
  
  await previewATS(cvText, jobDesc);
  await parseCV(cvText);
  await generateTailoredCV(cvText, jobDesc, 'Senior DevOps Engineer');
})();
```

### Python

```python
import requests
import json

BASE_URL = 'http://localhost:3000/api'

def ats_preview(cv_text, job_description):
    """Quick ATS preview"""
    response = requests.post(
        f'{BASE_URL}/cv/ats-preview',
        json={
            'cvText': cv_text,
            'jobDescription': job_description
        }
    )
    if response.status_code == 200:
        data = response.json()
        print(f"ATS Score: {data['atsScore']['finalATS']}% {data['atsScore']['color']}")
        return data['atsScore']
    else:
        print(f"Error: {response.text}")
        return None

def generate_tailored_cv(master_cv, job_description, job_title):
    """Generate tailored CV"""
    response = requests.post(
        f'{BASE_URL}/cv/generate-tailored',
        json={
            'masterCVText': master_cv,
            'jobDescription': job_description,
            'jobTitle': job_title
        }
    )
    if response.status_code == 200:
        data = response.json()
        print(json.dumps(data, indent=2))
        return data
    else:
        print(f"Error: {response.text}")
        return None

# Usage
if __name__ == '__main__':
    cv = """John Doe
    Email: john@example.com
    ..."""
    
    job = """Senior DevOps Engineer
    ..."""
    
    ats_preview(cv, job)
    generate_tailored_cv(cv, job, 'Senior DevOps Engineer')
```

### cURL

```bash
# Health check
curl http://localhost:3000/api/health

# ATS preview
curl -X POST http://localhost:3000/api/cv/ats-preview \
  -H "Content-Type: application/json" \
  -d '{
    "cvText": "Senior DevOps...",
    "jobDescription": "We seek DevOps..."
  }'

# Parse CV
curl -X POST http://localhost:3000/api/cv/parse \
  -H "Content-Type: application/json" \
  -d '{"cvText": "John Doe..."}

# Generate tailored CV
curl -X POST http://localhost:3000/api/cv/generate-tailored \
  -H "Content-Type: application/json" \
  -d '{
    "masterCVText": "...",
    "jobDescription": "...",
    "jobTitle": "Senior DevOps Engineer"
  }'
```

---

## Support & Questions

For API support:
- 📧 Email: api-support@cv-tailor.com
- 🐛 Issues: [GitHub Issues](https://github.com/Chaitu-Ck/CV-tailor/issues)
- 📚 Docs: [Full Documentation](https://github.com/Chaitu-Ck/CV-tailor)

---

**Last Updated**: 2025-12-21  
**API Version**: 1.0.0  
**Status**: ✅ Production Ready

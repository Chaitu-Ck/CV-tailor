Two things are happening here:  
1) Gemini model name is invalid, so AI is falling back.  
2) You want DOCX + PDF download endpoints wired into the backend.

---

## 1. Fix the Gemini 404 error

The error says:

> `models/gemini-pro is not found for API version v1beta ... Call ListModels to see the list of available models`

That means `gemini-pro` is no longer a valid model string for the SDK / API version you’re using.[1][2]

### What to change

In `backend/services/geminiService.js` (or wherever you construct the client), you likely have something like:

```js
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-pro' });
```

Update your `.env` and default to a currently supported model, for example:

```env
# .env
GEMINI_MODEL=gemini-1.5-pro
```

And keep the JS as:

```js
const model = genAI.getGenerativeModel({
  model: process.env.GEMINI_MODEL || 'gemini-1.5-pro',
});
```

After editing `.env`, restart the backend (`npm run dev`) so the new model name is loaded.

***

## 2. Add DOCX + PDF download feature

You already log `DOCX`/`PDF` intent; now expose proper endpoints.

### 2.1 DOCX export route

In `backend/routes/cv.js`, add:

```js
const express = require('express');
const router = express.Router();
const docxExporter = require('../services/docxExporter');

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
```

And in your main `server.js` / `app.js`:

```js
const path = require('path');

// serve exported files
app.use('/exports', express.static(path.join(__dirname, 'exports')));
```

Now the frontend can:

1. POST `/api/cv/export-docx` with `{ cvText, jobTitle }`.
2. Receive `downloadUrl` (e.g. `/exports/CV_cyber_security_1766447026918.docx`).
3. Open that URL in the browser to download.

---

### 2.2 PDF export service + route (simple)

If you want a basic “convert text to PDF” using `pdfkit`, add a service `backend/services/pdfExporter.js`:

```js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const EXPORT_DIR = process.env.EXPORT_DIRECTORY || path.join(__dirname, '..', 'exports');

function safeFileName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

async function exportToPdf(cvText, jobTitle = 'CV') {
  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }

  const ts = Date.now();
  const baseName = safeFileName(jobTitle || 'cv');
  const filename = `CV_${baseName}_${ts}.pdf`;
  const filepath = path.join(EXPORT_DIR, filename);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filepath);

    stream.on('finish', resolve);
    stream.on('error', reject);

    doc.pipe(stream);

    doc.fontSize(14).text(jobTitle, { align: 'center' });
    doc.moveDown();
    doc.fontSize(11).text(cvText, { align: 'left' });

    doc.end();
  });

  return { filename, filepath };
}

module.exports = { exportToPdf };
```

Then in `backend/routes/cv.js`:

```js
const pdfExporter = require('../services/pdfExporter');

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
```

The same static `app.use('/exports', ...)` covers both DOCX and PDF downloads.

***

## 3. Frontend usage pattern

Once backend is wired:

1. User clicks “Download DOCX”:
   - Send POST `/api/cv/export-docx` with the *current optimized CV text*.
   - On success, redirect browser to `downloadUrl` to trigger download.

2. User clicks “Download PDF”:
   - Same pattern but POST `/api/cv/export-pdf`.

***

If you paste your current `geminiService.js` and `docxExporter.js`, a tailored diff can be provided so you can drop it in with minimal changes.

[1](https://ai.google.dev/gemini-api/docs/models)
[2](https://www.datastudios.org/post/all-gemini-models-available-in-2025-complete-list-for-web-app-api-and-vertex-ai)
[3](http://pubs.rsna.org/doi/10.1148/radiol.241646)
[4](https://ieeexplore.ieee.org/document/11157547/)
[5](https://www.semanticscholar.org/paper/ccb1362d58a116e2d36b722f4dac957150b3ae76)
[6](https://arxiv.org/abs/2511.00362)
[7](https://www.frontiersin.org/articles/10.3389/fdgth.2025.1692517/full)
[8](https://arxiv.org/abs/2507.12185)
[9](https://dl.acm.org/doi/10.1145/3708557.3716363)
[10](https://ieeexplore.ieee.org/document/10963154/)
[11](https://www.ntnu.no/ojs/index.php/nikt/article/view/6525)
[12](https://ajpojournals.org/journals/index.php/AJCE/article/view/2586)
[13](https://arxiv.org/abs/2503.20523)
[14](http://arxiv.org/pdf/2312.11805.pdf)
[15](https://arxiv.org/pdf/2309.17080.pdf)
[16](http://arxiv.org/pdf/2403.05530.pdf)
[17](https://arxiv.org/html/2312.05272v3)
[18](http://arxiv.org/pdf/2405.09818.pdf)
[19](http://arxiv.org/pdf/2402.15391.pdf)
[20](https://arxiv.org/html/2502.08576v1)
[21](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models)
[22](https://deepmind.google/models/)
[23](https://eminencetechnology.com/the-most-used-generative-ai-models-in-2025-a-complete-guide)
[24](https://www.hixx.ai/blog/innovations-and-research/difference-between-gemini-15-flash-and-gemini-15-pro)
[25](https://www.youtube.com/watch?v=PG_wMYCaago)
[26](https://blog.google/technology/ai/google-ai-updates-october-2025/)
[27](https://developers.googleblog.com/gemini-15-pro-now-available-in-180-countries-with-native-audio-understanding-system-instructions-json-mode-and-more/)
[28](https://unpkg.com/docx@1.2.0/README.md)
[29](https://orca.security/resources/blog/most-popular-ai-models-2025/)
[30](https://www.helicone.ai/comparison/gemini-pro-on-google-vs-gemini-1.5-pro-latest-on-google)
[31](https://www.npmjs.com/package/docx)
[32](https://cloud.google.com/vertex-ai)
[33](https://blog.promptlayer.com/an-analysis-of-google-models-gemini-1-5-flash-vs-1-5-pro/)
[34](https://dev.to/golam_mostafa/pdf-excel-docx-generate-on-react-and-node-js-2keh)
[35](https://www.ai-supremacy.com/p/all-of-googles-ai-products-and-tools-gemini-2025)
[36](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/migrate)
[37](https://stackoverflow.com/questions/71399682/how-to-use-docx-npm-package-in-production-to-save-a-file)
[38](https://cloud.google.com/vertex-ai/generative-ai/docs/model-garden/available-models?hl=it)
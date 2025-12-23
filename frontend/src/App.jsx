import React, { useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CVUploader from './components/CVUploader';
import JobDescriptionInput from './components/JobDescriptionInput';
import ATSCard from './components/ATSCard';
import CVComparison from './components/CVComparison';
import GenerationProgress from './components/GenerationProgress';
import './App.css';

function App() {
  const [cvText, setCVText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [atsScore, setATSScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview, 3: Results
  const [generationData, setGenerationData] = useState(null);
  const [originalCV, setOriginalCV] = useState(null);

  const handleCVUpload = (text) => {
    setCVText(text);
    setOriginalCV(text);
    setStep(2);
  };

  const handleATSPreview = async () => {
    if (!cvText.trim() || !jobDescription.trim()) {
      toast.error('Please provide both CV and job description');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/cv/ats-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText, jobDescription })
      });

      if (!response.ok) throw new Error('Failed to calculate ATS score');

      const data = await response.json();
      setATSScore(data.atsScore);
      toast.success('ATS score calculated!');
    } catch (error) {
      toast.error(error.message || 'Error calculating ATS score');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTailoredCV = async () => {
    if (!cvText.trim() || !jobDescription.trim()) {
      toast.error('Please provide both CV and job description');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/cv/generate-tailored', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterCVText: cvText,
          jobDescription,
          jobTitle: jobTitle || 'Job',
          templateType: 'modern'
        })
      });

      if (!response.ok) throw new Error('Failed to generate tailored CV');

      const data = await response.json();
      setGenerationData(data);
      setATSScore(data.atsScore);
      setStep(3);
      toast.success('CV tailored successfully!');
    } catch (error) {
      toast.error(error.message || 'Error generating tailored CV');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDOCX = async () => {
    if (!generationData) {
      toast.error('No CV to download');
      return;
    }

    setDownloading(true);
    try {
      // Reconstruct CV text from generated CV data
      const cvTextToExport = reconstructCVText(generationData.generatedCV);

      const response = await fetch('/api/cv/export-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvText: cvTextToExport,
          jobTitle: jobTitle || 'CV'
        })
      });

      if (!response.ok) throw new Error('Failed to generate DOCX');

      const data = await response.json();
      
      // Open download URL in new tab
      window.open(data.downloadUrl, '_blank');
      toast.success('📄 DOCX downloaded successfully!');
    } catch (error) {
      toast.error(error.message || 'Error downloading DOCX');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!generationData) {
      toast.error('No CV to download');
      return;
    }

    setDownloading(true);
    try {
      // Reconstruct CV text from generated CV data
      const cvTextToExport = reconstructCVText(generationData.generatedCV);

      const response = await fetch('/api/cv/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvText: cvTextToExport,
          jobTitle: jobTitle || 'CV'
        })
      });

      if (!response.ok) throw new Error('Failed to generate PDF');

      const data = await response.json();
      
      // Open download URL in new tab
      window.open(data.downloadUrl, '_blank');
      toast.success('📑 PDF downloaded successfully!');
    } catch (error) {
      toast.error(error.message || 'Error downloading PDF');
    } finally {
      setDownloading(false);
    }
  };

  // Helper function to reconstruct CV text from parsed CV object
  const reconstructCVText = (parsedCV) => {
    const lines = [];

    // Header
    if (parsedCV.header) {
      if (parsedCV.header.name) lines.push(parsedCV.header.name.toUpperCase());
      const contact = [
        parsedCV.header.location,
        parsedCV.header.phone,
        parsedCV.header.email,
        parsedCV.header.linkedin
      ].filter(x => x).join(' | ');
      if (contact) lines.push(contact);
      lines.push('');
    }

    // Summary
    if (parsedCV.summary) {
      lines.push('PROFESSIONAL SUMMARY');
      lines.push(parsedCV.summary);
      lines.push('');
    }

    // Skills
    if (parsedCV.skills && parsedCV.skills.length > 0) {
      lines.push('CORE COMPETENCIES');
      lines.push(parsedCV.skills.join(', '));
      lines.push('');
    }

    // Experience
    if (parsedCV.experience && parsedCV.experience.length > 0) {
      lines.push('PROFESSIONAL EXPERIENCE');
      parsedCV.experience.forEach(exp => {
        lines.push('');
        lines.push(`${exp.title} | ${exp.company}`);
        if (exp.startDate || exp.endDate) {
          lines.push(`${exp.startDate || ''} - ${exp.endDate || 'Present'}`);
        }
        if (exp.bullets) {
          exp.bullets.forEach(bullet => {
            lines.push(`  • ${bullet}`);
          });
        }
      });
      lines.push('');
    }

    // Education
    if (parsedCV.education && parsedCV.education.length > 0) {
      lines.push('EDUCATION');
      parsedCV.education.forEach(edu => {
        lines.push(`${edu.degree} | ${edu.institution}`);
        if (edu.year) lines.push(`Year: ${edu.year}`);
      });
      lines.push('');
    }

    // Certifications
    if (parsedCV.certifications && parsedCV.certifications.length > 0) {
      lines.push('CERTIFICATIONS');
      parsedCV.certifications.forEach(cert => {
        lines.push(`  ✓ ${cert}`);
      });
    }

    return lines.join('\n');
  };

  const handleRegenerateCV = () => {
    setStep(2);
    setGenerationData(null);
    setATSScore(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="container">
          <h1>🚀 CV Tailor</h1>
          <p>AI-Powered CV Optimization & ATS Scoring</p>
        </div>
      </header>

      <main className="container">
        <GenerationProgress currentStep={step} />

        {/* Step 1: CV Upload */}
        {step === 1 && (
          <div className="card">
            <h2>Step 1: Upload Your CV</h2>
            <CVUploader onUpload={handleCVUpload} />
          </div>
        )}

        {/* Step 2: Job Description & Preview */}
        {(step === 2 || step === 3) && (
          <div className="grid">
            {step === 2 && (
              <div className="card">
                <h2>Step 2: Job Description</h2>
                <JobDescriptionInput
                  jobDescription={jobDescription}
                  setJobDescription={setJobDescription}
                  jobTitle={jobTitle}
                  setJobTitle={setJobTitle}
                />
                <button
                  className="btn btn-preview"
                  onClick={handleATSPreview}
                  disabled={loading}
                >
                  {loading ? 'Analyzing...' : '📊 Preview ATS Score'}
                </button>
              </div>
            )}

            {atsScore && (
              <div className="card">
                <h2>Step 3: ATS Analysis</h2>
                <ATSCard atsScore={atsScore} />
                {step === 2 && (
                  <button
                    className="btn btn-generate"
                    onClick={handleGenerateTailoredCV}
                    disabled={loading}
                  >
                    {loading ? 'Generating...' : '✨ Generate Tailored CV'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Results & Comparison */}
        {step === 3 && generationData && (
          <>
            <div className="card results-summary">
              <h2>🎉 CV Generated Successfully!</h2>
              <div className="metrics">
                <div className="metric">
                  <span>Before</span>
                  <strong>{generationData.atsComparison.before}%</strong>
                </div>
                <div className="metric arrow">→</div>
                <div className="metric">
                  <span>After</span>
                  <strong>{generationData.atsComparison.after}%</strong>
                </div>
                <div className="metric improvement">
                  <span>Improvement</span>
                  <strong>+{generationData.atsComparison.improvement}%</strong>
                </div>
              </div>
            </div>

            <CVComparison
              originalCV={originalCV}
              generatedCV={generationData.generatedCV}
              atsImprovement={generationData.atsComparison}
            />

            <div className="action-buttons">
              <button 
                className="btn btn-download" 
                onClick={handleDownloadDOCX}
                disabled={downloading}
              >
                {downloading ? '⏳ Preparing...' : '📄 Download DOCX'}
              </button>
              <button 
                className="btn btn-download" 
                onClick={handleDownloadPDF}
                disabled={downloading}
              >
                {downloading ? '⏳ Preparing...' : '📑 Download PDF'}
              </button>
              <button className="btn btn-regenerate" onClick={handleRegenerateCV}>🔄 Regenerate</button>
              <button className="btn btn-new" onClick={() => { setStep(1); setCVText(''); setJobDescription(''); setATSScore(null); }}>➕ New CV</button>
            </div>
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>CV Tailor © 2025 | Powered by AI</p>
      </footer>

      <ToastContainer position="bottom-right" />
    </div>
  );
}

export default App;
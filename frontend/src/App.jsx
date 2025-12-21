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
              <button className="btn btn-download" onClick={() => alert('Download feature coming soon!')}>⬇️ Download DOCX</button>
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

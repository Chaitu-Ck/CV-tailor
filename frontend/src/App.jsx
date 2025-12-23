import React, { useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CVUploader from './components/CVUploader';
import JobDescriptionInput from './components/JobDescriptionInput';
import ATSCard from './components/ATSCard';
import CVComparison from './components/CVComparison';
import GenerationProgress from './components/GenerationProgress';
import { cvAPI } from './api/cv';
import './App.css';

function App() {
  const [cvFile, setCVFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [atsScore, setATSScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview, 3: Results
  const [generationData, setGenerationData] = useState(null);
  const [originalCV, setOriginalCV] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);

  const handleCVUpload = (file) => {
    setCVFile(file);
    setOriginalCV(file);
    setStep(2);
  };

  const handleATSPreview = async () => {
    if (!cvFile) {
      toast.error('Please provide a CV file');
      return;
    }
    
    if (!jobDescription.trim()) {
      toast.error('Please provide a job description');
      return;
    }

    if (jobDescription.trim().length < 50) {
      toast.error('Job description must be at least 50 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await cvAPI.analyzeDocx(cvFile, jobDescription);
      
      if (response.success) {
        setATSScore(response.data);
        setAnalysisResult(response.data);
        toast.success('DOCX analyzed successfully!');
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      toast.error(error.message || 'Error analyzing document');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTailoredCV = async () => {
    if (!cvFile) {
      toast.error('Please provide a CV file');
      return;
    }
    
    if (!jobDescription.trim()) {
      toast.error('Please provide a job description');
      return;
    }
    
    if (jobDescription.trim().length < 50) {
      toast.error('Job description must be at least 50 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await cvAPI.optimizeDocx(cvFile, jobDescription);
      
      if (response.success) {
        setGenerationData(response.data);
        setATSScore(response.data);
        setStep(3);
        toast.success('Document optimized successfully!');
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      toast.error(error.message || 'Error optimizing document');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDOCX = async () => {
    if (!cvFile) {
      toast.error('Please provide a CV file');
      return;
    }
    
    if (!jobDescription.trim()) {
      toast.error('Please provide a job description');
      return;
    }
    
    if (jobDescription.trim().length < 50) {
      toast.error('Job description must be at least 50 characters');
      return;
    }

    setDownloading(true);
    try {
      const response = await cvAPI.fixDocx(cvFile, jobDescription);
      
      if (!response.success) {
        throw new Error(response.error);
      }
    } catch (error) {
      toast.error(error.message || 'Error downloading document');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPDF = async () => {
    toast.warn('PDF export is not available in the DOCX-only version. Please use the DOCX download option.');
  };


  const handleRegenerateCV = () => {
    setStep(2);
    setGenerationData(null);
    setATSScore(null);
    setAnalysisResult(null);
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
                    {loading ? 'Optimizing...' : '✨ Optimize Document for ATS'}
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
              <h2>🎉 DOCX Optimized Successfully!</h2>
              <div className="metrics">
                <div className="metric">
                  <span>Before</span>
                  <strong>{generationData.analysis?.before?.score || generationData.before?.score || 'N/A'}%</strong>
                </div>
                <div className="metric arrow">→</div>
                <div className="metric">
                  <span>After</span>
                  <strong>{generationData.analysis?.after?.score || generationData.after?.score || 'N/A'}%</strong>
                </div>
                <div className="metric improvement">
                  <span>Improvement</span>
                  <strong>+{generationData.analysis?.improvement || generationData.improvement || 'N/A'}%</strong>
                </div>
              </div>
            </div>

            <CVComparison
              originalCV={originalCV}
              generatedCV={generationData.generatedCV || originalCV}
              atsImprovement={generationData.analysis || generationData}
            />

            <div className="action-buttons">
              <button 
                className="btn btn-download" 
                onClick={handleDownloadDOCX}
                disabled={downloading}
              >
                {downloading ? '⏳ Preparing...' : '📄 Download Optimized'}
              </button>
              <button 
                className="btn btn-download" 
                onClick={handleDownloadPDF}
                disabled={downloading}
              >
                {downloading ? '⏳ Preparing...' : '📑 Download PDF'}
              </button>
              <button className="btn btn-regenerate" onClick={handleRegenerateCV}>🔄 Regenerate</button>
              <button className="btn btn-new" onClick={() => { setStep(1); setCVFile(null); setJobDescription(''); setATSScore(null); setOriginalCV(null); setGenerationData(null); setAnalysisResult(null); }}>➕ New Document</button>
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
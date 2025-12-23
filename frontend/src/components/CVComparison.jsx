import React from 'react';

function CVComparison({ originalCV, generatedCV, atsImprovement }) {
  // Handle the new DOCX-only response format
  const formatCV = (cv) => {
    if (typeof cv === 'string') return cv;
    if (!cv) return 'No CV data available';

    // Check if it's a file object (for originalCV)
    if (cv.name && cv.size) {
      return `DOCX File: ${cv.name}
Size: ${cv.size} bytes
Type: ${cv.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}

Content will be processed on the server side.`;
    }
    
    // For structured CV data (if available)
    let text = '';
    if (cv.header) {
      text += `${cv.header.name || ''}\n`;
      if (cv.header.email) text += `Email: ${cv.header.email}\n`;
      if (cv.header.phone) text += `Phone: ${cv.header.phone}\n`;
      text += '\n';
    }

    if (cv.summary) text += `SUMMARY\n${cv.summary}\n\n`;

    if (cv.skills && cv.skills.length > 0) {
      text += `SKILLS\n${cv.skills.join(' | ')}\n\n`;
    }

    if (cv.experience && cv.experience.length > 0) {
      text += `EXPERIENCE\n`;
      cv.experience.forEach((exp) => {
        text += `${exp.title} at ${exp.company} (${exp.startDate} - ${exp.endDate})\n`;
        exp.bullets.forEach((bullet) => {
          text += `- ${bullet}\n`;
        });
        text += '\n';
      });
    }

    if (cv.education && cv.education.length > 0) {
      text += `EDUCATION\n`;
      cv.education.forEach((edu) => {
        text += `${edu.degree} from ${edu.institution} (${edu.year})\n`;
      });
    }

    return text;
  };

  const originalText = formatCV(originalCV);
  const generatedText = formatCV(generatedCV);

  return (
    <div className="card">
      <h2>🔍 CV Comparison</h2>

      <div className="comparison-container">
        <div className="comparison-panel">
          <h3>📄 Original CV</h3>
          <div className="comparison-content">
            {originalText}
          </div>
        </div>

        <div className="comparison-panel">
          <h3>✨ Tailored CV</h3>
          <div className="comparison-content">
            {generatedText}
          </div>
        </div>
      </div>

      {/* Improvement Summary */}
      <div style={{
        marginTop: '20px',
        padding: '15px',
        background: '#f0fdf4',
        border: '2px solid #22c55e',
        borderRadius: '8px'
      }}>
        <h3 style={{ color: '#16a34a', marginBottom: '15px' }}>🎆 Tailoring Impact</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '15px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '5px' }}>Before</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#ef4444' }}>
              {(atsImprovement.analysis?.before?.score || atsImprovement.before || 'N/A')}%
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', color: '#16a34a' }}>→</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '5px' }}>After</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#16a34a' }}>
              {(atsImprovement.analysis?.after?.score || atsImprovement.after || 'N/A')}%
            </div>
          </div>
        </div>
        <div style={{
          marginTop: '15px',
          padding: '10px',
          background: '#ffffff',
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          <span style={{ color: '#16a34a', fontWeight: '700', fontSize: '1.1rem' }}>
            🚀 +{(atsImprovement.analysis?.improvement || atsImprovement.improvement || 'N/A')}% Improvement ({atsImprovement.improvementPercent || 'N/A'}%)
          </span>
        </div>
      </div>

      <div style={{
        marginTop: '20px',
        padding: '15px',
        background: '#fef3c7',
        borderRadius: '8px',
        border: '1px solid #f59e0b'
      }}>
        <p style={{ fontSize: '0.9rem', color: '#92400e' }}>
          📢 <strong>Next Steps:</strong> Review the tailored CV above and download the DOCX file to apply for the job. The ATS scoring shows how well your CV matches the job requirements.
        </p>
      </div>
    </div>
  );
}

export default CVComparison;

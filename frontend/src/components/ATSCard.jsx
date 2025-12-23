import React from 'react';

function ATSCard({ atsScore }) {
  if (!atsScore) return null;

  // Handle both old and new response formats
  const finalScore = atsScore.finalScore || atsScore.finalATS || 0;
  const color = atsScore.color || '⚪';
  const colorName = atsScore.colorName || 'Unknown';

  // Handle content breakdown
  const contentBreakdown = atsScore.breakdown?.content || {};
  const keywordScore = contentBreakdown.keywordScore || atsScore.keywordScore || 0;
  const skillScoreValue = contentBreakdown.skillScore?.percent || contentBreakdown.skillScore || atsScore.skillScore || 0;
  const tfidfScore = contentBreakdown.tfidfScore || atsScore.tfidfScore || 0;
  
  const skillScoreObject = contentBreakdown.skillScore || typeof atsScore.skillScore === 'object'
    ? contentBreakdown.skillScore || atsScore.skillScore
    : null;

  // Safe handling of scoreRange
  const scoreRange = atsScore.scoreRange || { min: 0, max: 100 };

  return (
    <div className="ats-card">
      <div className="ats-score">
        <div>
          <div className="ats-number">{finalScore}%</div>
          <div className="ats-name">{colorName}</div>
        </div>
        <div className="ats-emoji">{color}</div>
      </div>

      {/* Score Breakdown */}
      <div className="ats-breakdown">
        <div className="breakdown-item">
          <div className="breakdown-item-label">Keywords</div>
          <div className="breakdown-item-value">{keywordScore}%</div>
          <div className="breakdown-item-weight">30% weight</div>
        </div>
        <div className="breakdown-item">
          <div className="breakdown-item-label">Hard Skills</div>
          <div className="breakdown-item-value">{skillScoreValue}%</div>
          <div className="breakdown-item-weight">25% weight</div>
        </div>
        <div className="breakdown-item">
          <div className="breakdown-item-label">TF-IDF</div>
          <div className="breakdown-item-value">{tfidfScore}%</div>
          <div className="breakdown-item-weight">20% weight</div>
        </div>
        <div className="breakdown-item">
          <div className="breakdown-item-label">Embeddings</div>
          <div className="breakdown-item-value">{contentBreakdown.embeddingScore || atsScore.embeddingScore || 0}%</div>
          <div className="breakdown-item-weight">25% weight</div>
        </div>
      </div>

      {/* Missing Keywords */}
      {(() => {
        const missingKeywords = contentBreakdown.missingKeywords || atsScore.missingKeywords || [];
        return Array.isArray(missingKeywords) && missingKeywords.length > 0 ? (
          <div className="missing-section">
            <h4>🔍 Missing Keywords ({missingKeywords.length})</h4>
            <div className="missing-items">
              {missingKeywords.map((keyword, idx) => (
                <span key={idx} className="tag">{keyword}</span>
              ))}
            </div>
          </div>
        ) : null;
      })()}

      {/* Missing Skills */}
      {(() => {
        const missingSkills = contentBreakdown.missingSkills || skillScoreObject?.missingSkills || [];
        return Array.isArray(missingSkills) && missingSkills.length > 0 ? (
          <div className="missing-section">
            <h4>🔧 Missing Hard Skills ({missingSkills.length})</h4>
            <div className="missing-items">
              {missingSkills.slice(0, 5).map((skill, idx) => (
                <span key={idx} className="tag">{skill}</span>
              ))}
            </div>
          </div>
        ) : null;
      })()}

      {/* Recommendations */}
      {(() => {
        const recommendations = atsScore.recommendations || [];
        return Array.isArray(recommendations) && recommendations.length > 0 ? (
          <div className="recommendations">
            <h4>📚 Recommendations</h4>
            {recommendations.map((rec, idx) => (
              <div key={idx} className="recommendation-item">{rec}</div>
            ))}
          </div>
        ) : null;
      })()}

      {/* Advice */}
      {(() => {
        const advice = atsScore.advice || [];
        return Array.isArray(advice) && advice.length > 0 ? (
          <div className="recommendations" style={{ background: '#dcfce7', borderColor: '#22c55e' }}>
            <h4 style={{ color: '#16a34a' }}>💡 Tips for Improvement</h4>
            {advice.map((tip, idx) => (
              <div key={idx} className="recommendation-item" style={{ color: '#15803d' }}>
                {tip}
              </div>
            ))}
          </div>
        ) : null;
      })()}

      {/* Score Range Info */}
      {scoreRange && (
        <div style={{
          marginTop: '20px',
          padding: '12px',
          background: '#f0f9ff',
          borderRadius: '6px',
          fontSize: '0.85rem',
          color: '#0c4a6e'
        }}>
          <strong>ATS Score Range:</strong> {scoreRange.min}-{scoreRange.max}% = {atsScore.colorName}
        </div>
      )}
    </div>
  );
}

export default ATSCard;

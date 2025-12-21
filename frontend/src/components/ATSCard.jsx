import React from 'react';

function ATSCard({ atsScore }) {
  if (!atsScore) return null;

  return (
    <div className="ats-card">
      <div className="ats-score">
        <div>
          <div className="ats-number">{atsScore.finalATS}%</div>
          <div className="ats-name">{atsScore.colorName}</div>
        </div>
        <div className="ats-emoji">{atsScore.color}</div>
      </div>

      {/* Score Breakdown */}
      <div className="ats-breakdown">
        <div className="breakdown-item">
          <div className="breakdown-item-label">Keywords</div>
          <div className="breakdown-item-value">{atsScore.keywordScore}%</div>
          <div className="breakdown-item-weight">30% weight</div>
        </div>
        <div className="breakdown-item">
          <div className="breakdown-item-label">Hard Skills</div>
          <div className="breakdown-item-value">{atsScore.skillScore}%</div>
          <div className="breakdown-item-weight">25% weight</div>
        </div>
        <div className="breakdown-item">
          <div className="breakdown-item-label">TF-IDF</div>
          <div className="breakdown-item-value">{atsScore.tfidfScore}%</div>
          <div className="breakdown-item-weight">20% weight</div>
        </div>
        <div className="breakdown-item">
          <div className="breakdown-item-label">Embeddings</div>
          <div className="breakdown-item-value">{atsScore.embeddingScore}%</div>
          <div className="breakdown-item-weight">25% weight</div>
        </div>
      </div>

      {/* Missing Keywords */}
      {atsScore.missingKeywords && atsScore.missingKeywords.length > 0 && (
        <div className="missing-section">
          <h4>🔍 Missing Keywords ({atsScore.missingKeywords.length})</h4>
          <div className="missing-items">
            {atsScore.missingKeywords.map((keyword, idx) => (
              <span key={idx} className="tag">{keyword}</span>
            ))}
          </div>
        </div>
      )}

      {/* Missing Skills */}
      {atsScore.skillScore && atsScore.skillScore.missingSkills && atsScore.skillScore.missingSkills.length > 0 && (
        <div className="missing-section">
          <h4>🔧 Missing Hard Skills ({atsScore.skillScore.missingSkills.length})</h4>
          <div className="missing-items">
            {atsScore.skillScore.missingSkills.slice(0, 5).map((skill, idx) => (
              <span key={idx} className="tag">{skill}</span>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {atsScore.recommendations && atsScore.recommendations.length > 0 && (
        <div className="recommendations">
          <h4>📚 Recommendations</h4>
          {atsScore.recommendations.map((rec, idx) => (
            <div key={idx} className="recommendation-item">{rec}</div>
          ))}
        </div>
      )}

      {/* Advice */}
      {atsScore.advice && atsScore.advice.length > 0 && (
        <div className="recommendations" style={{ background: '#dcfce7', borderColor: '#22c55e' }}>
          <h4 style={{ color: '#16a34a' }}>💡 Tips for Improvement</h4>
          {atsScore.advice.map((tip, idx) => (
            <div key={idx} className="recommendation-item" style={{ color: '#15803d' }}>
              {tip}
            </div>
          ))}
        </div>
      )}

      {/* Score Range Info */}
      <div style={{
        marginTop: '20px',
        padding: '12px',
        background: '#f0f9ff',
        borderRadius: '6px',
        fontSize: '0.85rem',
        color: '#0c4a6e'
      }}>
        <strong>ATS Score Range:</strong> {atsScore.scoreRange.min}-{atsScore.scoreRange.max}% = {atsScore.colorName}
      </div>
    </div>
  );
}

export default ATSCard;

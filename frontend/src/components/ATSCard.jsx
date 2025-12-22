import React from 'react';

function ATSCard({ atsScore }) {
  if (!atsScore) return null;

  // Safe handling of skillScore - can be a number or object
  const skillScoreValue = typeof atsScore.skillScore === 'object' 
    ? (atsScore.skillScore?.percent || 0)
    : (atsScore.skillScore || 0);

  const skillScoreObject = typeof atsScore.skillScore === 'object'
    ? atsScore.skillScore
    : null;

  // Safe handling of scoreRange
  const scoreRange = atsScore.scoreRange || { min: 0, max: 100 };

  return (
    <div className="ats-card">
      <div className="ats-score">
        <div>
          <div className="ats-number">{atsScore.finalATS || 0}%</div>
          <div className="ats-name">{atsScore.colorName || 'Unknown'}</div>
        </div>
        <div className="ats-emoji">{atsScore.color || '⚪'}</div>
      </div>

      {/* Score Breakdown */}
      <div className="ats-breakdown">
        <div className="breakdown-item">
          <div className="breakdown-item-label">Keywords</div>
          <div className="breakdown-item-value">{atsScore.keywordScore || 0}%</div>
          <div className="breakdown-item-weight">30% weight</div>
        </div>
        <div className="breakdown-item">
          <div className="breakdown-item-label">Hard Skills</div>
          <div className="breakdown-item-value">{skillScoreValue}%</div>
          <div className="breakdown-item-weight">25% weight</div>
        </div>
        <div className="breakdown-item">
          <div className="breakdown-item-label">TF-IDF</div>
          <div className="breakdown-item-value">{atsScore.tfidfScore || 0}%</div>
          <div className="breakdown-item-weight">20% weight</div>
        </div>
        <div className="breakdown-item">
          <div className="breakdown-item-label">Embeddings</div>
          <div className="breakdown-item-value">{atsScore.embeddingScore || 0}%</div>
          <div className="breakdown-item-weight">25% weight</div>
        </div>
      </div>

      {/* Missing Keywords */}
      {atsScore.missingKeywords && Array.isArray(atsScore.missingKeywords) && atsScore.missingKeywords.length > 0 && (
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
      {skillScoreObject && Array.isArray(skillScoreObject.missingSkills) && skillScoreObject.missingSkills.length > 0 && (
        <div className="missing-section">
          <h4>🔧 Missing Hard Skills ({skillScoreObject.missingSkills.length})</h4>
          <div className="missing-items">
            {skillScoreObject.missingSkills.slice(0, 5).map((skill, idx) => (
              <span key={idx} className="tag">{skill}</span>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {atsScore.recommendations && Array.isArray(atsScore.recommendations) && atsScore.recommendations.length > 0 && (
        <div className="recommendations">
          <h4>📚 Recommendations</h4>
          {atsScore.recommendations.map((rec, idx) => (
            <div key={idx} className="recommendation-item">{rec}</div>
          ))}
        </div>
      )}

      {/* Advice */}
      {atsScore.advice && Array.isArray(atsScore.advice) && atsScore.advice.length > 0 && (
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

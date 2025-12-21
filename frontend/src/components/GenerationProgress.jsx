import React from 'react';

function GenerationProgress({ currentStep }) {
  const steps = [
    { num: 1, name: 'Upload CV' },
    { num: 2, name: 'Job & Preview' },
    { num: 3, name: 'Results' }
  ];

  return (
    <div className="progress">
      {steps.map((step, idx) => (
        <div
          key={idx}
          className={`progress-step ${
            step.num === currentStep
              ? 'active'
              : step.num < currentStep
              ? 'completed'
              : ''
          }`}
        >
          <div className="progress-dot">
            {step.num < currentStep ? '✓' : step.num}
          </div>
          <span>{step.name}</span>
        </div>
      ))}
    </div>
  );
}

export default GenerationProgress;

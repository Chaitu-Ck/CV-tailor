import React from 'react';

function JobDescriptionInput({
  jobDescription,
  setJobDescription,
  jobTitle,
  setJobTitle
}) {
  const sampleJobs = [
    {
      title: 'Senior DevOps Engineer',
      description: 'Seeking Senior DevOps Engineer with 5+ years experience. Requirements: Kubernetes, Docker, Terraform, AWS, CI/CD pipelines, monitoring with Prometheus/Grafana, Linux expertise, and strong networking knowledge. Must have experience managing microservices and cloud infrastructure.'
    },
    {
      title: 'Full Stack Developer',
      description: 'Hiring Full Stack Developer proficient in React, Node.js, and PostgreSQL. Requirements: 3+ years experience, REST API design, Git workflow, Docker knowledge, experience with agile methodologies. Must be comfortable with both frontend and backend development.'
    },
    {
      title: 'Cloud Architect',
      description: 'Cloud Architect needed for designing and implementing cloud solutions. Requirements: 7+ years cloud experience, AWS/Azure certification, knowledge of infrastructure-as-code, security best practices, cost optimization, and team leadership experience.'
    }
  ];

  const fillSample = (job) => {
    setJobTitle(job.title);
    setJobDescription(job.description);
  };

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="jobTitle">Job Title</label>
        <input
          id="jobTitle"
          type="text"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          placeholder="e.g., Senior DevOps Engineer"
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="jobDescription">Job Description</label>
        <textarea
          id="jobDescription"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the full job posting here..."
        />
      </div>

      <div style={{ marginTop: '20px', padding: '15px', background: '#f3f4f6', borderRadius: '8px' }}>
        <p style={{ fontSize: '0.9rem', color: '#4b5563', marginBottom: '12px' }}>
          👉 <strong>Sample Job Postings:</strong>
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {sampleJobs.map((job, idx) => (
            <button
              key={idx}
              onClick={() => fillSample(job)}
              style={{
                padding: '8px 12px',
                background: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: '500',
                color: '#208090',
                transition: 'all 0.2s',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => e.target.style.background = '#dbeafe'}
              onMouseLeave={(e) => e.target.style.background = '#ffffff'}
            >
              📚 {job.title}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #f59e0b' }}>
        <p style={{ fontSize: '0.85rem', color: '#92400e' }}>
          🔍 <strong>Best Results:</strong> Include the entire job posting for accurate analysis. The system analyzes keywords, required skills, and qualifications to optimize your CV.
        </p>
      </div>
    </div>
  );
}

export default JobDescriptionInput;

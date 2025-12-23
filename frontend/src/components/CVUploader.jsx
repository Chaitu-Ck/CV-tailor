import React, { useRef } from 'react';
import { toast } from 'react-toastify';

function CVUploader({ onUpload }) {
  const fileInputRef = useRef(null);
  const [isDragActive, setIsDragActive] = React.useState(false);

  // Handle file upload
  const handleFiles = async (files) => {
    if (files.length === 0) return;

    const file = files[0];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const fileName = file.name.toLowerCase();

    if (file.size > maxSize) {
      toast.error('File size must be less than 10MB');
      return;
    }

    // Only allow DOCX files in the DOCX-only system
    if (!fileName.endsWith('.docx') && 
        file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      toast.error('Only DOCX files are supported in the DOCX-only system');
      return;
    }

    try {
      onUpload(file);
      toast.success(`✅ ${file.name} loaded successfully!`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`❌ Error: ${error.message}`);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleChange = (e) => {
    handleFiles(e.target.files);
  };

  return (
    <div>
      <div
        className={`upload-area ${isDragActive ? 'active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="upload-icon">📄</div>
        <h3>Drop your CV here or click to browse</h3>
        <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '10px' }}>
          Supported: DOCX only | Max: 10MB
        </p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx"
        onChange={handleChange}
      />

      <div style={{ marginTop: '20px', padding: '15px', background: '#f3f4f6', borderRadius: '8px' }}>
        <p style={{ fontSize: '0.95rem', color: '#4b5563', lineHeight: '1.6' }}>
          💡 <strong>Pro Tip:</strong> Your CV will be analyzed for:
        </p>
        <ul style={{ marginLeft: '20px', marginTop: '10px', color: '#6b7280' }}>
          <li>Contact information (name, email, phone)</li>
          <li>Professional experience and roles</li>
          <li>Technical skills and certifications</li>
          <li>Education and qualifications</li>
          <li>Projects and achievements</li>
        </ul>
      </div>
    </div>
  );
}

export default CVUploader;

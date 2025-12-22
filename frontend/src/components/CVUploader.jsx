import React, { useRef } from 'react';
import { toast } from 'react-toastify';

function CVUploader({ onUpload }) {
  const fileInputRef = useRef(null);
  const [isDragActive, setIsDragActive] = React.useState(false);

  // Extract text from DOCX file
  const extractTextFromDocx = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const view = new Uint8Array(arrayBuffer);
      const text = new TextDecoder().decode(view);
      
      // Extract text from Word XML tags
      const xmlMatches = text.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
      if (xmlMatches && xmlMatches.length > 0) {
        const extractedText = xmlMatches
          .map(match => match.replace(/<[^>]+>/g, ''))
          .join(' ')
          .trim();
        return extractedText;
      }
      
      // Fallback: extract any visible text from the document
      const fallbackText = text
        .replace(/<[^>]+>/g, '') // Remove XML tags
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/[^\w\s\n.,'!?-]/g, ' ') // Keep readable characters
        .replace(/\s+/g, ' ') // Normalize spaces
        .substring(0, 10000); // Limit size
      
      return fallbackText.trim();
    } catch (error) {
      console.error('Error extracting DOCX:', error);
      throw new Error('Failed to parse DOCX file. Please ensure it\'s a valid Word document.');
    }
  };

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

    try {
      let text = '';

      // Handle different file types
      if (fileName.endsWith('.txt') || file.type === 'text/plain') {
        // Plain text file
        text = await file.text();
      } else if (fileName.endsWith('.docx') || 
                 file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // DOCX file
        toast.info('🔄 Parsing DOCX file...');
        text = await extractTextFromDocx(file);
      } else if (fileName.endsWith('.pdf')) {
        toast.error('PDF support coming soon. Please use TXT or DOCX format.');
        return;
      } else {
        toast.error('Unsupported file format. Please use TXT, DOCX');
        return;
      }

      // Validate content
      if (!text || text.trim().length < 100) {
        toast.error('CV must contain at least 100 characters of text');
        return;
      }

      if (text.length > 50000) {
        text = text.substring(0, 50000);
        toast.warn('⚠️ CV truncated to 50,000 characters');
      }

      onUpload(text);
      toast.success(`✅ ${file.name} loaded successfully! (${text.length} chars)`);
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
          Supported: TXT, DOCX | Max: 10MB
        </p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.docx,.pdf"
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

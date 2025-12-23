import { API_ENDPOINTS } from '../config';

export const cvAPI = {
  analyzeDocx: async (file, jobDescription) => {
    // Validation
    if (!file) {
      throw new Error('No file selected');
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.docx') && !fileName.endsWith('.odt') && !fileName.endsWith('.pdf')) {
      throw new Error('File must be a DOCX, ODT, or PDF document');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File too large (max 10MB)');
    }

    if (jobDescription.trim().length < 50) {
      throw new Error('Job description must be at least 50 characters');
    }

    // Build FormData
    const formData = new FormData();
    formData.append('cvFile', file);
    
    // Sanitize job description to handle copied text issues
    const sanitizedJobDescription = jobDescription
      .replace(/\r\n/g, ' ') // Replace Windows line breaks
      .replace(/\r/g, ' ')   // Replace Mac line breaks
      .replace(/\n/g, ' ')   // Replace Unix line breaks
      .replace(/\t/g, ' ')   // Replace tabs
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .trim(); // Remove leading/trailing whitespace
    
    formData.append('jobDescription', sanitizedJobDescription);

    try {
      const response = await fetch(API_ENDPOINTS.ANALYZE_DOCX, {
        method: 'POST',
        body: formData
        // Do NOT set Content-Type header - let browser set it automatically
      });

      // Log response status for debugging
      console.log('Response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('Server error:', error);
        throw new Error(error.message || `Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Analysis received:', data.finalScore);

      return { success: true, data };

    } catch (error) {
      console.error('Request failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  optimizeDocx: async (file, jobDescription) => {
    // Validation
    if (!file) {
      throw new Error('No file selected');
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.docx') && !fileName.endsWith('.odt') && !fileName.endsWith('.pdf')) {
      throw new Error('File must be a DOCX, ODT, or PDF document');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File too large (max 10MB)');
    }

    if (jobDescription.trim().length < 50) {
      throw new Error('Job description must be at least 50 characters');
    }

    // Build FormData
    const formData = new FormData();
    formData.append('cvFile', file);
    
    // Sanitize job description to handle copied text issues
    const sanitizedJobDescription = jobDescription
      .replace(/\r\n/g, ' ') // Replace Windows line breaks
      .replace(/\r/g, ' ')   // Replace Mac line breaks
      .replace(/\n/g, ' ')   // Replace Unix line breaks
      .replace(/\t/g, ' ')   // Replace tabs
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .trim(); // Remove leading/trailing whitespace
    
    formData.append('jobDescription', sanitizedJobDescription);

    try {
      const response = await fetch(API_ENDPOINTS.OPTIMIZE_DOCX, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Server error:', error);
        throw new Error(error.message || `Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Optimization received:', data);

      return { success: true, data };

    } catch (error) {
      console.error('Request failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  fixDocx: async (file, jobDescription = '') => {
    // Validation
    if (!file) {
      throw new Error('No file selected');
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.docx') && !fileName.endsWith('.odt') && !fileName.endsWith('.pdf')) {
      throw new Error('File must be a DOCX, ODT, or PDF document');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File too large (max 10MB)');
    }

    // Optional job description validation
    if (jobDescription && jobDescription.trim().length < 50) {
      throw new Error('Job description must be at least 50 characters');
    }

    // Build FormData
    const formData = new FormData();
    formData.append('cvFile', file);
    
    // Sanitize job description to handle copied text issues
    if (jobDescription) {
      const sanitizedJobDescription = jobDescription
        .replace(/\r\n/g, ' ') // Replace Windows line breaks
        .replace(/\r/g, ' ')   // Replace Mac line breaks
        .replace(/\n/g, ' ')   // Replace Unix line breaks
        .replace(/\t/g, ' ')   // Replace tabs
        .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
        .trim(); // Remove leading/trailing whitespace
      
      formData.append('jobDescription', sanitizedJobDescription);
    }

    try {
      const response = await fetch(API_ENDPOINTS.FIX_DOCX, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Server error:', error);
        throw new Error(error.message || `Server error: ${response.status}`);
      }

      // Create download link
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const fileExtension = file.name.split('.').pop().toLowerCase();
      const baseName = file.name.replace(new RegExp(`\\.${fileExtension}$`), '');
      link.setAttribute('download', `${baseName}_ATS_Fixed.${fileExtension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      console.log('Fixed DOCX downloaded successfully!');

      return { success: true };

    } catch (error) {
      console.error('Request failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  checkHealth: async () => {
    try {
      const response = await fetch(API_ENDPOINTS.HEALTH);
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Health check failed:', error);
      return { success: false, error: error.message };
    }
  }
};
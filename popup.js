/**
 * JobSnap Popup - Restored Functionality with Manual Entry
 */

let currentResume = null;
let currentJobs = [];
let selectedJobData = null;
let isLoading = false;
let isReviewingScrape = false;
let extractedData = null;
let loadingText = 'Analyzing page content...';

// Backend Configuration
const API_URL = 'http://127.0.0.1:8000/graphql';

/**
 * Initialize on load
 */
document.addEventListener('DOMContentLoaded', () => {
  loadResume();
  loadJobs();
  render();
  
  // Static element listeners
  document.getElementById('resumeInput').addEventListener('change', handleResumeFileSelect);
  
  const modal = document.getElementById('jobModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeJobModal();
      }
    });

    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) closeBtn.addEventListener('click', closeJobModal);

    const modalFooterClose = modal.querySelector('.modal-footer .btn-secondary');
    if (modalFooterClose) modalFooterClose.addEventListener('click', closeJobModal);

    const modalFooterCopy = modal.querySelector('.modal-footer .btn-primary');
    if (modalFooterCopy) modalFooterCopy.addEventListener('click', copyJobDetails);
  }
});

/**
 * Load resume from storage
 */
function loadResume() {
  chrome.storage.local.get(['currentResume'], (result) => {
    currentResume = result.currentResume || null;
    render();
  });
}

/**
 * Load jobs from storage
 */
function loadJobs() {
  chrome.storage.local.get(['jobs'], (result) => {
    currentJobs = (result.jobs || []).sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  });
}

/**
 * Render the UI
 */
function render() {
  const root = document.getElementById('root');
  
  if (isReviewingScrape && extractedData) {
    renderReviewView(root);
    return;
  }

  root.innerHTML = `
    <div class="container">
      <!-- Header with Logo -->
      <div class="header">
        <div class="logo">
          <i class="fas fa-briefcase"></i>
        </div>
        <div class="header-text">
          <h1>HireInter</h1>
          <p>AI-Powered Job Matching</p>
        </div>
      </div>

      <!-- Resume Upload Section -->
      <div class="resume-upload-section">
        <div id="dropZone" class="resume-drop-zone ${currentResume ? 'has-file' : ''}">
          <div class="resume-icon">
            <i class="fas fa-cloud-upload-alt"></i>
          </div>
          <h3>Upload your resume</h3>
          <p>Drop PDF here or click to browse</p>
          ${currentResume ? `<div class="resume-file-name">✓ ${currentResume.fileName}</div>` : ''}
        </div>
      </div>

      <!-- Scrape Button Area -->
      <div id="scrapeArea">
        ${isLoading ? `
          <div class="spinner-container">
            <div class="spinner"></div>
            <div class="loading-text">${loadingText}</div>
          </div>
        ` : `
          <button id="scrapeBtn" class="btn btn-primary">
            <i class="fas fa-bolt"></i> Scrape This Job
          </button>
        `}
      </div>

      <!-- Recent Jobs Section -->
      <div class="recent-jobs-section">
        <div class="section-header">
          <h2>Recent Jobs</h2>
          <span>${currentJobs.length} saved</span>
        </div>
        
        ${currentJobs.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon">
              <i class="fas fa-inbox"></i>
            </div>
            <h3>No jobs saved yet</h3>
            <p>Scrape a job to get started</p>
          </div>
        ` : `
          <div id="jobList">
            ${currentJobs.map((job, index) => `
              <div class="job-card" data-index="${index}">
                <div class="job-card-header">
                  <div class="job-card-title">${job.title}</div>
                  <div class="job-card-badge">
                    <span class="badge badge-${(job.status || 'New').toLowerCase().replace(/\s+/g, '-')}">
                      ${job.status || 'New'}
                    </span>
                  </div>
                </div>
                <div class="job-card-company">
                  <i class="fas fa-building"></i>
                  ${job.company || 'Unknown'}
                </div>
                <div class="job-card-meta">
                  <span><i class="fas fa-clock"></i> ${getTimeAgo(job.savedAt)}</span>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    </div>
  `;

  // Re-attach event listeners after render
  const dropZone = document.getElementById('dropZone');
  if (dropZone) {
    dropZone.addEventListener('click', triggerResumeUpload);
    
    // Drag and Drop Listeners
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('dragover');
      
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleResumeFile(files[0]);
      }
    });
  }

  const scrapeBtn = document.getElementById('scrapeBtn');
  if (scrapeBtn) scrapeBtn.addEventListener('click', handleScrapeJob);

  const jobCards = document.querySelectorAll('.job-card');
  jobCards.forEach(card => {
    card.addEventListener('click', () => {
      const index = parseInt(card.getAttribute('data-index'));
      openJobModal(index);
    });
  });
}

/**
 * Render the Review/Edit View after scraping
 */
function renderReviewView(root) {
  root.innerHTML = `
    <div class="container">
      <div class="header">
        <div class="logo">
          <i class="fas fa-edit"></i>
        </div>
        <div class="header-text">
          <h1>Review & Analyze</h1>
          <p>Verify details for AI comparison</p>
        </div>
      </div>

      <div class="review-form">
        <div class="form-group">
          <label>JOB TITLE</label>
          <input type="text" id="editTitle" class="input-field" value="${extractedData.title}">
        </div>

        <div class="form-group">
          <label>COMPANY</label>
          <input type="text" id="editCompany" class="input-field" value="${extractedData.company}">
        </div>

        <div class="form-group">
          <label>LOCATION</label>
          <input type="text" id="editLocation" class="input-field" value="${extractedData.location}">
        </div>

        <div class="form-group">
          <label>FULL DESCRIPTION</label>
          <textarea id="editDesc" class="textarea" style="height: 180px;">${extractedData.description}</textarea>
        </div>

        <div class="btn-grid">
          <button id="cancelReviewBtn" class="btn btn-secondary">
            <i class="fas fa-times"></i> Cancel
          </button>
          <button id="saveReviewBtn" class="btn btn-primary">
            <i class="fas fa-magic"></i> Generate & Compare
          </button>
        </div>
      </div>
    </div>
  `;

  // Attach events for review view
  document.getElementById('cancelReviewBtn').addEventListener('click', () => {
    isReviewingScrape = false;
    extractedData = null;
    render();
  });

  document.getElementById('saveReviewBtn').addEventListener('click', () => {
    console.log('Generate & Compare button clicked!');
    
    // 1. EXTRACT DATA FIRST (Before render() clears the inputs!)
    const updatedJob = {
      ...extractedData,
      title: document.getElementById('editTitle').value.trim(),
      company: document.getElementById('editCompany').value.trim(),
      location: document.getElementById('editLocation').value.trim(),
      description: document.getElementById('editDesc').value.trim(),
      savedAt: new Date().toISOString()
    };

    // 2. Clear view and show loading
    loadingText = 'Generating Cover Letter & Comparing...';
    isLoading = true;
    isReviewingScrape = false;
    render();
    
    // 3. Start AI Analysis
    analyzeJobWithAI(updatedJob);
  });
}

/**
 * Call the GraphQL backend to analyze job and generate cover letter
 */
async function analyzeJobWithAI(jobData) {
  if (!currentResume) {
    alert('Please upload your resume first!');
    isLoading = false;
    render();
    return;
  }

  const query = `
    mutation AnalyzeJob($title: String!, $company: String!, $location: String!, $description: String!, $resumeBase64: String!) {
      analyzeJob(
        title: $title,
        company: $company,
        location: $location,
        description: $description,
        resumeBase64: $resumeBase64
      ) {
        id
        analysis {
          matchScore
          fitSummary
          strengths
          missingSkills
          recommendations
          applicationEmail
        }
      }
    }
  `;

  const variables = {
    title: jobData.title,
    company: jobData.company,
    location: jobData.location,
    description: jobData.description,
    resumeBase64: currentResume.content // This is the data URL/base64
  };

  console.log('Starting AI Analysis for:', jobData.title);
  console.log('Backend URL:', API_URL);

  try {
    console.log('Sending request to backend...');
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables
      })
    });

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    const analyzedJob = result.data.analyzeJob;
    
    // Save to local storage for history
    const finalJob = {
      ...jobData,
      id: analyzedJob.id,
      analysis: analyzedJob.analysis,
      status: analyzedJob.analysis.matchScore > 70 ? 'High Match' : 'Review'
    };

    saveJobData(finalJob);
    isLoading = false;
    render();
    alert(`✓ Analysis complete! Match Score: ${finalJob.analysis.matchScore}%`);
  } catch (err) {
    console.error('AI Analysis failed:', err);
    isLoading = false;
    render();
    alert('Failed to analyze job with AI: ' + err.message);
  }
}


/**
 * Trigger resume upload
 */
function triggerResumeUpload() {
  document.getElementById('resumeInput').click();
}

/**
 * Handle resume file selection
 */
function handleResumeFileSelect(e) {
  const file = e.target.files[0];
  if (file) {
    handleResumeFile(file);
  }
}

/**
 * Unified logic to process resume file (from click or drag)
 */
function handleResumeFile(file) {
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    alert('File size exceeds 10MB limit');
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    currentResume = {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      content: event.target.result,
      uploadedAt: new Date().toISOString()
    };

    chrome.storage.local.set({ currentResume }, () => {
      render();
      alert('✓ Resume uploaded successfully!');
    });
  };

  // Use readAsDataURL for binary files (PDF, DOC, etc.)
  reader.readAsDataURL(file);
}

/**
 * Handle scrape job
 */
async function handleScrapeJob() {
  try {
    loadingText = 'Extracting job details...';
    isLoading = true;
    render();

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.tabs.sendMessage(tab.id, { action: 'scrapeJob' }, (response) => {
      isLoading = false;
      
      if (chrome.runtime.lastError) {
        render();
        alert('Extension not loaded on this page. Try refreshing.');
        return;
      }

      if (!response) {
        render();
        alert('No response from page. Try refreshing.');
        return;
      }

      if (response.success) {
        // Instead of saving immediately, show the review view
        extractedData = {
          ...response.data,
          company: (response.data.company && response.data.company !== 'Unknown') ? response.data.company : extractCompany(response.data.description),
          location: (response.data.location && response.data.location !== 'Not specified') ? response.data.location : extractLocation(response.data.description)
        };
        isReviewingScrape = true;
        render();
      } else {
        render();
        alert('Failed to scrape: ' + (response.error || 'Unknown error'));
      }
    });
  } catch (err) {
    isLoading = false;
    render();
    alert('Error: ' + err.message);
  }
}

/**
 * Save job data to storage
 */
function saveJobData(jobData) {
  const job = {
    ...jobData,
    id: jobData.id || Date.now(),
    savedAt: jobData.savedAt || new Date().toISOString(),
    status: jobData.status || 'New',
    company: jobData.company || extractCompany(jobData.description),
    location: jobData.location || extractLocation(jobData.description)
  };

  chrome.storage.local.get(['jobs'], (result) => {
    const jobs = result.jobs || [];
    jobs.unshift(job);
    chrome.storage.local.set({ jobs }, () => {
      currentJobs = jobs;
      render();
      alert('✓ Job saved successfully!');
    });
  });
}

/**
 * Extract company name from description
 */
function extractCompany(description) {
  // Look for company names (shorter strings after common labels)
  const companyMatch = description.match(/(?:company|employer):\s*([A-Z][A-Za-z0-9\s&]{2,30})/i);
  return companyMatch ? companyMatch[1].trim() : 'Unknown';
}

function extractLocation(description) {
  // Look for locations (city, state/country)
  const locationMatch = description.match(/(?:location|based in):\s*([A-Z][A-Za-z\s,]{2,40})/i);
  return locationMatch ? locationMatch[1].trim() : 'Not specified';
}

/**
 * Open job modal
 */
function openJobModal(index) {
  selectedJobData = currentJobs[index];
  const modal = document.getElementById('jobModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');

  modalTitle.textContent = selectedJobData.title;
  
  modalBody.innerHTML = `
    <div class="job-detail-section">
      <h3>Job Title</h3>
      <div class="job-detail-content">${selectedJobData.title}</div>
    </div>
    
    <div class="job-detail-section">
      <h3>Company</h3>
      <div class="job-detail-content">${selectedJobData.company || 'Not specified'}</div>
    </div>

    ${selectedJobData.analysis ? `
      <div class="analysis-box">
        <div class="analysis-header">
          <span class="match-score">Match Score: ${selectedJobData.analysis.matchScore}%</span>
        </div>
        
        <div class="job-detail-section">
          <h3>Fit Summary</h3>
          <div class="job-detail-content" style="font-weight: 500;">${selectedJobData.analysis.fitSummary}</div>
        </div>

        <div class="job-detail-section">
          <h3>Key Strengths</h3>
          <div class="job-detail-content">
            ${selectedJobData.analysis.strengths.map(s => `<div style="margin-bottom: 4px;"><i class="fas fa-check-circle" style="color: #4a9b7f; margin-right: 8px;"></i>${s}</div>`).join('')}
          </div>
        </div>

        <div class="job-detail-section">
          <h3>Missing Skills</h3>
          <div class="job-detail-content">
            ${selectedJobData.analysis.missingSkills.length > 0 ? 
              selectedJobData.analysis.missingSkills.map(skill => `<span class="skill-tag">${skill}</span>`).join('') : 
              '<span style="color: #999; font-style: italic;">None identified</span>'}
          </div>
        </div>

        <div class="job-detail-section">
          <h3>Recommendations</h3>
          <div class="job-detail-content">
            ${selectedJobData.analysis.recommendations.map(r => `<div style="margin-bottom: 4px;"><i class="fas fa-lightbulb" style="color: #f1c40f; margin-right: 8px;"></i>${r}</div>`).join('')}
          </div>
        </div>

        <div class="job-detail-section">
          <h3>Application Email</h3>
          <div class="cover-letter-content">${selectedJobData.analysis.applicationEmail}</div>
          <button id="copyEmailBtn" class="btn btn-secondary btn-sm" style="margin-top: 10px;">
            <i class="fas fa-copy"></i> Copy Email
          </button>
        </div>
      </div>
    ` : ''}
    
    <div class="job-detail-section">
      <h3>Location</h3>
      <div class="job-detail-content">${selectedJobData.location || 'Not specified'}</div>
    </div>
    
    <div class="job-detail-section">
      <h3>Full Description</h3>
      <div class="job-detail-content">${selectedJobData.description}</div>
    </div>
    
    <div class="job-detail-section">
      <h3>Source</h3>
      <div class="job-detail-content"><a href="${selectedJobData.url}" target="_blank" style="color: #4a9b7f; text-decoration: none;">${selectedJobData.url}</a></div>
    </div>
  `;

  // Attach listener for the new copy button
  const copyBtn = document.getElementById('copyEmailBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(selectedJobData.analysis.applicationEmail);
      alert('✓ Application email copied!');
    });
  }

  modal.classList.add('active');
}

/**
 * Close job modal
 */
function closeJobModal() {
  document.getElementById('jobModal').classList.remove('active');
  selectedJobData = null;
}

/**
 * Copy job details
 */
async function copyJobDetails() {
  if (!selectedJobData) return;

  const text = `Title: ${selectedJobData.title}\n\nCompany: ${selectedJobData.company}\n\nLocation: ${selectedJobData.location}\n\nDescription:\n${selectedJobData.description}`;
  
  try {
    await navigator.clipboard.writeText(text);
    alert('✓ Copied to clipboard!');
  } catch (err) {
    alert('Failed to copy');
  }
}

/**
 * Get time ago string
 */
function getTimeAgo(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
  if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';
  
  return date.toLocaleDateString();
}

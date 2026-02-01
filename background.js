/**
 * Background Service Worker
 * Handles extension lifecycle and storage
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('[HireInter] Extension installed');
  
  // Initialize storage
  chrome.storage.local.get(['jobs', 'resumes'], (result) => {
    if (!result.jobs) {
      chrome.storage.local.set({ jobs: [] });
    }
    if (!result.resumes) {
      chrome.storage.local.set({ resumes: [] });
    }
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveJob') {
    chrome.storage.local.get(['jobs'], (result) => {
      const jobs = result.jobs || [];
      jobs.push({
        ...request.data,
        id: Date.now(),
        savedAt: new Date().toISOString()
      });
      chrome.storage.local.set({ jobs }, () => {
        sendResponse({ success: true, jobCount: jobs.length });
      });
    });
    return true;
  }
  
  if (request.action === 'saveResume') {
    chrome.storage.local.get(['resumes'], (result) => {
      const resumes = result.resumes || [];
      resumes.push({
        ...request.data,
        id: Date.now(),
        savedAt: new Date().toISOString()
      });
      chrome.storage.local.set({ resumes }, () => {
        sendResponse({ success: true, resumeCount: resumes.length });
      });
    });
    return true;
  }
  
  if (request.action === 'getJobs') {
    chrome.storage.local.get(['jobs'], (result) => {
      sendResponse({ jobs: result.jobs || [] });
    });
    return true;
  }
  
  if (request.action === 'getResumes') {
    chrome.storage.local.get(['resumes'], (result) => {
      sendResponse({ resumes: result.resumes || [] });
    });
    return true;
  }
});

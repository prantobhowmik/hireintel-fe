/**
 * Content Script - Runs in the context of the webpage
 * Handles DOM scraping for job titles and descriptions
 */

/**
 * Detect which job portal we're on
 */
function detectSite() {
  const hostname = window.location.hostname;
  
  if (hostname.includes('linkedin.com')) return 'linkedin';
  if (hostname.includes('glassdoor.com')) return 'glassdoor';
  if (hostname.includes('bdjobs.com')) return 'bdjobs';
  if (hostname.includes('naukri.com')) return 'naukri';
  
  return 'generic';
}

/**
 * Clean and normalize text content
 */
function cleanText(text) {
  if (!text) return '';
  
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/[\r\n]+/g, '\n')
    .trim();
}

/**
 * Extract text from element, handling nested structures and removing noise
 */
function extractText(element) {
  if (!element) return '';
  
  const clone = element.cloneNode(true);
  
  // Remove unwanted elements
  const unwantedSelectors = [
    'script', 'style', 'noscript', 'iframe', 'svg', 'nav', 'footer', 
    'header', 'button', 'input', 'select', 'form', '[class*="cookie"]', 
    '[class*="banner"]', '[class*="advertisement"]', '[class*="ad-"]', 
    '[class*="social-share"]', '[style*="display: none"]', 
    '[style*="visibility: hidden"]', 'a[href*="apply"]'
  ];
  
  unwantedSelectors.forEach(selector => {
    try {
      clone.querySelectorAll(selector).forEach(el => el.remove());
    } catch (e) {}
  });
  
  const text = clone.innerText || clone.textContent || '';
  return cleanText(text);
}

/**
 * Scroll page to load lazy-loaded content
 */
async function scrollToLoadContent() {
  return new Promise((resolve) => {
    let scrollCount = 0;
    const maxScrolls = 3;
    const scrollInterval = setInterval(() => {
      window.scrollBy(0, 300);
      scrollCount++;
      if (scrollCount >= maxScrolls) {
        clearInterval(scrollInterval);
        window.scrollTo(0, 0);
        setTimeout(resolve, 200);
      }
    }, 150);
  });
}

/**
 * LinkedIn Scraper - Enhanced for all views
 */
async function scrapeLinkedIn() {
  console.log('[LinkedIn] Starting scrape...');
  
  let title = '';
  let company = '';
  let location = '';
  let description = '';
  
  // 1. Title
  const titleEl = document.querySelector('h1') || 
                  document.querySelector('.jobs-unified-top-card__job-title') ||
                  document.querySelector('.job-details-jobs-unified-top-card__job-title');
  if (titleEl) title = cleanText(titleEl.innerText);

  // 2. Company
  const companyEl = document.querySelector('.jobs-unified-top-card__company-name') ||
                    document.querySelector('.job-details-jobs-unified-top-card__company-name') ||
                    document.querySelector('.top-card-layout__first-subline a') ||
                    document.querySelector('.jobs-unified-top-card__company-name a') ||
                    document.querySelector('[class*="company-name"]');
  if (companyEl) company = cleanText(companyEl.innerText);

  // 3. Location
  const locStrategies = [
    () => document.querySelector('.jobs-unified-top-card__bullet'),
    () => document.querySelector('.job-details-jobs-unified-top-card__bullet'),
    () => document.querySelector('.jobs-unified-top-card__workplace-type'),
    () => document.querySelector('.top-card-layout__first-subline span:nth-of-type(1)'),
    () => {
      const subline = document.querySelector('.top-card-layout__first-subline');
      if (subline && subline.innerText.includes('·')) {
        return { innerText: subline.innerText.split('·')[1].trim() };
      }
      return null;
    }
  ];

  for (const strategy of locStrategies) {
    const el = strategy();
    if (el) {
      let t = cleanText(el.innerText);
      if (t && !t.includes('ago') && t.length < 100) {
        location = t.replace('·', '').trim();
        break;
      }
    }
  }

  // 4. Description
  const descEl = document.querySelector('#job-details') || 
                 document.querySelector('.jobs-description__content') ||
                 document.querySelector('.jobs-box__html-content');
  if (descEl) description = extractText(descEl);
  
  return { title, company, location, description };
}

/**
 * Glassdoor Scraper - Refined
 */
async function scrapeGlassdoor() {
  console.log('[Glassdoor] Starting scrape...');
  
  let title = '';
  let company = '';
  let location = '';
  let description = '';
  
  const titleEl = document.querySelector('h1') || document.querySelector('[data-test="jobTitle"]');
  if (titleEl) title = cleanText(titleEl.innerText);

  const companyEl = document.querySelector('[data-test="employer-name"]') || 
                    document.querySelector('.JobDetails_jobTitleWrapper__7u9G9') ||
                    document.querySelector('.employerName');
  if (companyEl) company = cleanText(companyEl.innerText).replace(/[\d\.]+\s*$/, '').trim();
  
  const locationEl = document.querySelector('[data-test="location"]') || 
                     document.querySelector('.JobDetails_location__m_ni3') ||
                     document.querySelector('.location');
  if (locationEl) location = cleanText(locationEl.innerText).replace('·', '').trim();
  
  const descEl = document.querySelector('.jobDescriptionContent') || 
                 document.querySelector('#JobDescriptionContainer') ||
                 document.querySelector('[data-test="jobDescription"]');
  if (descEl) description = extractText(descEl);
  
  return { title, company, location, description };
}

/**
 * Bdjobs Scraper - Targetted for specific view
 */
async function scrapeBdjobs() {
  console.log('[Bdjobs] Starting scrape...');
  
  let title = '';
  let company = '';
  let location = '';
  let description = '';
  
  const titleEl = document.querySelector('h1') || 
                  document.querySelector('.job-title') ||
                  document.querySelector('.job-header h2');
  if (titleEl) title = cleanText(titleEl.innerText).replace(/Application Deadline:.*/gi, '').trim();

  const companyEl = document.querySelector('.company-name') || 
                    document.querySelector('.top-header h2') ||
                    document.querySelector('.job-header h3');
  if (companyEl) {
    company = cleanText(companyEl.innerText).replace(/Company Info:?/gi, '').trim();
  }

  const locEl = document.querySelector('.location') || 
                document.querySelector('.job-location') ||
                document.querySelector('.loc');
  if (locEl) location = cleanText(locEl.innerText);
  
  const descEl = document.querySelector('.job-details') || 
                 document.querySelector('.description-content') ||
                 document.querySelector('.job-desc-info') ||
                 document.querySelector('.job-description');
  if (descEl) {
    description = extractText(descEl);
  }
  
  return { title, company, location, description };
}

/**
 * Naukri Scraper
 */
async function scrapeNaukri() {
  console.log('[Naukri] Starting scrape...');
  
  let title = '';
  let company = '';
  let location = '';
  let description = '';
  
  const titleEl = document.querySelector('h1') || document.querySelector('.jd-header-title');
  if (titleEl) title = cleanText(titleEl.innerText);

  const companyEl = document.querySelector('.jd-header-comp-name a') || 
                    document.querySelector('.jd-header-comp-name');
  if (companyEl) company = cleanText(companyEl.innerText);

  const locationEl = document.querySelector('.location') || 
                     document.querySelector('.jd-header-loc') ||
                     document.querySelector('.loc span');
  if (locationEl) location = cleanText(locationEl.innerText);
  
  const descEl = document.querySelector('.job-desc') || 
                 document.querySelector('.description') ||
                 document.querySelector('.job-description-content');
  if (descEl) description = extractText(descEl);
  
  return { title, company, location, description };
}

/**
 * Generic Fallback Scraper
 */
async function scrapeGeneric() {
  console.log('[Generic] Starting scrape...');
  
  let title = '';
  let company = '';
  let location = '';
  let description = '';
  
  const titleEl = document.querySelector('h1') || document.querySelector('h2');
  if (titleEl) title = cleanText(titleEl.innerText);
  
  const companyEl = document.querySelector('[class*="company"]') || document.querySelector('[class*="employer"]');
  if (companyEl) company = cleanText(companyEl.innerText);

  const locEl = document.querySelector('[class*="location"]');
  if (locEl) location = cleanText(locEl.innerText);

  const article = document.querySelector('article') || 
                  document.querySelector('main') ||
                  document.querySelector('[role="main"]');
  if (article) description = extractText(article);
  
  return { title, company, location, description };
}

/**
 * Main scraping orchestrator
 */
async function scrapeJob() {
  try {
    console.log('[Scraper] Starting job scrape...');
    
    await scrollToLoadContent();
    
    const site = detectSite();
    console.log('[Scraper] Detected site:', site);
    
    let result;
    switch (site) {
      case 'linkedin': result = await scrapeLinkedIn(); break;
      case 'glassdoor': result = await scrapeGlassdoor(); break;
      case 'bdjobs': result = await scrapeBdjobs(); break;
      case 'naukri': result = await scrapeNaukri(); break;
      default: result = await scrapeGeneric();
    }
    
    if (!result.title || result.title.length < 2) {
      return { success: false, error: 'Could not extract job title.' };
    }
    
    if (!result.description || result.description.length < 100) {
       const allContent = extractText(document.body);
       if (allContent.length > result.description.length) {
         result.description = allContent;
       }
    }
    
    return {
      success: true,
      site,
      data: {
        title: result.title,
        company: result.company || '',
        location: result.location || '',
        description: result.description,
        url: window.location.href,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('[Scraper] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Listen for messages from popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrapeJob') {
    scrapeJob().then(sendResponse);
    return true;
  }
  
  if (request.action === 'captureSelection') {
    const selectedText = window.getSelection().toString();
    sendResponse({
      success: true,
      data: {
        description: cleanText(selectedText)
      }
    });
    return true;
  }
});

console.log('[HireInter] Content script loaded');

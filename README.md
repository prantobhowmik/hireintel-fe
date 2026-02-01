# Job Scraper - Chrome Extension (Manifest v3)

A production-ready Chrome Extension for extracting job titles and descriptions from job portal websites.

## 🎯 Features

- **Auto-Scraping**: Intelligent DOM-based scraping for major job portals
- **Site Support**: LinkedIn, Glassdoor, Bdjobs, Naukri, and generic fallback
- **Manual Mode**: Highlight and capture job descriptions manually
- **Export Options**: Copy to clipboard, export as JSON or TXT
- **Local Storage**: Save scraped jobs locally
- **Clean UI**: React + Tailwind CSS popup interface
- **Error Handling**: Graceful fallbacks and user-friendly error messages

## 📋 Supported Job Portals

1. **LinkedIn** (linkedin.com)
   - Extracts from job details page
   - Handles dynamic content loading

2. **Glassdoor** (glassdoor.com)
   - Scrapes job title and full description
   - Works with Glassdoor's React-based UI

3. **Bdjobs** (bdjobs.com)
   - Supports Bengali job portal
   - Handles local site structure

4. **Naukri** (naukri.com)
   - Indian job portal support
   - Extracts from job detail pages

5. **Generic Fallback**
   - Works on any job portal
   - Uses heuristics to find job title and description

## 🏗️ Architecture

```
extension/
├── manifest.json           # Extension configuration (Manifest v3)
├── popup.html             # Popup UI template
├── popup.js               # React component for popup
├── content.js             # DOM scraping logic
├── background.js          # Service worker for storage
└── README.md              # This file
```

### Component Responsibilities

- **manifest.json**: Declares permissions, content scripts, and popup
- **content.js**: Runs in webpage context, performs DOM scraping
- **popup.js**: React UI for user interactions
- **background.js**: Handles storage and message routing
- **popup.html**: HTML template with Tailwind CSS

## 🚀 Installation & Setup

### Prerequisites
- Google Chrome (version 88+)
- Basic understanding of Chrome Extensions

### Step 1: Prepare the Extension

1. Clone or download this repository
2. Ensure all files are in the same directory:
   ```
   manifest.json
   popup.html
   popup.js
   content.js
   background.js
   README.md
   ```

### Step 2: Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the extension directory
5. The extension should now appear in your extensions list

### Step 3: Verify Installation

1. Visit a job portal (LinkedIn, Glassdoor, etc.)
2. Click the extension icon in the toolbar
3. You should see the Job Scraper popup

## 📖 Usage Guide

### Auto-Scraping (Recommended)

1. Navigate to a job listing page on any supported portal
2. Click the extension icon
3. Click **"🔍 Scrape Job"**
4. Wait for extraction (2-5 seconds)
5. View results in the popup

### Manual Selection Mode

If auto-scraping fails:

1. Click **"✋ Manual Select"**
2. Highlight the job description text on the page
3. Click **"📸 Capture Selection"** in the popup
4. Review and edit the captured text if needed
5. Click **"✅ Save Entry"**

### Export Options

After successful scraping:

- **📋 Copy**: Copy to clipboard (title + description)
- **📄 JSON**: Download as JSON file with metadata
- **📝 TXT**: Download as plain text file
- **🔄 New**: Start a new scraping session

## 🔍 How Scraping Works

### Site Detection

The extension detects the current website by checking `window.location.hostname`:

```javascript
if (hostname.includes("linkedin.com")) scrapeLinkedIn()
else if (hostname.includes("glassdoor.com")) scrapeGlassdoor()
// ... etc
else scrapeGeneric()
```

### DOM Scraping Strategy

1. **Site-Specific Selectors**: Each portal has predefined CSS selectors
2. **Fallback Selectors**: Multiple selector strategies for robustness
3. **Dynamic Content Handling**: Uses `requestAnimationFrame` to wait for SPA content
4. **Timeout Protection**: Max 3-5 second wait to avoid hanging
5. **Text Cleaning**: Removes unwanted elements (scripts, styles, ads, cookies)

### Generic Fallback

For unknown sites:

1. Tries to find `<h1>` or `<h2>` for title
2. Searches for `<article>`, `<main>`, or `[role="main"]` for description
3. Falls back to finding the largest text block
4. Avoids headers, footers, and navigation

### Text Normalization

- Removes extra whitespace
- Preserves line breaks and bullet points
- Strips unwanted elements (ads, cookies, navigation)
- Trims and cleans output

## 🛠️ Adding New Job Sites

To add support for a new job portal:

### 1. Update `SITE_CONFIGS` in `content.js`

```javascript
const SITE_CONFIGS = {
  // ... existing configs
  mynewsite: {
    hostname: 'mynewsite.com',
    selectors: {
      title: [
        '.job-title-class',
        '[data-test="job-title"]',
        'h1.title'
      ],
      description: [
        '.job-description-class',
        '[data-test="description"]',
        '.description'
      ]
    }
  }
};
```

### 2. Add Scraper Function (Optional)

For complex sites, add a dedicated scraper:

```javascript
async function scrapeMyNewSite() {
  const titleSelectors = SITE_CONFIGS.mynewsite.selectors.title;
  const descSelectors = SITE_CONFIGS.mynewsite.selectors.description;
  
  const titleEl = await findElement(titleSelectors);
  const descEl = await findElement(descSelectors);
  
  // Custom logic if needed
  
  return { title, description };
}
```

### 3. Update `scrapeJob()` Function

```javascript
async function scrapeJob() {
  const { site, config } = detectSite();
  
  switch (site) {
    // ... existing cases
    case 'mynewsite':
      result = await scrapeMyNewSite();
      break;
  }
  // ...
}
```

### 4. Test

1. Reload the extension (`chrome://extensions/` → refresh)
2. Visit the new job portal
3. Test scraping

## ⚠️ Known Limitations

1. **JavaScript-Heavy Sites**: Some SPAs may require longer wait times
2. **Paywalls**: Cannot scrape behind login walls or paywalls
3. **Dynamic Content**: Content loaded via AJAX may not be captured immediately
4. **Anti-Scraping**: Some sites may block or rate-limit scraping
5. **Layout Changes**: Site redesigns may break selectors (requires updates)
6. **Mobile Sites**: Extension works on desktop Chrome only

## 🔒 Privacy & Security

- **No Backend**: All scraping happens locally in your browser
- **No Data Transmission**: Job data never leaves your computer
- **Local Storage**: Jobs stored in Chrome's local storage
- **No Tracking**: No analytics or tracking code
- **Open Source**: Code is transparent and auditable

## 🐛 Troubleshooting

### Extension doesn't appear in toolbar
- Ensure it's loaded in `chrome://extensions/`
- Check that all files are in the same directory
- Refresh the page

### Scraping returns empty results
- Ensure you're on a job listing page (not search results)
- Try manual selection mode
- Check browser console for errors (F12 → Console)

### "Could not connect to page" error
- Refresh the page and try again
- Ensure the extension has permission for the site
- Check that content.js is loaded (F12 → Sources)

### Manual selection not working
- Ensure text is highlighted on the page
- Try selecting a larger text block
- Check browser console for errors

## 📝 Development Notes

### Message Passing

Popup ↔ Content Script communication:

```javascript
// From popup
chrome.tabs.sendMessage(tabId, { action: 'scrapeJob' }, (response) => {
  // Handle response
});

// In content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrapeJob') {
    scrapeJob().then(sendResponse);
    return true; // Keep channel open
  }
});
```

### Storage API

Jobs are stored using Chrome's storage API:

```javascript
// Save
chrome.storage.local.set({ jobs: [...] });

// Retrieve
chrome.storage.local.get(['jobs'], (result) => {
  const jobs = result.jobs;
});
```

## 🚀 Future Enhancements

- [ ] Skill keyword extraction
- [ ] AI-powered job summary
- [ ] Dark mode UI
- [ ] Job history with search
- [ ] Salary extraction
- [ ] Company info scraping
- [ ] Export to Google Sheets
- [ ] Scheduled scraping

## 📄 License

This project is provided as-is for educational and personal use.

## 🤝 Contributing

To improve this extension:

1. Test on different job portals
2. Report issues with specific sites
3. Suggest new features
4. Add support for new job portals

## 📞 Support

For issues or questions:

1. Check the Troubleshooting section
2. Review browser console (F12)
3. Verify all files are present
4. Ensure Chrome version is up to date

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Manifest Version**: 3

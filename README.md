# Tab Clean

A lightweight Chrome extension that helps you quickly understand, categorize, and organize all your open tabs — reducing the cognitive overhead of tab management.

---

## 🚀 Quick Start

1. **Download the code** — Click the green **"Code"** button on this page, then **"Download ZIP"**
2. **Extract** the zip file to a folder on your computer
3. **Open Chrome**, go to `chrome://extensions/`
4. **Turn on "Developer mode"** (top-right toggle)
5. **Click "Load unpacked"** and select the folder you just extracted
6. **Pin Tab Clean** to your toolbar — click the puzzle icon → find Tab Clean → click it!

---

## ✨ Features

- **Auto Categorization** — Smartly classifies tabs into Duplicates / Keep / Closeable
- **Domain Grouping** — Tabs from the same domain are automatically grouped and displayed together
- **One-Click Slim Down** — Instantly close duplicate tabs with a single click
- **Todo List** — Save important tabs to a to-do list for later review
- **Temporary Page Detection** — Automatically identifies login callbacks, blank pages, and other temporary tabs

---

## 📦 Installation

### Method 1: Developer Mode (Recommended)

1. **Download or clone this project** to your computer.

2. **Open Chrome**, go to:
   ```
   chrome://extensions/
   ```

3. **Enable "Developer mode"** — the toggle switch in the top right.

4. **Click "Load unpacked"** — select the project root folder (the folder containing `manifest.json`).

5. **Done!** Tab Clean will now appear in your extensions list.

### Method 2: How to Use

1. Open any webpage.
2. Click the **puzzle icon** (Extensions menu) in the browser toolbar.
3. Find **Tab Clean** in the list and click it.
4. The side panel opens automatically and starts scanning your tabs.

---

## 🚀 How to Use

### Opening the Extension

- Click the extensions icon (puzzle) in the Chrome toolbar.
- Find Tab Clean and click it.
- The side panel will open automatically and start scanning.

### Interface Walkthrough

**Loading Page** — Shows a tab-organizing animation, transitions to the results page after ~2.5 seconds.

**Results Page**:

| Section | Description |
|---------|-------------|
| **All** | Total count of your open tabs |
| **Duplicates** | Tabs with identical URLs — supports one-click slim-down |
| **Keep** | Normal, active, non-duplicate tabs |
| **Closeable** | Temporary pages (login callbacks, blank pages) or tabs that haven't been accessed in a long time |
| **To do** | Tabs you manually added to your to-do list |

### Actions

- **Check a checkbox** → closes that tab
- **Add to todo** → Saves the tab to your to-do list
- **One-Click Slim Down** → Keeps the most recent tab of each duplicate URL, closes the rest
- **One-Click Close** → Closes all tabs in the "Closeable" category
- **Click a tab card** → Jumps to that tab in the browser
- **Filter Buttons** → Click "All / Duplicates / Keep / Closeable" to show only that section

---

## 📁 File Structure

```
tab clean/
├── manifest.json        # Extension config (required)
├── background.js      # Background script — handles icon click (required)
├── sidepanel.html   # Side panel page structure (required)
├── sidepanel.js    # Core business logic (required)
├── style.css       # Stylesheet (required)
├── icons/           # Icons folder (required)
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── generate-icons.js # Icon generation script (dev only, no need to upload)
├── index.html       # Local preview page (dev only)
├── mock.js          # Mock data (dev only)
└── README.md        # This file
```

**Core files (required)**: `manifest.json`, `background.js`, `sidepanel.html`, `sidepanel.js`, `style.css`, `icons/`

**Dev files (for debugging)**: `index.html`, `mock.js`, `generate-icons.js`, `test-*.js` — These do not affect the extension's functionality and can safely be deleted.

---

## ⚙️ Permissions

The following Chrome permissions are required:

| Permission | Purpose |
|------------|---------|
| `tabs` | Read information about currently open tabs |
| `storage` | Save your To-do list so it persists across browser restarts |
| `sidePanel` | Display the UI in the browser's side panel |

**Note**: The extension never uploads any data to external servers. Everything runs entirely within your local browser.

---

## 🖥️ Local Development & Preview

If you want to preview the effect without installing it in Chrome:

1. Start a local server (e.g., with Node.js `http-server`, or Python `python3 -m http.server`)
2. Open `index.html` in your browser
3. It will show a demo with mock data

---

## 🔧 Troubleshooting

### Issue: Clicking the icon does nothing

**Cause**: Missing background script or misconfigured permissions.

**Fix**:
1. Ensure `background.js` exists in the project root directory.
2. Ensure `manifest.json` contains `"permissions": ["sidePanel"]`.
3. Click the refresh button on the extension card at `chrome://extensions/`.

### Issue: Side panel opens but is blank or shows errors

**Cause**: Mismatch between `sidepanel.html` and `sidepanel.js`.

**Fix**:
1. Check for JavaScript errors (right-click the side panel → Inspect → Console).
2. Refresh the extension at `chrome://extensions/`.

### Issue: Icons are missing or display incorrectly

**Cause**: Icon files are missing or corrupted.

**Fix**:
1. Confirm that the `icons/` folder contains `icon16.png` through `icon128.png`.
2. Refresh the extension at `chrome://extensions/`.

### Issue: Category results are all show 0

**Cause**: Running in Incognito or a restricted environment where tabs can't be read.

**Fix**:
1. Use the browser normally, opening several tabs.
2. The extension will automatically scan all tabs in the current window.

---

## 📝 Version

- **Version**: 1.0.0
- **Compatible with**: Chrome 114 and higher
- **Language**: Chinese (UI labels in the side panel) — straightforward to localize by editing the strings in `sidepanel.js` and `sidepanel.html`.

---

## 👤 About the Author

Hi, I'm **JudyLeedu** — an AI Product Manager. I build small tools like this to make everyday workflows smoother. If you find Tab Clean useful, feel free to star ⭐ the repo and say hi! Always excited to connect with fellow builders and users — feedback, issues, and discussions are warmly welcome!

---

## 📄 License

MIT

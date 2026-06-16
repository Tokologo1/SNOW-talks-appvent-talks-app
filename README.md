# BigQuery Release Hub 🚀

A sleek, real-time analytics dashboard designed to fetch, parse, search, filter, and share Google Cloud BigQuery Release Notes. Built with a Python Flask backend and a modern, responsive glassmorphic frontend utilizing plain HTML, JavaScript, and CSS.

---

## 🌟 Features

- **Automated RSS Feed Fetching**: Integrates directly with the official Google Cloud BigQuery release notes XML feed.
- **Granular Release Cards**: Parses multi-part daily update updates into distinct, easy-to-read cards categorized by type (**Features**, **Issues**, **Deprecations**, and **Others**).
- **Interactive Controls**:
  - **Live Search**: Instant keyword filtering across release date, type, and text content.
  - **Type Filter Chips**: Quick toggle to isolate features, bugs, deprecations, or general notices.
  - **Chrono Sort**: Toggle layout sorting between newest first and oldest first.
- **Twitter (X) Composer & Mockup Preview**: 
  - Opens a visual tweet editor modal.
  - Generates a live, color-formatted preview card matching X (Twitter) styling.
  - Automatically calculates and enforces the 280-character Twitter limit.
  - Redirects to Twitter's web share portal with your custom message, hashtags, and direct links.
- **Sleek Glassmorphic Design**: Designed with cyber-dark aesthetics, blur effects, ambient glowing orbs, loading skeleton animations, and responsive flexbox layouts.

---

## 📁 Project Structure

```text
agy-cli-projects/
├── app.py                  # Flask Python Server
├── requirements.txt        # Python Dependencies
├── .gitignore              # Configured ignore targets for Python and Flask
├── README.md               # Project documentation
├── templates/
│   └── index.html          # Semantic HTML5 frontend layout
├── static/
│   ├── css/
│   │   └── style.css       # Responsive cyber-dark styling
│   └── js/
│       └── app.js          # DOM manipulation, feed processor & sharing client
├── Images/                 # Media resources directory
├── Documents/              # Text documents directory
└── Videos/                 # Video resources directory
```

---

## ⚙️ Prerequisites

- **Python 3.12** or higher
- **pip** package installer

---

## 🚀 Setup & Execution

### 1. Initialize and Activate the Virtual Environment
From the project root directory, run:

**On Windows (PowerShell):**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**On macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Run the Flask Web Application
```bash
python app.py
```

### 4. Open in Browser
Once running, navigate to the local portal in your browser:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 🛠️ Tech Stack

- **Backend**: Python Flask, Requests, ElementTree (Built-in XML parsing)
- **Frontend**: Vanilla ES6 JavaScript (DOMParser API), Vanilla CSS3 (Custom Variables, Keyframe Animations), Semantic HTML5
- **Icons**: Optimized inline vector SVGs

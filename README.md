# StudySync — GATE Preparation Tracker

StudySync is a comprehensive, premium study tracking application designed specifically for GATE preparation. It helps students track their daily study quotas, organize study sessions by subject, maintain a daily journal with a visual heatmap, and securely sync notes directly to Google Drive. The app works seamlessly on the web and as a standalone desktop application via Electron.

## 🚀 Features

- **Daily Study Quota & Timer**: Set a daily study hour goal. A dynamic circular timer tracks your session progress, keeping you focused.
- **Subject-Based Organization**: Pre-configured for GATE subjects (Biochemistry, Molecular Biology, Genetics, etc.), allowing you to categorize every study session.
- **Google Calendar Integration**: Automatically schedule recurring study reminders directly to your Google Calendar. Supports setting reminders by a fixed duration (e.g., 1 Month) or a custom Start & End date range.
- **Cloud Note Sync (Google Drive)**: Upload study materials and notes directly from the app. Files are automatically organized into subfolders (e.g., `GATE PREPARATION/Biochemistry`) in your Google Drive.
- **Daily Journal & Heatmap**: Maintain daily reflections, track your mood, and visualize your study consistency over the months with an interactive calendar heatmap.
- **Cross-Platform**: Run as a responsive web app or a native Windows/macOS desktop application using Electron.

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, CSS (Custom Properties for Theming)
- **Icons**: Lucide React
- **Desktop Wrapper**: Electron
- **Cloud & Auth**: Google Identity Services (GIS), Google Drive API v3, Google Calendar API v3
- **Local Storage**: IndexedDB for persistent, offline-first data management

## 📦 Running Locally

### Prerequisites
- Node.js
- npm

### Web Application
1. Clone the repository:
   ```bash
   git clone https://github.com/karthi-keyan06/cautious-happiness.git
   cd cautious-happiness
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

### Desktop Application (Electron)
1. Build the web assets:
   ```bash
   npm run build
   ```
2. Launch the desktop app:
   ```bash
   npm run electron:start
   ```

## ☁️ Google Cloud Configuration
If you fork or deploy this project, you must set up your own Google Cloud Console project:
1. Enable the **Google Drive API** and **Google Calendar API**.
2. Create an **OAuth 2.0 Client ID** (Web application type).
3. Ensure your deployed domain or `http://localhost:5173` is listed under **Authorized JavaScript origins**.
4. Update the `WEB_CLIENT_ID` in the source code.

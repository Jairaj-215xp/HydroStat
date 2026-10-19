// This script runs automatically during Netlify build to generate js/env.js from public Netlify environment variables
const fs = require('fs');
const path = require('path');

// Read local .env if available and not already set in process.env (for local builds)
const envFilePath = path.join(__dirname, '../.env');
if (fs.existsSync(envFilePath)) {
  const lines = fs.readFileSync(envFilePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const k = trimmed.substring(0, eqIdx).trim();
      const v = trimmed.substring(eqIdx + 1).trim();
      if (!process.env[k]) {
        process.env[k] = v;
      }
    }
  }
}

// Note: Firebase web configuration parameters (apiKey, projectId, etc.) are public client identifiers
// for Firebase Client SDKs. Server secrets (like GEMINI_API_KEY) must NEVER be emitted here.
const envContent = `// Auto-generated during build - Public Firebase Web Configuration
// Security Note: Firebase web config parameters are public client identifiers.
// Access to Firestore, Storage, and Auth is secured via server-side Firebase Security Rules.
export const firebaseConfig = {
  apiKey: "${process.env.FIREBASE_API_KEY || ''}",
  authDomain: "${process.env.FIREBASE_AUTH_DOMAIN || ''}",
  projectId: "${process.env.FIREBASE_PROJECT_ID || ''}",
  storageBucket: "${process.env.FIREBASE_STORAGE_BUCKET || ''}",
  messagingSenderId: "${process.env.FIREBASE_MESSAGING_SENDER_ID || ''}",
  appId: "${process.env.FIREBASE_APP_ID || ''}",
  measurementId: "${process.env.FIREBASE_MEASUREMENT_ID || ''}"
};
`;

const envPath = path.join(__dirname, '../js/env.js');
fs.writeFileSync(envPath, envContent);

console.log('Successfully generated js/env.js (public Firebase client configuration only).');


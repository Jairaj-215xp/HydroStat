// This script runs automatically during Netlify build to generate js/env.js from Netlify environment variables
const fs = require('fs');
const path = require('path');

const envContent = `export const firebaseConfig = {
  apiKey: "${process.env.FIREBASE_API_KEY || ''}",
  authDomain: "${process.env.FIREBASE_AUTH_DOMAIN || ''}",
  projectId: "${process.env.FIREBASE_PROJECT_ID || ''}",
  storageBucket: "${process.env.FIREBASE_STORAGE_BUCKET || ''}",
  messagingSenderId: "${process.env.FIREBASE_MESSAGING_SENDER_ID || ''}",
  appId: "${process.env.FIREBASE_APP_ID || ''}",
  measurementId: "${process.env.FIREBASE_MEASUREMENT_ID || ''}"
};

export const geminiApiKey = "${process.env.GEMINI_API_KEY || ''}";
`;

const envPath = path.join(__dirname, '../js/env.js');
fs.writeFileSync(envPath, envContent);

console.log('Successfully generated js/env.js for Netlify deployment!');

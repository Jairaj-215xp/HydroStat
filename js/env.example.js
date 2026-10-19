// Example client-side environment configuration
// Security Notice:
// 1. Firebase web configuration values are public identifiers used by the Firebase Client SDK in the browser.
//    They are NOT server secrets. Access to Firestore, Cloud Storage, and Authentication must be restricted
//    via server-side Firebase Security Rules (see firestore.rules and storage.rules).
// 2. Server secrets such as GEMINI_API_KEY must NEVER be placed in this file or exposed to the client.
//    All AI queries and sensitive upstream API calls are executed via serverless Netlify Functions.
export const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

const { initializeApp } = require("firebase/app");
const { getAuth } = require("firebase/auth");

/**
 * Firebase configuration object
 * All values are loaded from environment variables for security
 * You can get these from Firebase Console > Project Settings > General > Your apps
 */
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
  };

// Initialize Firebase application
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication service
const auth = getAuth(app);

module.exports = { app, auth };


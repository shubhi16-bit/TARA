import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// Make sure to set the GOOGLE_APPLICATION_CREDENTIALS environment variable
// or initialize with a service account key object in production.

try {
  admin.initializeApp();
  console.log('Firebase Admin Initialized');
} catch (error) {
  console.error('Firebase Admin Initialization Error:', error);
}

export const db = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();
export const adminApp = admin;

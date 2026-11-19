import * as admin from 'firebase-admin';

const projectId = process.env.FIREBASE_PROJECT_ID || 'shopify-catering-service';
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-fbsvc@shopify-catering-service.iam.gserviceaccount.com';
const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;

if (!admin.apps.length) {
  try {
    if (privateKey && clientEmail) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log('✅ Firebase Admin SDK initialized successfully.');
    } else {
      admin.initializeApp({
        projectId,
      });
      console.log('ℹ️ Firebase Admin initialized with default projectId.');
    }
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
  }
}

export const adminAuth = admin.apps.length ? admin.auth() : null;
export default admin;


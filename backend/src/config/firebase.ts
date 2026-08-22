import * as admin from 'firebase-admin';
import { initializeApp as initClientApp, getApps as getClientApps } from 'firebase/app';
import {
  getFirestore as getClientFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp as clientServerTimestamp,
} from 'firebase/firestore';
import { getStorage as getClientStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import dotenv from 'dotenv';
import path from 'path';

// 1. Load environment variables
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../web/.env') });

const apiKey =
  process.env.FIREBASE_API_KEY ||
  process.env.VITE_FIREBASE_API_KEY ||
  'AIzaSyBShLW5TROiiaWhRDrrCwr-gH572ONgUg8';

const authDomain =
  process.env.FIREBASE_AUTH_DOMAIN ||
  process.env.VITE_FIREBASE_AUTH_DOMAIN ||
  'tara-3b146.firebaseapp.com';

const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.VITE_FIREBASE_PROJECT_ID ||
  'tara-3b146';

const storageBucket =
  process.env.FIREBASE_STORAGE_BUCKET ||
  process.env.VITE_FIREBASE_STORAGE_BUCKET ||
  'tara-3b146.firebasestorage.app';

// 2. Initialize Client App for fallback
const clientApp =
  getClientApps().length === 0
    ? initClientApp({
        apiKey,
        authDomain,
        projectId,
        storageBucket,
      })
    : getClientApps()[0];

const clientDb = getClientFirestore(clientApp);
const clientStorage = getClientStorage(clientApp);

// 3. Try initializing Admin App
let isAdminInitialized = false;
try {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && !admin.apps.length) {
    admin.initializeApp({
      projectId,
      storageBucket,
    });
    isAdminInitialized = true;
    console.log('[FIREBASE ADMIN] Initialized with Google Application Credentials');
  }
} catch (e) {
  // Fall back to client adapter
}

export interface FirestoreDocSnapshot {
  id: string;
  data: () => any;
  exists: boolean;
}

export interface FirestoreQuerySnapshot {
  empty: boolean;
  size: number;
  docs: FirestoreDocSnapshot[];
}

// 4. Uniform Firestore and Storage Interface for Backend Routes
export const db: any = isAdminInitialized
  ? (admin.firestore() as any)
  : {
      collection: (colName: string) => ({
        get: async (): Promise<FirestoreQuerySnapshot> => {
          const snap = await getDocs(collection(clientDb, colName));
          return {
            empty: snap.empty,
            size: snap.size,
            docs: snap.docs.map((d: any): FirestoreDocSnapshot => ({
              id: d.id,
              data: () => d.data(),
              exists: true,
            })),
          };
        },
        doc: (docId?: string) => {
          const docRef = docId
            ? doc(clientDb, colName, docId)
            : doc(collection(clientDb, colName));
          const effectiveId = docRef.id;

          return {
            id: effectiveId,
            get: async () => {
              const dSnap = await getDoc(docRef);
              return {
                id: dSnap.id,
                exists: dSnap.exists(),
                data: () => dSnap.data(),
              };
            },
            set: async (data: any, options?: any) => {
              const cleanData = { ...data };
              await setDoc(docRef, cleanData, options || {});
            },
            update: async (data: any) => {
              await updateDoc(docRef, data);
            },
            delete: async () => {
              await deleteDoc(docRef);
            },
          };
        },
      }),
    };

export const storage: any = isAdminInitialized
  ? admin.storage()
  : {
      bucket: (bucketName?: string) => ({
        name: bucketName || storageBucket,
        file: (storagePath: string) => ({
          save: async (buffer: Buffer, options?: any) => {
            const storageRef = ref(clientStorage, storagePath);
            await uploadBytes(storageRef, buffer, {
              contentType: options?.metadata?.contentType || 'image/jpeg',
            });
            const downloadUrl = await getDownloadURL(storageRef);
            return downloadUrl;
          },
        }),
      }),
    };

export const adminApp: any = {
  firestore: {
    FieldValue: {
      serverTimestamp: () => (isAdminInitialized ? admin.firestore.FieldValue.serverTimestamp() : clientServerTimestamp()),
    },
  },
};

export const auth: any = isAdminInitialized ? admin.auth() : null;

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export interface FirebaseConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

export function loadFirebaseConfig(): FirebaseConfig {
  const config: FirebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
  };

  try {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const envPath = path.resolve(currentDir, '../../.env');
    const envLocalPath = path.resolve(currentDir, '../../.env.local');

    const parseFile = (filePath: string) => {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
            if (key === 'VITE_FIREBASE_API_KEY') config.apiKey = val;
            if (key === 'VITE_FIREBASE_AUTH_DOMAIN') config.authDomain = val;
            if (key === 'VITE_FIREBASE_PROJECT_ID') config.projectId = val;
            if (key === 'VITE_FIREBASE_STORAGE_BUCKET') config.storageBucket = val;
            if (key === 'VITE_FIREBASE_MESSAGING_SENDER_ID') config.messagingSenderId = val;
            if (key === 'VITE_FIREBASE_APP_ID') config.appId = val;
          }
        }
      }
    };

    parseFile(envPath);
    parseFile(envLocalPath);
  } catch {}

  return config;
}


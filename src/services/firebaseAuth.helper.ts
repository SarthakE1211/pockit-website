import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, signInAnonymously, User } from 'firebase/auth';

function getFirebaseConfig() {
    const config = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    if (!config.apiKey || !config.projectId || !config.appId) {
        console.warn('[Firebase] Missing config; disabling firebase auth (NEXT_PUBLIC_FIREBASE_* env vars not set)');
        return null;
    }

    return config;
}

export class FirebaseAuthHelper {
    private app: FirebaseApp | null = null;
    private auth: Auth | null = null;

    constructor() {
        if (typeof window === 'undefined') {
            console.warn('[Firebase] running on server; firebase auth will be disabled');
            return;
        }

        const config = getFirebaseConfig();
        if (!config) {
            console.warn('[Firebase] config not found; firebase auth disabled');
            return;
        }

        this.app = getApps().length ? getApps()[0] : initializeApp(config);
        this.auth = getAuth(this.app);
        // console.log('[Firebase] Initialized with project:', this.app.options.projectId);
    }

    get currentUser(): User | null {
        return this.auth?.currentUser ?? null;
    }

    private async ensureUser() {
        if (!this.auth) {
            throw new Error('Firebase auth is not initialized (server or missing window)');
        }

        if (!this.auth.currentUser) {
            // console.log('[Firebase] No user found, signing in anonymously...');
            const signInResult = await signInAnonymously(this.auth);
            // console.log('[Firebase] Anonymous sign-in successful, uid:', signInResult.user.uid);
        }

        const user = this.auth.currentUser;
        if (!user) {
            throw new Error('Firebase user not available after authentication');
        }

        return user;
    }

    async getIdToken(forceRefresh = false): Promise<string> {
        if (typeof window === 'undefined' || !this.auth) {
            console.warn('[Firebase] getIdToken called on server/non-browser environment');
            return '';
        }

        try {
            const user = await this.ensureUser();
            const token = await user.getIdToken(forceRefresh);
            // console.log('[Firebase] Token obtained, length:', token.length);
            return token;
        } catch (err) {
            console.warn('[Firebase] getIdToken failed:', err);
            return '';
        }
    }
}

export const firebaseAuthHelper = new FirebaseAuthHelper();

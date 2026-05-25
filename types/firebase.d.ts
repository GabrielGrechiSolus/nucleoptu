declare module 'firebase/app' {
  export interface FirebaseApp {}
  export function initializeApp(config: any): FirebaseApp;
  export function getApps(): FirebaseApp[];
  export function getApp(): FirebaseApp;
}

declare module 'firebase/firestore' {
  export interface Firestore {}
  export interface DocumentReference {
    id: string;
    path: string;
  }
  export interface CollectionReference {}
  export interface DocumentSnapshot {
    exists(): boolean;
    data(): any;
    get(fieldPath: any): any;
    id: string;
    ref: DocumentReference;
  }
  export interface QuerySnapshot {
    forEach(callback: (doc: DocumentSnapshot) => void): void;
    docs: DocumentSnapshot[];
    empty: boolean;
    size: number;
  }
  export class Timestamp {
    static now(): Timestamp;
    static fromDate(date: Date): Timestamp;
    toDate(): Date;
    toMillis(): number;
    seconds: number;
    nanoseconds: number;
  }
  export class FieldValue {}
  export class WriteBatch {
    set(ref: DocumentReference, data: any): WriteBatch;
    update(ref: DocumentReference, data: any): WriteBatch;
    delete(ref: DocumentReference): WriteBatch;
    commit(): Promise<void>;
  }
  export function arrayUnion(...elements: any[]): FieldValue;
  export function arrayRemove(...elements: any[]): FieldValue;
  export function serverTimestamp(): FieldValue;
  export function increment(n: number): FieldValue;
  export function getFirestore(app?: any): Firestore;
  export function collection(firestore: Firestore, path: string, ...pathSegments: string[]): CollectionReference;
  export function doc(collectionRef: CollectionReference): DocumentReference;
  export function doc(firestore: Firestore, path: string, ...pathSegments: string[]): DocumentReference;
  export function query(ref: any, ...constraints: any[]): any;
  export function getDocs(query: any): Promise<QuerySnapshot>;
  export function getDoc(ref: DocumentReference): Promise<DocumentSnapshot>;
  export function onSnapshot(query: any, onNext: (snap: QuerySnapshot) => void, onError?: (error: any) => void): () => void;
  export function writeBatch(firestore: Firestore): WriteBatch;
  export function addDoc(ref: CollectionReference, data: any): Promise<DocumentReference>;
  export function setDoc(ref: DocumentReference, data: any, options?: any): Promise<void>;
  export function updateDoc(ref: DocumentReference, data: any): Promise<void>;
  export function deleteDoc(ref: DocumentReference): Promise<void>;
  export function where(fieldPath: string, opStr: string, value: any): any;
  export function orderBy(fieldPath: string, directionStr?: string): any;
  export function limit(n: number): any;
}

declare module 'firebase/auth' {
  export interface Auth {
    signOut(): Promise<void>;
    currentUser: User | null;
  }
  export interface User {
    uid: string;
    email?: string;
    displayName?: string;
    photoURL?: string;
  }
  export function getAuth(app?: any): Auth;
  export function signInWithEmailAndPassword(auth: Auth, email: string, password: string): Promise<any>;
  export function createUserWithEmailAndPassword(auth: Auth, email: string, password: string): Promise<any>;
  export function signOut(auth: Auth): Promise<void>;
  export function updateProfile(user: User, profile: any): Promise<void>;
  export function onAuthStateChanged(auth: Auth, callback: (user: User | null) => void): any;
}

declare module 'firebase/analytics' {
  export interface Analytics {}
  export function getAnalytics(app?: any): Analytics;
  export function isSupported(): Promise<boolean>;
}

declare module 'firebase' {
  export * from 'firebase/app';
}


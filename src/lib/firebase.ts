import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDocFromServer,
  setDoc,
  deleteDoc,
  onSnapshot,
  type Unsubscribe,
  Firestore,
} from 'firebase/firestore';
import { InvoiceData, VendorProfile } from '../types/invoice.js';
import configData from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(configData);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore with specific database ID if specified in config
let firestoreInstance: Firestore;
try {
  firestoreInstance = configData.firestoreDatabaseId
    ? getFirestore(app, configData.firestoreDatabaseId)
    : getFirestore(app);
} catch (e) {
  firestoreInstance = getFirestore(app);
}

export const db = firestoreInstance;

// SKILL Validation Connection test
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or connecting...');
    }
  }
}
testConnection();

// Operation Types for error handling per Firebase Skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  return errInfo;
}

// Deep sanitize object: Remove all keys with `undefined` values to prevent Firestore rejection
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as any;
  }
  if (typeof data === 'object') {
    const cleanObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleanObj[key] = sanitizeForFirestore(value);
      }
    }
    return cleanObj as any;
  }
  return data;
}

// Compress / optimize high-resolution base64 images so they never exceed Firestore's 1MB limit or localStorage quotas
export async function optimizeImageForStorage(dataUrl?: string): Promise<string | undefined> {
  if (!dataUrl) return undefined;
  // If not a data url or already very small, keep as-is
  if (!dataUrl.startsWith('data:image')) return dataUrl;
  if (dataUrl.length < 120000) return dataUrl;

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return dataUrl.slice(0, 100000);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const maxWidth = 900;
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        // Compress as JPEG 0.72 quality (~35-65 KB)
        const compressed = canvas.toDataURL('image/jpeg', 0.72);
        resolve(compressed);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// LocalStorage fallback keys for resilience
const LOCAL_STORAGE_INVOICES_KEY = 'mfg_invoices_cache_v2';
const LOCAL_STORAGE_VENDORS_KEY = 'mfg_vendors_cache_v2';

// Default initial vendor profiles for manufacturing business
export const INITIAL_VENDOR_PROFILES: VendorProfile[] = [
  {
    id: 'vend-apex-steel',
    name: 'Apex Industrial Steel & Alloys',
    taxId: '27AABCA1234F1Z8',
    contactPerson: 'Marcus Vance',
    email: 'orders@apexsteelmfg.com',
    phone: '+91 98230 45678',
    address: 'Plot 42, MIDC Industrial Area, Pune, Maharashtra 411018',
    category: 'raw_materials',
    defaultPaymentTerms: 'Net 30',
    currency: 'INR',
    notes: 'Primary supplier for cold-rolled steel coils and structural aluminum bars.',
    totalSpend: 1245000,
    invoiceCount: 2,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
  },
  {
    id: 'vend-precision-cnc',
    name: 'Precision Dynamics CNC Machining',
    taxId: '29AABCP5678Q1ZA',
    contactPerson: 'Elena Rostova',
    email: 'billing@precisioncnc.io',
    phone: '+91 98450 11223',
    address: 'Peenya Industrial Estate, Bengaluru, Karnataka 560058',
    category: 'machinery_parts',
    defaultPaymentTerms: 'Net 45',
    currency: 'INR',
    notes: 'Custom tooling, brass bushings, and hardened steel shaft components.',
    totalSpend: 685000,
    invoiceCount: 1,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
  },
  {
    id: 'vend-chem-tech',
    name: 'Synthetix Industrial Fluids & Polymers',
    taxId: '24AAACT9988K1ZM',
    contactPerson: 'David Chen',
    email: 'accounts@synthetixfluids.com',
    phone: '+91 97123 77889',
    address: 'GIDC Estate, Ankleshwar, Gujarat 393002',
    category: 'chemicals',
    defaultPaymentTerms: 'Net 30',
    currency: 'INR',
    notes: 'CNC cutting coolant, hydraulic oils, and high-temp silicone sealants.',
    totalSpend: 261500,
    invoiceCount: 1,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
];

// In-memory / local storage sync helpers
function getLocalInvoices(): InvoiceData[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_INVOICES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalInvoices(invoices: InvoiceData[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_INVOICES_KEY, JSON.stringify(invoices));
  } catch (e) {
    // If quota exceeded, strip image URLs from older cached items and retry
    try {
      const compact = invoices.map((inv, idx) => (idx === 0 ? inv : { ...inv, imageUrl: undefined }));
      localStorage.setItem(LOCAL_STORAGE_INVOICES_KEY, JSON.stringify(compact));
    } catch {
      console.warn('LocalStorage quota reached, relying on Firestore cloud storage.');
    }
  }
}

function getLocalVendors(): VendorProfile[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_VENDORS_KEY);
    if (!raw) {
      saveLocalVendors(INITIAL_VENDOR_PROFILES);
      return INITIAL_VENDOR_PROFILES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_VENDOR_PROFILES;
  }
}

function saveLocalVendors(vendors: VendorProfile[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_VENDORS_KEY, JSON.stringify(vendors));
  } catch (e) {
    console.warn('Failed to save vendors to local cache:', e);
  }
}

// ---------------- INVOICE FIRESTORE API ----------------

export function subscribeToInvoices(
  onUpdate: (invoices: InvoiceData[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const invoicesCol = collection(db, 'invoices');
  return onSnapshot(
    invoicesCol,
    (snapshot) => {
      const items: InvoiceData[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        if (d.id.startsWith('test-') || !data.invoiceNumber) return;
        items.push({ id: d.id, ...(data as Omit<InvoiceData, 'id'>) });
      });

      items.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      saveLocalInvoices(items);
      onUpdate(items);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, 'invoices');
      const cached = getLocalInvoices();
      onUpdate(cached);
      if (onError) onError(err);
    }
  );
}

export function subscribeToVendorProfiles(
  onUpdate: (vendors: VendorProfile[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const vendorsCol = collection(db, 'vendor_profiles');
  return onSnapshot(
    vendorsCol,
    (snapshot) => {
      const items: VendorProfile[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        if (d.id.startsWith('test-') || !data.name) return;
        items.push({ id: d.id, ...(data as Omit<VendorProfile, 'id'>) });
      });

      items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      saveLocalVendors(items);
      onUpdate(items.length > 0 ? items : INITIAL_VENDOR_PROFILES);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, 'vendor_profiles');
      const cached = getLocalVendors();
      onUpdate(cached);
      if (onError) onError(err);
    }
  );
}

export async function fetchInvoices(): Promise<InvoiceData[]> {
  try {
    const invoicesCol = collection(db, 'invoices');
    const snapshot = await getDocs(invoicesCol);

    if (!snapshot.empty) {
      const items: InvoiceData[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        // Ignore test documents or records missing essential identity
        if (d.id.startsWith('test-') || !data.invoiceNumber) return;
        items.push({ id: d.id, ...(data as Omit<InvoiceData, 'id'>) });
      });

      // Sort in memory by createdAt descending
      items.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      saveLocalInvoices(items);
      return items;
    }

    // If Firestore returned empty, fall back to local storage
    return getLocalInvoices();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'invoices');
    return getLocalInvoices();
  }
}

export async function saveInvoiceToDb(invoice: InvoiceData): Promise<void> {
  // 1. Optimize image data if present to keep document compact (<100KB)
  let optimizedImage = invoice.imageUrl;
  if (invoice.imageUrl && invoice.imageUrl.startsWith('data:image')) {
    try {
      optimizedImage = await optimizeImageForStorage(invoice.imageUrl);
    } catch {
      // keep original if optimization fails
    }
  }

  const invoiceToSave: InvoiceData = {
    ...invoice,
    imageUrl: optimizedImage,
    updatedAt: new Date().toISOString(),
    createdAt: invoice.createdAt || new Date().toISOString(),
  };

  // 2. Sanitize to strictly remove any `undefined` values (which causes Firestore to reject writes)
  const cleanDoc = sanitizeForFirestore(invoiceToSave);

  // 3. Update local cache immediately
  const localList = getLocalInvoices();
  const existingIdx = localList.findIndex((i) => i.id === cleanDoc.id);
  if (existingIdx >= 0) {
    localList[existingIdx] = cleanDoc;
  } else {
    localList.unshift(cleanDoc);
  }
  saveLocalInvoices(localList);

  // 4. Save to Firestore cloud database
  try {
    const docRef = doc(db, 'invoices', cleanDoc.id);
    await setDoc(docRef, cleanDoc);
    console.log(`Successfully saved invoice ${cleanDoc.invoiceNumber} (${cleanDoc.id}) to Firestore`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `invoices/${cleanDoc.id}`);
    throw error;
  }
}

export async function deleteInvoiceFromDb(id: string): Promise<void> {
  const localList = getLocalInvoices().filter((i) => i.id !== id);
  saveLocalInvoices(localList);

  try {
    const docRef = doc(db, 'invoices', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `invoices/${id}`);
    throw error;
  }
}

// ---------------- VENDOR PROFILES FIRESTORE API ----------------

export async function fetchVendorProfiles(): Promise<VendorProfile[]> {
  try {
    const vendorsCol = collection(db, 'vendor_profiles');
    const snapshot = await getDocs(vendorsCol);

    if (!snapshot.empty) {
      const list: VendorProfile[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        if (d.id.startsWith('test-') || !data.name) return;
        list.push({ id: d.id, ...(data as Omit<VendorProfile, 'id'>) });
      });

      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      saveLocalVendors(list);
      return list;
    }

    // Seed defaults if empty
    const cached = getLocalVendors();
    for (const v of cached) {
      try {
        const cleanV = sanitizeForFirestore(v);
        await setDoc(doc(db, 'vendor_profiles', cleanV.id), cleanV);
      } catch {
        // ignore seed error
      }
    }
    return cached;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'vendor_profiles');
    return getLocalVendors();
  }
}

export async function saveVendorProfileToDb(profile: VendorProfile): Promise<void> {
  const cleanProfile = sanitizeForFirestore(profile);

  const localList = getLocalVendors();
  const existingIdx = localList.findIndex((p) => p.id === cleanProfile.id);
  if (existingIdx >= 0) {
    localList[existingIdx] = cleanProfile;
  } else {
    localList.push(cleanProfile);
  }
  saveLocalVendors(localList);

  try {
    const docRef = doc(db, 'vendor_profiles', cleanProfile.id);
    await setDoc(docRef, cleanProfile);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `vendor_profiles/${cleanProfile.id}`);
  }
}

export async function deleteVendorProfileFromDb(id: string): Promise<void> {
  const localList = getLocalVendors().filter((p) => p.id !== id);
  saveLocalVendors(localList);

  try {
    const docRef = doc(db, 'vendor_profiles', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `vendor_profiles/${id}`);
  }
}


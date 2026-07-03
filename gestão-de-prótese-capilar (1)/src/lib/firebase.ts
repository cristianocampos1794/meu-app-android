import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  writeBatch 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with the specific databaseId from the config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

// Helper to fetch all documents from a collection
export async function getCollectionData<T>(collectionName: string): Promise<T[]> {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const data: T[] = [];
    querySnapshot.forEach((docSnapshot) => {
      data.push({ id: docSnapshot.id, ...docSnapshot.data() } as any);
    });
    return data;
  } catch (error) {
    console.error(`Error fetching collection ${collectionName}:`, error);
    throw error;
  }
}

// Helper to set/update a single document
export async function setDocument(collectionName: string, docId: string, data: any): Promise<void> {
  try {
    // Remove the id property if it is inside the data to avoid redundancy
    const { id, ...cleanData } = data;
    await setDoc(doc(db, collectionName, docId), cleanData);
  } catch (error) {
    console.error(`Error writing document ${docId} to ${collectionName}:`, error);
    throw error;
  }
}

// Helper to delete a single document
export async function deleteDocument(collectionName: string, docId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, collectionName, docId));
  } catch (error) {
    console.error(`Error deleting document ${docId} from ${collectionName}:`, error);
    throw error;
  }
}

// Helper to save multiple documents in a single batch
export async function saveCollectionBatch<T extends { id: string }>(collectionName: string, items: T[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    items.forEach((item) => {
      const { id, ...data } = item;
      const docRef = doc(db, collectionName, id);
      batch.set(docRef, data);
    });
    await batch.commit();
  } catch (error) {
    console.error(`Error writing batch to ${collectionName}:`, error);
    throw error;
  }
}

// Helper to fully synchronize a collection with Firestore (adds, updates, and deletes orphaned documents)
export async function syncCollection<T extends { id: string }>(collectionName: string, items: T[]): Promise<void> {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const firestoreIds = new Set<string>();
    querySnapshot.forEach((docSnapshot) => {
      firestoreIds.add(docSnapshot.id);
    });

    const currentIds = new Set(items.map(item => item.id));
    const batch = writeBatch(db);
    let opCount = 0;

    // 1. Delete documents that exist in Firestore but are no longer in our list
    for (const id of firestoreIds) {
      if (!currentIds.has(id)) {
        const docRef = doc(db, collectionName, id);
        batch.delete(docRef);
        opCount++;
      }
    }

    // 2. Set/update documents in our list
    items.forEach((item) => {
      const { id, ...data } = item;
      const docRef = doc(db, collectionName, id);
      batch.set(docRef, data);
      opCount++;
    });

    if (opCount > 0) {
      await batch.commit();
    }
  } catch (error) {
    console.error(`Error synchronizing collection ${collectionName} with Firestore:`, error);
    throw error;
  }
}


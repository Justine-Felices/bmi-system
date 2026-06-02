import { useState, useEffect } from 'react';
import {
  db,
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from '../firebase';
import { handleFirestoreError, OperationType } from '../services/firestore-errors';
import type { Section } from '../types';

export function useSections(isAdmin: boolean | null) {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin || !db) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'sections'), orderBy('sortOrder', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSections(snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as Section[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'sections');
      setLoading(false);
    });
    return unsubscribe;
  }, [isAdmin]);

  const createSection = async (name: string, description?: string) => {
    const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const sortOrder = sections.length;
    await setDoc(doc(db, 'sections', id), {
      id,
      name,
      description: description || '',
      sortOrder,
      createdAt: serverTimestamp(),
    });
  };

  const updateSection = async (section: Section) => {
    await setDoc(doc(db, 'sections', section.id), {
      ...section,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  };

  const deleteSection = async (sectionId: string) => {
    await deleteDoc(doc(db, 'sections', sectionId));
  };

  return { sections, loading, createSection, updateSection, deleteSection };
}

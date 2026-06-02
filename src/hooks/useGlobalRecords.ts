import { useState, useEffect } from 'react';
import { db, collectionGroup, query, onSnapshot } from '../firebase';
import { handleFirestoreError, OperationType } from '../services/firestore-errors';
import type { BMIRecord } from '../types';

export function useGlobalRecords(isAdmin: boolean | null) {
  const [globalRecords, setGlobalRecords] = useState<BMIRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin || !db) return;

    const q = query(collectionGroup(db, 'records'));
    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recordData = snapshot.docs.map(d => ({
        ...d.data(),
        id: d.id,
      })) as BMIRecord[];

      recordData.sort((a, b) => {
        const timeA = a.timestamp?.toMillis() || 0;
        const timeB = b.timestamp?.toMillis() || 0;
        return timeB - timeA;
      });

      setGlobalRecords(recordData);
      setLoading(false);
    }, (err) => {
      console.error('Global records fetch error:', err);
      const errInfo = handleFirestoreError(err, OperationType.LIST, 'records (collectionGroup)');
      setError(errInfo.error);
      setLoading(false);
    });
    return unsubscribe;
  }, [isAdmin]);

  return { globalRecords, loading, error };
}

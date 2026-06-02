import { useState, useEffect } from 'react';
import { db, collection, query, orderBy, onSnapshot } from '../firebase';
import { handleFirestoreError, OperationType } from '../services/firestore-errors';
import type { BMIRecord } from '../types';

export function useStudentRecords(studentId: string | undefined) {
  const [records, setRecords] = useState<BMIRecord[]>([]);

  useEffect(() => {
    if (!studentId) {
      setRecords([]);
      return;
    }
    const q = query(
      collection(db, `students/${studentId}/records`),
      orderBy('timestamp', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recordData = snapshot.docs.map(d => ({
        ...d.data(),
        id: d.id,
      })) as BMIRecord[];
      setRecords(recordData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `students/${studentId}/records`);
    });
    return unsubscribe;
  }, [studentId]);

  return records;
}

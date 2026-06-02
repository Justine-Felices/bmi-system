import { useState, useEffect } from 'react';
import { db, collection, query, orderBy, onSnapshot } from '../firebase';
import { handleFirestoreError, OperationType } from '../services/firestore-errors';
import type { Student } from '../types';

export function useStudents(isAdmin: boolean | null) {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    if (!isAdmin || !db) return;
    const q = query(collection(db, 'students'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const studentData = snapshot.docs.map(d => ({
        ...d.data(),
        id: d.id,
      })) as Student[];
      setStudents(studentData);

      setSelectedStudent(prev => {
        if (!prev) return prev;
        const updated = studentData.find(s => s.id === prev.id);
        return updated ?? prev;
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'students');
    });
    return unsubscribe;
  }, [isAdmin]);

  return { students, selectedStudent, setSelectedStudent };
}

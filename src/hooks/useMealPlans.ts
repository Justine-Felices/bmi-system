import { useState, useEffect, useCallback } from 'react';
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
import type { MealPlan, MealPlanDay } from '../types';

function stripUndefined<T extends Record<string, unknown>>(data: T): T {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  ) as T;
}

export function useMealPlans(studentId: string | null) {
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!studentId || !db) {
      setPlans([]);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, `students/${studentId}/mealPlans`),
      orderBy('createdAt', 'desc'),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPlans(snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as MealPlan[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'mealPlans');
      setLoading(false);
    });
    return unsubscribe;
  }, [studentId]);

  const savePlan = useCallback(async (
    planId: string,
    data: Omit<MealPlan, 'id' | 'createdAt' | 'updatedAt'> & { createdAt?: MealPlan['createdAt'] },
  ) => {
    if (!studentId || !db) return;
    const payload = stripUndefined({
      ...data,
      meals: data.meals.map(day => stripUndefined({ ...day } as Record<string, unknown>)),
      id: planId,
      studentId,
      createdAt: data.createdAt ?? serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await setDoc(doc(db, `students/${studentId}/mealPlans`, planId), payload, { merge: true });
  }, [studentId]);

  const deletePlan = useCallback(async (planId: string) => {
    if (!studentId || !db) return;
    await deleteDoc(doc(db, `students/${studentId}/mealPlans`, planId));
  }, [studentId]);

  return { plans, loading, savePlan, deletePlan };
}

export function buildPlanDates(periodType: 'weekly' | 'monthly', startDate: string) {
  const start = new Date(startDate);
  const end = new Date(start);
  if (periodType === 'weekly') {
    end.setDate(end.getDate() + 4);
  } else {
    end.setDate(end.getDate() + 27);
  }
  return {
    startDate,
    endDate: end.toISOString().slice(0, 10),
  };
}

export function createDraftPlanId() {
  return `plan-${Date.now()}`;
}

export type MealPlanDraft = {
  periodType: 'weekly' | 'monthly';
  startDate: string;
  meals: MealPlanDay[];
  baselineBmi: number;
  baselineCategory: string;
  baselineRecordId?: string;
  notes?: string;
};

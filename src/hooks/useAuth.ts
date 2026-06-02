import { useState, useEffect } from 'react';
import {
  auth,
  db,
  doc,
  getDoc,
  setDoc,
  onAuthStateChanged,
  isFirebaseConfigured,
  testFirestoreConnection,
  type User,
} from '../firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(
    isFirebaseConfigured ? null : 'Missing environment variables'
  );

  useEffect(() => {
    const checkConnection = async () => {
      const result = await testFirestoreConnection();
      if (!result.success) {
        setConfigError(result.error || 'Unknown configuration error');
      }
    };
    checkConnection();
  }, []);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setIsAdmin(null);
        setUser(currentUser);

        try {
          const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
          const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'newroskoto@gmail.com';
          const isDefaultAdmin = currentUser.email === adminEmail || currentUser.email === 'admin@gmail.com';
          const hasAdminDoc = adminDoc.exists() && adminDoc.data()?.role === 'admin';
          setIsAdmin(hasAdminDoc || isDefaultAdmin);

          if (isDefaultAdmin && !adminDoc.exists()) {
            try {
              await setDoc(doc(db, 'admins', currentUser.uid), {
                email: currentUser.email,
                role: 'admin',
              });
            } catch (e) {
              console.error('Failed to bootstrap admin doc', e);
            }
          }
        } catch (error: unknown) {
          console.error('Auth check failed:', error);
          const message = error instanceof Error ? error.message : '';
          if (message.includes('the client is offline')) {
            setConfigError('the client is offline');
          } else {
            setIsAdmin(false);
          }
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { user, isAdmin, loading, configError, setConfigError };
}

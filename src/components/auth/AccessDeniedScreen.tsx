import { AlertCircle } from 'lucide-react';
import { auth, signOut, type User } from '../../firebase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface AccessDeniedScreenProps {
  user: User;
}

export function AccessDeniedScreen({ user }: AccessDeniedScreenProps) {
  const handleLogout = () => {
    if (auth) signOut(auth);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold">Access Denied</h1>
          <p className="text-zinc-500">
            Your account (<span className="font-medium text-zinc-900">{user.email}</span>) is not authorized as an administrator.
          </p>
        </div>

        <div className="bg-zinc-50 p-4 rounded-lg text-left space-y-2">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Troubleshooting</p>
          <p className="text-sm text-zinc-600">
            1. Ensure <code className="bg-zinc-200 px-1 rounded">VITE_ADMIN_EMAIL</code> in your secrets matches your email.
          </p>
          <p className="text-sm text-zinc-600">
            2. Or manually add your UID to the <code className="bg-zinc-200 px-1 rounded">admins</code> collection in Firestore.
          </p>
          <div className="pt-2">
            <p className="text-xs text-zinc-400 mb-1">Your UID:</p>
            <code className="text-xs bg-white border border-zinc-200 p-2 rounded block break-all select-all">
              {user.uid}
            </code>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button variant="secondary" onClick={() => window.location.reload()} className="w-full">
            Retry
          </Button>
          <Button variant="ghost" onClick={handleLogout} className="w-full">
            Sign Out
          </Button>
        </div>
      </Card>
    </div>
  );
}

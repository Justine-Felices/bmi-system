import { Settings } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { cn } from '../../lib/utils';

interface ConfigErrorScreenProps {
  configError: string;
  onDismiss: () => void;
}

export function ConfigErrorScreen({ configError, onDismiss }: ConfigErrorScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto">
          <Settings className="w-8 h-8 text-amber-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold">Configuration Required</h1>
          <p className="text-zinc-500">
            {configError === 'the client is offline'
              ? 'The app cannot connect to Firebase. This usually means your API Key or Project ID is incorrect, or your database ID is wrong.'
              : 'Firebase environment variables are missing.'}
          </p>
        </div>

        <div className="bg-zinc-50 p-4 rounded-lg text-left space-y-3">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Configuration Status</p>
          <ul className="text-sm text-zinc-600 space-y-2">
            <li className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn('w-2 h-2 rounded-full', import.meta.env.VITE_FIREBASE_API_KEY ? 'bg-green-500' : 'bg-red-500')} />
                <span>API Key</span>
              </div>
              <span className="text-xs text-zinc-400">{import.meta.env.VITE_FIREBASE_API_KEY ? 'Set' : 'Missing'}</span>
            </li>
            <li className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn('w-2 h-2 rounded-full', import.meta.env.VITE_FIREBASE_PROJECT_ID ? 'bg-green-500' : 'bg-red-500')} />
                <span>Project ID</span>
              </div>
              <span className="text-xs text-zinc-400">{import.meta.env.VITE_FIREBASE_PROJECT_ID || 'Missing'}</span>
            </li>
            <li className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn('w-2 h-2 rounded-full', import.meta.env.VITE_FIREBASE_APP_ID ? 'bg-green-500' : 'bg-red-500')} />
                <span>App ID</span>
              </div>
              <span className="text-xs text-zinc-400">{import.meta.env.VITE_FIREBASE_APP_ID ? 'Set' : 'Missing'}</span>
            </li>
            <li className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Database ID</span>
              </div>
              <span className="text-xs text-zinc-400">{import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || '(default)'}</span>
            </li>
          </ul>
          <p className="text-xs text-zinc-400 pt-2 border-t border-zinc-200">
            Copy <code className="bg-zinc-200 px-1 rounded">.env.example</code> to <code className="bg-zinc-200 px-1 rounded">.env</code> and fill in your Firebase project values, then restart the dev server.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={() => window.location.reload()} className="w-full">
            Check Again
          </Button>
          <Button variant="ghost" onClick={onDismiss} className="text-xs">
            Dismiss (Debug)
          </Button>
        </div>
      </Card>
    </div>
  );
}

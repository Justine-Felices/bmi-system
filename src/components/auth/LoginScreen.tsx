import type React from 'react';
import { useState } from 'react';
import {
  Activity,
  AlertCircle,
  ClipboardList,
  Eye,
  EyeOff,
  HeartPulse,
  Loader2,
  Lock,
  Mail,
  Moon,
  ShieldCheck,
  Sun,
  UtensilsCrossed,
} from 'lucide-react';
import { auth, signInWithEmailAndPassword } from '../../firebase';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import kidsInCloud from '../../assets/sidebar/kids-in-the-cloud.png';

function getLoginErrorMessage(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: string }).code)
      : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Please try again.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    default:
      return error instanceof Error ? error.message : 'Unable to sign in. Please try again.';
  }
}

const features = [
  { icon: HeartPulse, label: 'Track student BMI & health status' },
  { icon: ClipboardList, label: 'Manage records across sections' },
  { icon: UtensilsCrossed, label: 'Generate AI-powered meal plans' },
];

export function LoginScreen() {
  const { isDark, toggleTheme } = useTheme();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      if (!auth) {
        setLoginError('Firebase is not configured. Add your Firebase keys to a .env file.');
        return;
      }
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: unknown) {
      console.error('Login failed', error);
      setLoginError(getLoginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-surface app-cloud-bg app-cloud-overlay">
      {/* Illustration panel — desktop only */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative overflow-hidden">
        <div className="absolute inset-0 bg-card/40 backdrop-blur-sm" />
        <div className="absolute -top-24 -left-24 w-[34rem] h-[34rem] rounded-full bg-info/14 blur-3xl" />
        <div className="absolute -bottom-28 -right-28 w-[34rem] h-[34rem] rounded-full bg-primary/12 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-10 xl:p-14 w-full">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-card rounded-2xl flex items-center justify-center text-primary shrink-0 shadow-sm border border-border/60">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-lg leading-tight text-text">BMI Monitor</p>
              <p className="text-[11px] font-semibold text-primary uppercase tracking-widest">
                Child Health System
              </p>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center py-6">
            <div className="relative w-full max-w-[520px]">
              <div className="absolute -inset-8 rounded-[44px] bg-card/55 border border-border/70 shadow-xl" />
              <img
                src={kidsInCloud}
                alt="Kids in the cloud"
                className="relative w-full object-contain scale-[1.15] origin-center select-none pointer-events-none"
              />
            </div>
          </div>

          <div className="max-w-md">
            <h1 className="text-3xl xl:text-4xl font-bold leading-tight tracking-tight text-text">
              Student health monitoring, simplified.
            </h1>
            <p className="text-text-muted text-base leading-relaxed mt-3">
              Sign in to access BMI tracking, health analytics, and AI meal planning.
            </p>
            <ul className="space-y-3 mt-6">
              {features.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-card border border-border/70 flex items-center justify-center shrink-0 text-primary shadow-sm">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-text">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Login panel */}
      <div className="flex-1 flex flex-col min-h-screen relative">
        <div className="absolute top-4 right-4 lg:top-6 lg:right-6 z-10">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2.5 text-text-muted hover:text-text rounded-xl hover:bg-card border border-transparent hover:border-border transition-colors"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-[420px] space-y-8">
            {/* Mobile branding */}
            <div className="lg:hidden text-center space-y-4">
              <div className="mx-auto w-full max-w-[360px] p-4 rounded-3xl bg-card/80 border border-border shadow-sm">
                <img src={kidsInCloud} alt="Kids in the cloud" className="w-full object-contain scale-[1.08]" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-text tracking-tight">BMI Monitor</h1>
                <p className="text-xs font-semibold text-primary uppercase tracking-widest">
                  Child Health System
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-text tracking-tight">Welcome back</h2>
              </div>
              <p className="text-text-muted text-sm">
                Enter your credentials to access the admin portal.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-semibold text-text">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="admin@example.com"
                    disabled={isSubmitting}
                    className="pl-10 h-11 rounded-2xl bg-card/80"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-semibold text-text">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    disabled={isSubmitting}
                    className="pl-10 pr-10 h-11 rounded-2xl bg-card/80"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div
                  role="alert"
                  className="text-sm text-danger bg-danger-light border border-danger/20 p-3.5 rounded-xl flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 text-sm font-semibold rounded-2xl shadow-lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Signing in…
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>

            <div className="flex items-center justify-center gap-2 pt-2">
              <ShieldCheck className="w-4 h-4 text-success shrink-0" />
              <p className="text-xs text-text-muted">Secure, encrypted admin access</p>
            </div>
          </div>
        </div>

        <footer className="py-4 text-center">
          <p className="text-xs text-text-muted">
            &copy; {new Date().getFullYear()} BMI Monitor &middot; Daycare Health System
          </p>
        </footer>
      </div>
    </div>
  );
}

import type React from 'react';
import { useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  ClipboardList,
  Eye,
  EyeOff,
  HeartPulse,
  Loader2,
  Lock,
  Mail,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
} from 'lucide-react';
import { auth, signInWithEmailAndPassword } from '../../firebase';
import { useTheme } from '../../contexts/ThemeContext';
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
  {
    icon: HeartPulse,
    title: 'Track BMI',
    description: 'Monitor student health status',
  },
  {
    icon: ClipboardList,
    title: 'Manage Records',
    description: 'Organize data across classes & sections',
  },
  {
    icon: Sparkles,
    title: 'AI-Powered Plans',
    description: 'Personalized health recommendations',
  },
];

export function LoginScreen() {
  const { isDark, toggleTheme } = useTheme();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

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
    <div className="login-page relative min-h-[100dvh] flex flex-col lg:flex-row overflow-x-hidden overflow-y-auto">
      {/* Theme toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute top-5 right-5 z-20 p-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* Left — branding & illustration */}
      <div className="relative z-10 flex flex-col flex-1 lg:flex-[1.5] px-6 sm:px-10 lg:px-14 py-8 lg:py-10 min-h-0 overflow-visible">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-cyan-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-lg text-white leading-tight">BMI Monitor</p>
            <p className="text-[10px] font-semibold text-white/50 uppercase tracking-[0.2em]">
              Child Health System
            </p>
          </div>
        </div>

        <div className="mt-8 lg:mt-10 max-w-xl">
          <h1 className="text-3xl sm:text-4xl xl:text-[2.75rem] font-bold text-white leading-tight tracking-tight">
            Student health monitoring,{' '}
            <span className="text-cyan-400 relative inline-block">
              simplified.
              <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400/80 to-transparent rounded-full" />
            </span>
          </h1>
          <p className="mt-4 text-sm sm:text-base text-white/55 leading-relaxed max-w-md">
            Track, analyze, and support student health with smart BMI insights.
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center py-4 lg:py-2 min-h-[240px] lg:min-h-0 -mx-4 lg:-mx-8">
          <img
            src={kidsInCloud}
            alt="Kids reading on clouds"
            className="w-full max-w-[560px] xl:max-w-[660px] 2xl:max-w-[720px] object-contain drop-shadow-[0_20px_60px_rgba(0,0,0,0.45)] select-none pointer-events-none scale-105 sm:scale-110 lg:scale-[1.22] xl:scale-[1.28] origin-center"
          />
        </div>

        <div className="hidden sm:grid grid-cols-1 sm:grid-cols-3 gap-3 pb-4 lg:pb-0">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="login-feature-card rounded-2xl p-4 flex flex-col gap-2"
            >
              <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/20 flex items-center justify-center text-cyan-400">
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-sm font-bold text-white">{title}</p>
              <p className="text-[11px] text-white/50 leading-snug">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right — login card */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-6 sm:px-10 py-8 lg:py-10">
        <div className="login-glass-card w-full max-w-[420px] rounded-3xl p-8 sm:p-10">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-400/25 flex items-center justify-center text-cyan-400 mb-4 shadow-[0_0_30px_rgba(34,211,238,0.15)]">
              <HeartPulse className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Welcome back</h2>
            <p className="text-sm text-white/50 mt-1">Sign in to access your dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-white/80">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35 pointer-events-none" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@example.com"
                  disabled={isSubmitting}
                  className="login-input w-full h-12 pl-10 pr-4 rounded-xl text-sm transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-white/80">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35 pointer-events-none" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  disabled={isSubmitting}
                  className="login-input w-full h-12 pl-10 pr-10 rounded-xl text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/70 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer text-white/55 hover:text-white/75 transition-colors">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500/30"
                />
                Remember me
              </label>
              <span className="text-cyan-400/80 text-xs cursor-default">Forgot password?</span>
            </div>

            {loginError && (
              <div
                role="alert"
                className="text-sm text-red-300 bg-red-500/10 border border-red-400/20 p-3.5 rounded-xl flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="login-btn-gradient w-full h-12 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                  Sign in
                </>
              )}
            </button>
          </form>

          <div className="flex items-center justify-center gap-2 mt-6 pt-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="text-xs text-white/45">Secure and protected access</p>
          </div>
        </div>
      </div>

      <footer className="absolute bottom-4 left-0 right-0 z-10 text-center pointer-events-none">
        <p className="text-xs text-white/30">
          &copy; {new Date().getFullYear()} BMI Monitor &middot; Child Health System
        </p>
      </footer>
    </div>
  );
}

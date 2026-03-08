import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { authService } from '@/services/authService';
import LanguageSelector from '@/components/LanguageSelector';
import { 
  LockClosedIcon,
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

const LoginPage: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAuthAvailable, setIsAuthAvailable] = useState(true);

  useEffect(() => {
    // Check if already authenticated
    checkAuth();
    
    // Check if auth is available
    setIsAuthAvailable(authService.isAuthAvailable());
  }, []);

  const checkAuth = async () => {
    const authenticated = await authService.isAuthenticated();
    if (authenticated) {
      router.push('/');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await authService.signIn(email, password);

      if (result.success) {
        // Redirect to home or intended page
        const returnUrl = (router.query.returnUrl as string) || '/';
        router.push(returnUrl);
      } else {
        setError(result.error || 'Sign in failed. Please check your credentials.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoMode = () => {
    // Redirect to demo mode
    router.push('/?demo=true');
  };

  const handleQuickLogin = async (email: string, password: string) => {
    setEmail(email);
    setPassword(password);
    setError('');
    setIsLoading(true);

    try {
      const result = await authService.signIn(email, password);

      if (result.success) {
        const returnUrl = (router.query.returnUrl as string) || '/';
        router.push(returnUrl);
      } else {
        setError(result.error || 'Sign in failed. Please check your credentials.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthAvailable) {
    return (
      <>
        <Head>
          <title>Authentication Unavailable - Healthcare OS</title>
        </Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <ExclamationCircleIcon className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Unavailable</h2>
            <p className="text-gray-600 mb-6">
              Authentication service is not configured. The app is running in demo mode.
            </p>
            <button
              onClick={handleDemoMode}
              className="w-full px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors"
            >
              Continue to Demo Mode
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Sign In - Healthcare OS</title>
        <meta name="description" content="Sign in to Healthcare OS" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-purple-50 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          {/* Language Selector - Top Right */}
          <div className="flex justify-end mb-4">
            <LanguageSelector />
          </div>

          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-600 rounded-full mb-4">
              <span className="text-3xl">🏥</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Arogya AI</h1>
            <p className="text-gray-600">Healthcare Orchestration System</p>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-lg shadow-xl p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h2>
              <p className="text-gray-600">Sign in to access your healthcare dashboard</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
                <div className="flex items-center">
                  <ExclamationCircleIcon className="h-5 w-5 text-red-500 mr-2" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="your@email.com"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember"
                    type="checkbox"
                    className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember" className="ml-2 block text-sm text-gray-700">
                    Remember me
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/forgot-password')}
                  className="text-sm text-teal-600 hover:text-teal-700 font-semibold"
                >
                  Forgot password?
                </button>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isLoading || !email || !password}
                className="w-full px-6 py-3 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    <LockClosedIcon className="h-5 w-5" />
                    Sign In
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="mt-6 mb-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Quick Login for Judges</span>
                </div>
              </div>
            </div>

            {/* Quick Login Buttons */}
            <div className="space-y-3 mb-6">
              <button
                type="button"
                onClick={() => handleQuickLogin('test@arogya.ai', 'SecurePass123!')}
                disabled={isLoading}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span className="text-xl">👤</span>
                <div className="text-left">
                  <div className="text-sm font-bold">Login as Test User</div>
                  <div className="text-xs opacity-90">test@arogya.ai</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('patient@arogya.ai', 'PatientPass123!')}
                disabled={isLoading}
                className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span className="text-xl">🏥</span>
                <div className="text-left">
                  <div className="text-sm font-bold">Login as Patient</div>
                  <div className="text-xs opacity-90">patient@arogya.ai</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('supervisor@arogya.ai', 'SupervisorPass123!')}
                disabled={isLoading}
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span className="text-xl">👨‍⚕️</span>
                <div className="text-left">
                  <div className="text-sm font-bold">Login as Supervisor</div>
                  <div className="text-xs opacity-90">supervisor@arogya.ai</div>
                </div>
              </button>
            </div>

            {/* Divider */}
            <div className="mt-6 mb-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or View Credentials</span>
                </div>
              </div>
            </div>

            {/* Test Credentials */}
            <div className="space-y-2 text-sm">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="font-semibold text-blue-900 mb-1">Test User</p>
                <p className="text-blue-700">Email: test@arogya.ai</p>
                <p className="text-blue-700">Password: SecurePass123!</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="font-semibold text-green-900 mb-1">Patient</p>
                <p className="text-green-700">Email: patient@arogya.ai</p>
                <p className="text-green-700">Password: PatientPass123!</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="font-semibold text-purple-900 mb-1">Supervisor</p>
                <p className="text-purple-700">Email: supervisor@arogya.ai</p>
                <p className="text-purple-700">Password: SupervisorPass123!</p>
              </div>
            </div>

            {/* Sign Up Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <button
                  onClick={() => router.push('/signup')}
                  className="text-teal-600 hover:text-teal-700 font-semibold"
                >
                  Sign up
                </button>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-gray-600">
            <p>🔒 Secured by AWS Cognito</p>
            <p className="mt-2">
              <button
                onClick={handleDemoMode}
                className="text-teal-600 hover:text-teal-700 font-semibold"
              >
                Continue without signing in (Demo Mode)
              </button>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;

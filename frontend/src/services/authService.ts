/**
 * AWS Cognito Authentication Service
 * Handles user authentication, token management, and session handling
 * Supports both authenticated and guest/demo modes
 */

import { CognitoUserPool, CognitoUser, AuthenticationDetails, CognitoUserSession } from 'amazon-cognito-identity-js';

// Cognito configuration from environment variables
const COGNITO_CONFIG = {
  userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
  clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '',
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
};

export interface AuthUser {
  username: string;
  email?: string;
  attributes?: Record<string, string>;
  isGuest: boolean;
}

export interface AuthTokens {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

class AuthService {
  private userPool: CognitoUserPool | null = null;
  private currentUser: CognitoUser | null = null;
  private isInitialized: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  /**
   * Initialize Cognito User Pool
   */
  private initialize(): void {
    try {
      if (!COGNITO_CONFIG.userPoolId || !COGNITO_CONFIG.clientId) {
        console.warn('⚠️ Cognito not configured. Running in demo mode.');
        this.isInitialized = false;
        return;
      }

      this.userPool = new CognitoUserPool({
        UserPoolId: COGNITO_CONFIG.userPoolId,
        ClientId: COGNITO_CONFIG.clientId,
      });

      this.isInitialized = true;
      console.log('✅ Cognito authentication initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Cognito:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Check if authentication is available
   */
  isAuthAvailable(): boolean {
    return this.isInitialized && this.userPool !== null;
  }

  /**
   * Sign up a new user
   */
  async signUp(username: string, password: string, email: string, attributes?: Record<string, string>): Promise<{ success: boolean; message?: string; error?: string }> {
    if (!this.isAuthAvailable()) {
      return { success: false, error: 'Authentication not available. Using demo mode.' };
    }

    return new Promise((resolve) => {
      const { CognitoUserAttribute } = require('amazon-cognito-identity-js');
      
      const attributeList = [
        new CognitoUserAttribute({ Name: 'email', Value: email }),
        ...(attributes ? Object.entries(attributes).map(([key, value]) => 
          new CognitoUserAttribute({ Name: key, Value: value })
        ) : [])
      ];

      this.userPool!.signUp(username, password, attributeList, [], (err, result) => {
        if (err) {
          console.error('Sign up error:', err);
          resolve({ success: false, error: err.message });
          return;
        }

        resolve({
          success: true,
          message: 'Sign up successful. Please check your email for verification code.'
        });
      });
    });
  }

  /**
   * Confirm sign up with verification code
   */
  async confirmSignUp(username: string, code: string): Promise<{ success: boolean; message?: string; error?: string }> {
    if (!this.isAuthAvailable()) {
      return { success: false, error: 'Authentication not available' };
    }

    return new Promise((resolve) => {
      const cognitoUser = new CognitoUser({
        Username: username,
        Pool: this.userPool!,
      });

      cognitoUser.confirmRegistration(code, true, (err) => {
        if (err) {
          console.error('Confirmation error:', err);
          resolve({ success: false, error: err.message });
          return;
        }

        resolve({ success: true, message: 'Account confirmed successfully' });
      });
    });
  }

  /**
   * Sign in with username and password
   */
  async signIn(username: string, password: string): Promise<{ success: boolean; user?: AuthUser; tokens?: AuthTokens; error?: string }> {
    if (!this.isAuthAvailable()) {
      return { success: false, error: 'Authentication not available. Using demo mode.' };
    }

    return new Promise((resolve) => {
      const authenticationDetails = new AuthenticationDetails({
        Username: username,
        Password: password,
      });

      const cognitoUser = new CognitoUser({
        Username: username,
        Pool: this.userPool!,
      });

      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (session: CognitoUserSession) => {
          this.currentUser = cognitoUser;
          
          const tokens = this.extractTokens(session);
          this.storeTokens(tokens);

          cognitoUser.getUserAttributes((err, attributes) => {
            const user: AuthUser = {
              username,
              email: attributes?.find(attr => attr.Name === 'email')?.Value,
              attributes: attributes?.reduce((acc, attr) => ({ ...acc, [attr.Name]: attr.Value }), {}),
              isGuest: false,
            };

            resolve({ success: true, user, tokens });
          });
        },
        onFailure: (err) => {
          console.error('Sign in error:', err);
          resolve({ success: false, error: err.message });
        },
        newPasswordRequired: (userAttributes) => {
          // Handle new password required scenario
          resolve({
            success: false,
            error: 'New password required. Please change your password.',
          });
        },
      });
    });
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    if (this.currentUser) {
      this.currentUser.signOut();
      this.currentUser = null;
    }

    this.clearTokens();
    console.log('✅ User signed out');
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    if (!this.isAuthAvailable()) {
      return this.getGuestUser();
    }

    return new Promise((resolve) => {
      const cognitoUser = this.userPool!.getCurrentUser();

      if (!cognitoUser) {
        resolve(this.getGuestUser());
        return;
      }

      cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session || !session.isValid()) {
          resolve(this.getGuestUser());
          return;
        }

        this.currentUser = cognitoUser;

        cognitoUser.getUserAttributes((err, attributes) => {
          if (err) {
            resolve(this.getGuestUser());
            return;
          }

          const user: AuthUser = {
            username: cognitoUser.getUsername(),
            email: attributes?.find(attr => attr.Name === 'email')?.Value,
            attributes: attributes?.reduce((acc, attr) => ({ ...acc, [attr.Name]: attr.Value }), {}),
            isGuest: false,
          };

          resolve(user);
        });
      });
    });
  }

  /**
   * Get guest user for demo mode
   */
  private getGuestUser(): AuthUser {
    return {
      username: 'guest',
      email: 'guest@demo.local',
      isGuest: true,
    };
  }

  /**
   * Get current valid session
   */
  async getSession(): Promise<CognitoUserSession | null> {
    if (!this.isAuthAvailable()) {
      return null;
    }

    return new Promise((resolve) => {
      const cognitoUser = this.userPool!.getCurrentUser();

      if (!cognitoUser) {
        resolve(null);
        return;
      }

      cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session || !session.isValid()) {
          resolve(null);
          return;
        }

        resolve(session);
      });
    });
  }

  /**
   * Get current ID token for API calls
   */
  async getIdToken(): Promise<string | null> {
    const session = await this.getSession();
    return session?.getIdToken().getJwtToken() || null;
  }

  /**
   * Get current access token
   */
  async getAccessToken(): Promise<string | null> {
    const session = await this.getSession();
    return session?.getAccessToken().getJwtToken() || null;
  }

  /**
   * Refresh current session
   */
  async refreshSession(): Promise<boolean> {
    if (!this.isAuthAvailable() || !this.currentUser) {
      return false;
    }

    return new Promise((resolve) => {
      this.currentUser!.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session) {
          resolve(false);
          return;
        }

        const refreshToken = session.getRefreshToken();

        this.currentUser!.refreshSession(refreshToken, (err, newSession) => {
          if (err) {
            console.error('Session refresh error:', err);
            resolve(false);
            return;
          }

          const tokens = this.extractTokens(newSession);
          this.storeTokens(tokens);
          resolve(true);
        });
      });
    });
  }

  /**
   * Forgot password - initiate reset
   */
  async forgotPassword(username: string): Promise<{ success: boolean; message?: string; error?: string }> {
    if (!this.isAuthAvailable()) {
      return { success: false, error: 'Authentication not available' };
    }

    return new Promise((resolve) => {
      const cognitoUser = new CognitoUser({
        Username: username,
        Pool: this.userPool!,
      });

      cognitoUser.forgotPassword({
        onSuccess: () => {
          resolve({ success: true, message: 'Password reset code sent to your email' });
        },
        onFailure: (err) => {
          console.error('Forgot password error:', err);
          resolve({ success: false, error: err.message });
        },
      });
    });
  }

  /**
   * Confirm password reset with code
   */
  async confirmPassword(username: string, code: string, newPassword: string): Promise<{ success: boolean; message?: string; error?: string }> {
    if (!this.isAuthAvailable()) {
      return { success: false, error: 'Authentication not available' };
    }

    return new Promise((resolve) => {
      const cognitoUser = new CognitoUser({
        Username: username,
        Pool: this.userPool!,
      });

      cognitoUser.confirmPassword(code, newPassword, {
        onSuccess: () => {
          resolve({ success: true, message: 'Password reset successful' });
        },
        onFailure: (err) => {
          console.error('Confirm password error:', err);
          resolve({ success: false, error: err.message });
        },
      });
    });
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; message?: string; error?: string }> {
    if (!this.isAuthAvailable() || !this.currentUser) {
      return { success: false, error: 'Not authenticated' };
    }

    return new Promise((resolve) => {
      this.currentUser!.changePassword(oldPassword, newPassword, (err) => {
        if (err) {
          console.error('Change password error:', err);
          resolve({ success: false, error: err.message });
          return;
        }

        resolve({ success: true, message: 'Password changed successfully' });
      });
    });
  }

  /**
   * Extract tokens from session
   */
  private extractTokens(session: CognitoUserSession): AuthTokens {
    return {
      idToken: session.getIdToken().getJwtToken(),
      accessToken: session.getAccessToken().getJwtToken(),
      refreshToken: session.getRefreshToken().getToken(),
      expiresAt: session.getIdToken().getExpiration() * 1000, // Convert to milliseconds
    };
  }

  /**
   * Store tokens securely in localStorage
   */
  private storeTokens(tokens: AuthTokens): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('authToken', tokens.idToken);
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      localStorage.setItem('tokenExpiresAt', tokens.expiresAt.toString());
    } catch (error) {
      console.error('Failed to store tokens:', error);
    }
  }

  /**
   * Clear stored tokens
   */
  private clearTokens(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('tokenExpiresAt');
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    if (!this.isAuthAvailable()) {
      return false;
    }

    const session = await this.getSession();
    return session !== null && session.isValid();
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(): boolean {
    if (typeof window === 'undefined') return true;

    const expiresAt = localStorage.getItem('tokenExpiresAt');
    if (!expiresAt) return true;

    return Date.now() >= parseInt(expiresAt);
  }

  /**
   * Get stored token (for API calls)
   */
  getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('authToken');
  }
}

export const authService = new AuthService();
export default authService;

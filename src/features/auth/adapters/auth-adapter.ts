import type { User } from '@/features/users/types'

/**
 * AuthAdapter — swap this interface's implementation to wire up real auth.
 *
 * The mock adapter (mock-auth-adapter.ts) is the default and returns matching
 * users from in-memory mock data. To integrate real auth (Supabase, Clerk,
 * Auth0, a custom JWT backend, etc.), write a new implementation of this
 * interface and change the export in `src/features/auth/adapters/index.ts`.
 *
 * All methods are async so real-world network calls fit the same shape.
 */
export interface AuthAdapter {
  /** Authenticate with credentials. Return the user on success, null on failure. */
  login(email: string, password: string): Promise<User | null>

  /** Clear any server-side session. Client-side state is cleared by the auth store. */
  logout(): Promise<void>

  /** Restore the current user on app boot (e.g. from a stored token). */
  getCurrentUser(): Promise<User | null>

  /** Return an auth token (e.g. JWT) to inject into outgoing HTTP requests, or null. */
  getToken(): string | null
}

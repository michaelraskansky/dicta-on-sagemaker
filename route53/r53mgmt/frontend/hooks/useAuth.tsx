import { createContext, useContext, useMemo, type ReactNode } from 'react';

export interface AuthUser {
  username: string;
  email?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null, token: null,
  signIn: async () => {}, signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// Demo provider — always "signed in" with no real auth.
// Replace with Cognito/OIDC provider for production.
export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AuthContextValue>(() => ({
    user: { username: 'demo' },
    token: null,
    signIn: async () => {},
    signOut: async () => {},
  }), []);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

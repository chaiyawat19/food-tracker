'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import liff from '@line/liff';

interface LiffContextValue {
  ready: boolean;
  isMockMode: boolean;
  displayName: string;
  idToken: string | null;
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

const LiffContext = createContext<LiffContextValue>({
  ready: false,
  isMockMode: false,
  displayName: 'Guest',
  idToken: null,
  authFetch: (input, init) => fetch(input, init),
});

export function LiffProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [isMockMode, setIsMockMode] = useState(false);
  const [displayName, setDisplayName] = useState('คุณ');
  const [idToken, setIdToken] = useState<string | null>(null);

  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    if (!liffId) {
      setIsMockMode(true);
      setIdToken('dev-mock-token');
      setDisplayName('Dev User');
      setReady(true);
      return;
    }

    liff
      .init({ liffId })
      .then(async () => {
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }
        const token = liff.getIDToken();
        setIdToken(token);
        try {
          const profile = await liff.getProfile();
          setDisplayName(profile.displayName);
        } catch {
          // Ignore profile fetch error if scope is minimal
        }
        setReady(true);
      })
      .catch((err) => {
        console.error('LIFF init failed, falling back to dev mode:', err);
        setIsMockMode(true);
        setIdToken('dev-mock-token');
        setReady(true);
      });
  }, []);

  const authFetch = useCallback(
    (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (idToken) {
        headers.set('Authorization', `Bearer ${idToken}`);
      }
      return fetch(input, { ...init, headers });
    },
    [idToken]
  );

  return (
    <LiffContext.Provider value={{ ready, isMockMode, displayName, idToken, authFetch }}>
      {children}
    </LiffContext.Provider>
  );
}

export function useLiff() {
  return useContext(LiffContext);
}

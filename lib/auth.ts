import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import type { Session, User } from '@supabase/supabase-js';

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

let globalSession: Session | null = null;
let globalUser: User | null = null;
let globalLoading = true;

let listeners: Set<() => void> = new Set();

function notify() {
  listeners.forEach((listener) => listener());
}

// Load the existing Supabase session when the app starts
let initialized = false;

async function initializeAuth() {
  if (initialized) return;

  initialized = true;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    globalSession = session;
    globalUser = session?.user ?? null;
  } catch {
    globalSession = null;
    globalUser = null;
  } finally {
    globalLoading = false;
    notify();
  }
}

// Listen for login/logout/session changes
supabase.auth.onAuthStateChange((_event, session) => {
  globalSession = session;
  globalUser = session?.user ?? null;
  globalLoading = false;
  notify();
});

initializeAuth();

export function setAuth(session: Session | null) {
  globalSession = session;
  globalUser = session?.user ?? null;
  globalLoading = false;
  notify();
}

export function useAuth(): AuthState {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const listener = () => {
      forceRender((n) => n + 1);
    };

    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    session: globalSession,
    user: globalUser,
    loading: globalLoading,
  };
}

export type SignUpProfile = {
  full_name: string;
  role: 'student' | 'teacher';
};

export async function signUp(
  email: string,
  password: string,
  profile?: SignUpProfile
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (!error && data.session && profile) {
    await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name,
        role: profile.role,
      })
      .eq('id', data.session.user.id);
  }

  if (!error && data.session) {
    setAuth(data.session);
  }

  return { data, error };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (!error && data.session) {
    setAuth(data.session);
  }

  return { data, error };
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();

    setAuth(null);

    return { error };
  } catch (error: any) {
    setAuth(null);

    return {
      error: error?.message || 'Failed to sign out.',
    };
  }
}
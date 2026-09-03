'use client';
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { getSupabase } from '@/lib/supabase';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
export default function Account() {
  const [open, setOpen] = useState(false),
    [mode, setMode] = useState<'signin' | 'signup' | 'reset' | 'update'>(
      'signin',
    );
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [user, setUser] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    const { data } = sb.auth.onAuthStateChange((event, session) => {
      setUser(session?.user.email ?? null);
      if (event === 'PASSWORD_RECOVERY') {
        setMode('update');
        setOpen(true);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);
  async function submit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    setMessage('');
    try {
      if (mode === 'reset') {
        const { error } = await sb.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setMessage('If an account exists, a reset link is on its way.');
      } else if (mode === 'update') {
        const { error } = await sb.auth.updateUser({ password });
        if (error) throw error;
        setMessage('Password updated.');
        setPassword('');
        setMode('signin');
      } else if (mode === 'signup') {
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) setOpen(false);
        else setMessage('Check your email to confirm your account.');
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setOpen(false);
        setPassword('');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    setBusy(true);
    const { error } = await getSupabase()!.auth.signOut();
    setBusy(false);
    if (error) {
      setMessage(error.message);
      setOpen(true);
    }
  }
  return (
    <>
      <button
        className="button quiet"
        onClick={() => {
          setOpen(true);
          setMessage('');
        }}
      >
        {user ? 'Account' : 'Sign in'}
      </button>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setPassword('');
        }}
      >
        <DialogContent className="account-dialog" showCloseButton={false}>
          <DialogClose className="close-button" aria-label="Close">
            <HugeiconsIcon icon={Cancel01Icon} size={20} />
          </DialogClose>
          <p className="wordmark small">folio</p>
          <DialogTitle className="account-title">
            {user && mode !== 'update'
              ? 'Your account'
              : mode === 'signup'
                ? 'Create an account'
                : mode === 'reset'
                  ? 'Reset your password'
                  : mode === 'update'
                    ? 'Choose a new password'
                    : 'Welcome back.'}
          </DialogTitle>
          <DialogDescription>
            PDF tools are free to use, with or without an account.
          </DialogDescription>
          {!getSupabase() ? (
            <p className="notice">
              Sign-in is not available on this installation yet. You can use
              every PDF tool without an account.
            </p>
          ) : user && mode !== 'update' ? (
            <>
              <p>{user}</p>
              <button
                className="button primary"
                disabled={busy}
                onClick={signOut}
              >
                Sign out
              </button>
            </>
          ) : (
            <form onSubmit={submit} className="auth-form">
              {mode !== 'update' && (
                <label>
                  Email address
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
              )}
              {mode !== 'reset' && (
                <label>
                  Password
                  <input
                    type="password"
                    autoComplete={
                      mode === 'signin' ? 'current-password' : 'new-password'
                    }
                    minLength={mode === 'signin' ? 1 : 8}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
              )}
              <button className="button primary" disabled={busy}>
                {busy
                  ? 'Please wait…'
                  : mode === 'signup'
                    ? 'Create account'
                    : mode === 'reset'
                      ? 'Send reset link'
                      : mode === 'update'
                        ? 'Save password'
                        : 'Sign in'}
              </button>
              {mode !== 'update' && (
                <div className="auth-links">
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === 'signup' ? 'signin' : 'signup');
                      setMessage('');
                    }}
                  >
                    {mode === 'signup'
                      ? 'Already have an account? Sign in'
                      : 'Create an account'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === 'reset' ? 'signin' : 'reset');
                      setMessage('');
                    }}
                  >
                    {mode === 'reset' ? 'Back to sign in' : 'Forgot password?'}
                  </button>
                </div>
              )}
            </form>
          )}
          {message && <output className="notice">{message}</output>}
        </DialogContent>
      </Dialog>
    </>
  );
}

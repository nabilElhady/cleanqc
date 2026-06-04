'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function SetupPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return setError('PASSWORD MUST BE AT LEAST 6 CHARACTERS.');
    setLoading(true);

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // This attaches the new password to the cleaner's active session
    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Password is set! Send them directly to work.
      router.refresh();
      router.push('/crew/jobs');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="max-w-md w-full border border-black p-8 text-center">
        <h1 className="text-2xl font-mono uppercase mb-2 text-black">Account Setup</h1>
        <p className="text-black mb-8 font-mono text-sm uppercase">
          Create a secure password to access your job assignments in the future.
        </p>
        
        {error && (
          <div className="text-red-600 border border-red-600 p-4 mb-4 font-mono text-sm uppercase text-left">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6 text-left">
          <div>
            <label className="block font-mono text-xs uppercase tracking-widest text-black mb-2">
              New Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-black outline-none p-3 font-mono focus:bg-gray-50 transition-colors"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white font-mono uppercase py-4 border border-black hover:bg-white hover:text-black transition-colors disabled:opacity-50"
          >
            {loading ? 'SAVING...' : 'SAVE & VIEW JOBS'}
          </button>
        </form>
      </div>
    </div>
  );
}

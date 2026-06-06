'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

function InviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const token_hash = searchParams.get('token_hash');

  const handleAccept = async () => {
    if (!token_hash) return setError('INVALID INVITATION LINK.');
    setLoading(true);

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase.auth.verifyOtp({
      type: 'invite',
      token_hash,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.refresh(); 
      router.push('/crew/setup');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="max-w-md w-full border border-black p-8 text-center">
        <h1 className="text-2xl font-mono uppercase mb-4 text-black">Crewmark Dispatch</h1>
        {error ? (
          <div className="text-red-600 border border-red-600 p-4 mb-4 font-mono text-sm uppercase">
            {error}
          </div>
        ) : (
          <p className="text-black mb-8 font-mono text-sm uppercase">
            You have been assigned to a new crew. Tap below to securely authenticate your device and view your jobs.
          </p>
        )}
        <button
          onClick={handleAccept}
          disabled={loading || !token_hash}
          className="w-full bg-black text-white font-mono uppercase py-4 border border-black hover:bg-white hover:text-black transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? 'VERIFYING...' : 'ACCEPT INVITE'}
        </button>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <InviteContent />
    </Suspense>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export function BackButton() {
  const router = useRouter();

  return (
    <button 
      onClick={() => router.back()} 
      className="mb-8 inline-flex items-center text-sm text-gray-500 hover:text-black transition-colors"
    >
      <ArrowLeft className="w-4 h-4 mr-2" />
      Back
    </button>
  );
}

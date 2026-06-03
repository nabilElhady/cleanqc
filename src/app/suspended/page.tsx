import Link from 'next/link'
import { ShieldBan } from 'lucide-react'

export default function SuspendedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] text-[#09090B]">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="max-w-md w-full p-8 border border-[#E4E4E7] bg-white shadow-xl relative z-10 text-center space-y-6">
        <div className="flex justify-center text-red-500 mb-4">
          <ShieldBan size={64} />
        </div>
        <h1 className="text-3xl font-bold uppercase tracking-widest font-mono">Account Suspended</h1>
        <p className="text-[#71717A] text-sm">
          Your account has been suspended by a platform administrator. You no longer have access to this workspace.
        </p>
        <div className="pt-4 border-t border-[#E4E4E7]">
          <Link 
            href="/login" 
            className="inline-flex justify-center items-center px-4 py-2 bg-[#09090B] text-white font-mono text-sm uppercase font-bold tracking-wider hover:bg-black transition-colors rounded-none"
          >
            Return to Login
          </Link>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useActionState, useState } from 'react'
import { submitSupportMessage } from '@/app/actions/support'
import { Copy, Check, Send, AlertCircle, Sparkles } from 'lucide-react'
import { BackButton } from '@/components/ui/back-button'

export default function ContactPage() {
  const [state, formAction, isPending] = useActionState(submitSupportMessage, {})
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText('nabil@nabil-systems.xyz')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy', err)
    }
  }

  return (
    <div className="min-h-screen relative bg-background">
      {/* Crisp Grid Background */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0" />
      
      <div className="relative z-10 max-w-3xl mx-auto py-16 px-6 sm:px-8">
        
        <div className="bg-white border border-border shadow-sm p-8 sm:p-12 mb-8">
          <BackButton />
          <h1 className="text-3xl font-black tracking-tighter text-gray-900 mb-2">Contact Support</h1>
          <p className="text-muted-foreground mb-8">
            Need help with your Crewmark account? Send us a message and we'll get back to you as soon as possible.
          </p>

          <form action={formAction} className="space-y-6">
            {state?.success ? (
              <div className="bg-green-50 border border-green-200 text-green-800 p-6 flex flex-col items-center justify-center text-center">
                <Sparkles className="h-8 w-8 mb-4 text-green-600" />
                <h3 className="font-bold text-lg mb-2">Message Sent!</h3>
                <p className="text-sm">We've received your request and will be in touch shortly.</p>
              </div>
            ) : (
              <>
                {state?.error && (
                  <div className="flex items-start gap-3 bg-red-50 border border-red-200 p-4 text-sm text-red-600">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Submission failed</span>
                      <p className="mt-0.5">{state.error}</p>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                      Full Name
                    </label>
                    <input 
                      type="text" 
                      id="name" 
                      name="name" 
                      required
                      placeholder="Jane Doe"
                      className="block w-full px-4 py-3 bg-white border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:border-foreground transition-colors text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                      Email Address
                    </label>
                    <input 
                      type="email" 
                      id="email" 
                      name="email" 
                      required
                      placeholder="jane@company.com"
                      className="block w-full px-4 py-3 bg-white border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:border-foreground transition-colors text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="message" className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                    How can we help?
                  </label>
                  <textarea 
                    id="message" 
                    name="message" 
                    rows={5} 
                    required
                    placeholder="Tell us about your issue..."
                    className="block w-full px-4 py-3 bg-white border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:border-foreground transition-colors text-sm resize-y"
                  ></textarea>
                </div>

                <button 
                  type="submit" 
                  disabled={isPending}
                  className="w-full relative px-8 py-4 bg-foreground text-background font-bold text-sm flex justify-center items-center gap-2 hover:bg-foreground/90 transition-colors disabled:opacity-70"
                >
                  {isPending ? (
                    <span className="flex items-center gap-2">Sending...</span>
                  ) : (
                    <span className="flex items-center gap-2">Send Message <Send className="h-4 w-4" /></span>
                  )}
                </button>
              </>
            )}
          </form>
        </div>

        {/* Fallback Email Card */}
        <div className="bg-card border border-border p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="font-bold text-gray-900 mb-1">Direct Email</h3>
            <p className="text-sm text-muted-foreground">Prefer to use your own email client?</p>
          </div>
          
          <button 
            onClick={handleCopy}
            className="flex items-center gap-2 px-6 py-3 border border-border bg-white hover:bg-gray-50 transition-colors text-sm font-medium w-full sm:w-auto justify-center"
          >
            {copied ? (
              <span className="flex items-center gap-2 text-green-600"><Check className="h-4 w-4" /> Copied</span>
            ) : (
              <span className="flex items-center gap-2 text-gray-700"><Copy className="h-4 w-4" /> nabil@nabil-systems.xyz</span>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}

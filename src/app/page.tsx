'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, ClipboardList, Camera, MapPin, ChevronRight, Zap, CheckCircle2 } from 'lucide-react'

// Magnetic Brutalist CTA Button with instant snap
function SolidCTAButton({ href, children }: { href: string; children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [position, setPosition] = React.useState({ x: 0, y: 0 })

  const handleMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const { clientX, clientY } = e
    const { height, width, left, top } = ref.current.getBoundingClientRect()
    const middleX = clientX - (left + width / 2)
    const middleY = clientY - (top + height / 2)
    setPosition({ x: middleX * 0.2, y: middleY * 0.2 })
  }

  const reset = () => {
    setPosition({ x: 0, y: 0 })
  }

  return (
    <Link href={href}>
      <motion.div
        ref={ref}
        onMouseMove={handleMouse}
        onMouseLeave={reset}
        animate={{ x: position.x, y: position.y }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, mass: 0.5 }}
      >
        <motion.div
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0 }}
          className="relative px-8 py-4 bg-foreground text-background font-bold text-sm flex items-center gap-2 group cursor-pointer"
        >
          <span>{children}</span>
          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
        </motion.div>
      </motion.div>
    </Link>
  )
}

function CrispCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div 
      whileHover="hover"
      initial="initial"
      variants={{
        initial: { boxShadow: '0px 0px 0px #09090B', borderColor: '#E4E4E7' },
        hover: { boxShadow: '4px 4px 0px #09090B', borderColor: '#09090B', transition: { duration: 0.1 } }
      }}
      className={`border bg-card p-8 flex flex-col justify-between ${className}`}
    >
      {children}
    </motion.div>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="relative group text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors duration-200">
      {children}
      <span className="absolute -bottom-1 left-1/2 w-0 h-[1px] bg-foreground transition-all duration-300 ease-out group-hover:w-full group-hover:left-0" />
    </Link>
  )
}

export default function Home() {
  const headline = "Elevate your property cleaning operations."
  const words = headline.split(" ")

  return (
    <div className="min-h-screen bg-background text-foreground relative selection:bg-foreground selection:text-background">
      {/* Crisp Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-foreground flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-background" />
            </div>
            <span className="font-extrabold text-lg tracking-tight">
              Crewmark
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <NavLink href="#features">Features</NavLink>
            <NavLink href="#security">Security</NavLink>
            <NavLink href="/pricing">Pricing</NavLink>
          </nav>

          <div className="flex items-center gap-6">
            <Link href="/login" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors duration-200">
              Login
            </Link>
            <Link
              href="/signup"
              className="px-5 py-2 bg-foreground text-background font-bold text-[11px] uppercase tracking-widest hover:bg-foreground/90 transition-colors duration-200"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-24 max-w-7xl mx-auto px-6 flex flex-col items-start">
        <div className="inline-flex items-center gap-2 px-3 py-1 border border-border text-[10px] font-bold uppercase tracking-widest mb-12 bg-card">
          <Sparkles className="h-3 w-3" />
          <span>Next-Gen Quality Control</span>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 mb-8 max-w-5xl">
          {words.map((word, i) => (
            <div key={i} className="overflow-hidden">
              <motion.span
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 120, delay: i * 0.05 }}
                className="inline-block text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter leading-[1.05]"
              >
                {word}
              </motion.span>
            </div>
          ))}
        </div>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-muted-foreground text-lg sm:text-xl max-w-2xl leading-relaxed mb-12 font-medium"
        >
          The premium, role-based quality control and dispatching platform for property managers and cleaning crew. Eliminate errors, log photo proofs, and review work on-the-fly.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center gap-6"
        >
          <SolidCTAButton href="/login">Get Started Free</SolidCTAButton>
          <Link
            href="/login"
            className="px-6 py-4 font-bold text-[12px] uppercase tracking-widest border border-border hover:bg-card transition-colors duration-200 flex items-center gap-2"
          >
            Manager Dashboard
            <ChevronRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-24 border-t border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16 overflow-hidden">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-4">Capabilities</span>
            <div className="overflow-hidden">
              <motion.h2 
                initial={{ y: "100%" }}
                whileInView={{ y: 0 }}
                viewport={{ once: true }}
                transition={{ type: "spring", damping: 25, stiffness: 120 }}
                className="text-4xl sm:text-5xl font-black tracking-tighter"
              >
                Engineered for absolute operational clarity.
              </motion.h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <CrispCard className="md:col-span-2 min-h-[320px]">
              <motion.div 
                variants={{ hover: { scale: 1.05 } }} 
                transition={{ type: 'spring', stiffness: 400, damping: 25 }} 
                className="h-12 w-12 bg-foreground flex items-center justify-center mb-8 origin-center"
              >
                <ClipboardList className="h-6 w-6 text-background" />
              </motion.div>
              <div>
                <h3 className="text-2xl font-bold mb-4">Smart Ad-Hoc Checklists</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Dispatch new cleaning jobs instantly. Choose a predefined template, create a reusable template on-the-fly, or write custom checklists for unique properties.
                </p>
              </div>
            </CrispCard>

            <CrispCard className="min-h-[320px]">
              <motion.div 
                variants={{ hover: { scale: 1.05 } }} 
                transition={{ type: 'spring', stiffness: 400, damping: 25 }} 
                className="h-12 w-12 bg-foreground flex items-center justify-center mb-8 origin-center"
              >
                <Zap className="h-6 w-6 text-background" />
              </motion.div>
              <div>
                <h3 className="text-2xl font-bold mb-4">Tactile Mobile Crew App</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  A high-fidelity dashboard built for crew. Responsive interfaces, offline stability, and rapid photo upload widgets ensure frictionless compliance.
                </p>
              </div>
            </CrispCard>

            <CrispCard className="min-h-[320px]">
              <motion.div 
                variants={{ hover: { scale: 1.05 } }} 
                transition={{ type: 'spring', stiffness: 400, damping: 25 }} 
                className="h-12 w-12 bg-foreground flex items-center justify-center mb-8 origin-center"
              >
                <Camera className="h-6 w-6 text-background" />
              </motion.div>
              <div>
                <h3 className="text-2xl font-bold mb-4">Signed Photo Proofs</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Upload images securely to private storage buckets. The manager portal displays signed, expiring URL proofs so only authorized personnel can view them.
                </p>
              </div>
            </CrispCard>

            <CrispCard className="md:col-span-2 min-h-[320px]">
              <motion.div 
                variants={{ hover: { scale: 1.05 } }} 
                transition={{ type: 'spring', stiffness: 400, damping: 25 }} 
                className="h-12 w-12 bg-foreground flex items-center justify-center mb-8 origin-center"
              >
                <MapPin className="h-6 w-6 text-background" />
              </motion.div>
              <div>
                <h3 className="text-2xl font-bold mb-4">GPS Verification</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Every checklist response logs precise device GPS coordinates on submission. Managers can instantly cross-reference coordinates with maps directly inside the review portal.
                </p>
              </div>
            </CrispCard>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-24 border-t border-border max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Security & Isolation</span>
            <div className="overflow-hidden mt-4 mb-8">
              <motion.h3 
                initial={{ y: "100%" }}
                whileInView={{ y: 0 }}
                viewport={{ once: true }}
                transition={{ type: "spring", damping: 25, stiffness: 120 }}
                className="text-4xl sm:text-5xl font-black tracking-tighter"
              >
                Built on Multi-Tenant Isolation.
              </motion.h3>
            </div>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              Crewmark implements strict Row-Level Security (RLS) on top of Supabase. Every query, media asset, and checklist record is secured at the database layer, guaranteeing complete organization data isolation.
            </p>
            <div className="space-y-6">
              {['Active Row-Level Security', 'Signed Expiring Storage Access', 'Expiring OTP Magic Verification'].map((item, index) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  key={item} 
                  className="flex items-center gap-4"
                >
                  <CheckCircle2 className="h-5 w-5 text-foreground" />
                  <span className="text-[12px] font-bold uppercase tracking-widest">{item}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <CrispCard className="p-10 !shadow-none border border-border">
            <p className="text-xl leading-relaxed font-medium">
              "Data integrity is our top priority. By leveraging PostgreSQL Row-Level Security, we ensure that every piece of operational data—from GPS logs to signed photos—is strictly isolated to your organization."
            </p>
            <div className="flex items-center gap-4 pt-6 border-t border-border mt-8">
              <div className="h-12 w-12 bg-foreground flex items-center justify-center text-background">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-sm font-bold">Enterprise-Grade Infrastructure</span>
                <span className="block text-[11px] text-muted-foreground uppercase tracking-widest mt-1">Built for Scale & Reliability</span>
              </div>
            </div>
          </CrispCard>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-[11px] text-muted-foreground font-bold uppercase tracking-widest">
          <div className="flex flex-col md:flex-row justify-center items-center space-y-4 md:space-y-0 md:space-x-8 mb-6">
            <Link href="/terms" className="hover:text-foreground transition">Terms & Conditions</Link>
            <Link href="/privacy" className="hover:text-foreground transition">Privacy Policy</Link>
            <Link href="/refunds" className="hover:text-foreground transition">Refund Policy</Link>
            <Link href="/contact" className="hover:text-foreground transition">Contact Support</Link>
          </div>
          <p>&copy; {new Date().getFullYear()} Crewmark. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

import { BackButton } from "@/components/ui/back-button";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen relative bg-background">
      {/* Crisp Grid Background */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0" />
      
      <div className="relative z-10 max-w-3xl mx-auto py-16 px-6 sm:px-8 text-gray-800 bg-white border border-border shadow-sm my-12">
        <BackButton />
        <h1 className="text-3xl font-bold mb-8 text-gray-900">Privacy Policy</h1>
        <p className="mb-4">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-2">1. Data We Collect</h2>
          <p>
            We collect personal information that you provide to us, including your name, email address, company details, and operational data (such as cleaning checklists and job photos) required to run the Crewmark platform. 
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">2. Payment Processing</h2>
          <p>
            We do not store your credit card information. All payments are processed securely by our Merchant of Record, Paddle. Financial data is handled in accordance with Paddle's strict privacy and security policies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">3. Data Storage & Processors</h2>
          <p>
            Your data is securely stored and processed using industry-standard infrastructure providers, specifically Vercel (hosting) and Supabase (database and authentication). 
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">4. Your Rights & Deletion Requests</h2>
          <p>
            You have the right to request access to, correction of, or deletion of your personal data. To request the complete deletion of your account and associated data, please email us directly.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">5. Contact Us</h2>
          <p>
            For any privacy-related inquiries or data deletion requests, please contact: <strong>nabil@nabil-systems.xyz</strong>.
          </p>
        </section>
      </div>
    </div>
    </div>
  );
}

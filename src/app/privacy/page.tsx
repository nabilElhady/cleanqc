export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto py-16 px-6 sm:px-8 text-gray-800">
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
            For any privacy-related inquiries or data deletion requests, please contact: <strong>support@getcrewmark.com</strong>.
          </p>
        </section>
      </div>
    </div>
  );
}

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto py-16 px-6 sm:px-8 text-gray-800">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">Terms & Conditions</h1>
      <p className="mb-4">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-2">1. Agreement to Terms</h2>
          <p>
            By accessing or using Crewmark (getcrewmark.com), you agree to be bound by these Terms. 
            Crewmark is operated and owned by Nabil Ahmed Ali Elhady Ali ("we", "us", or "our").
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">2. Description of Service</h2>
          <p>
            Crewmark is a B2B Software-as-a-Service (SaaS) platform providing quality control, dispatching, and operational tools for cleaning companies. We reserve the right to modify or discontinue the service at any time.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">3. Acceptable Use</h2>
          <p>
            You agree to use Crewmark only for lawful business purposes. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">4. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Nabil Ahmed Ali Elhady Ali and Crewmark shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits or data, resulting from your use of the service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">5. Contact Information</h2>
          <p>
            If you have any questions about these Terms, please contact us at <strong>support@getcrewmark.com</strong>.
          </p>
        </section>
      </div>
    </div>
  );
}

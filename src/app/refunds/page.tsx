export default function RefundPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto py-16 px-6 sm:px-8 text-gray-800">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">Refund Policy</h1>
      <p className="mb-4">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-2">Digital Goods Policy</h2>
          <p>
            Crewmark provides immediate access to digital software and proprietary operational tools upon subscription activation. Due to the digital nature of our platform, <strong>all subscription charges are strictly non-refundable</strong>. We do not offer refunds or credits for partial months of service, downgrade refunds, or refunds for months unused with an open account.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Cancellations</h2>
          <p>
            You may cancel your Crewmark subscription at any time. When you cancel, your subscription will remain active until the end of your current billing cycle, after which you will not be charged again. You can manage your cancellation directly within your account billing settings.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Questions</h2>
          <p>
            If you have an issue with your account or billing, please reach out to us at <strong>support@getcrewmark.com</strong> before initiating any chargebacks.
          </p>
        </section>
      </div>
    </div>
  );
}

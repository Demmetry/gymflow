export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-dark-950 text-dark-200 px-6 py-16">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="font-display text-4xl tracking-wider text-white">TERMS OF SERVICE</h1>
        <p className="text-dark-500 text-sm">Last updated: [DATE — fill in before publishing]</p>

        <p className="text-yellow-400 text-sm border border-yellow-400/20 bg-yellow-400/5 rounded-xl p-4">
          This is a starting draft, not a substitute for review by a lawyer. Get this reviewed
          before onboarding paying gym customers.
        </p>

        <section className="space-y-2">
          <h2 className="text-white font-semibold text-lg">The service</h2>
          <p className="text-sm">GymFlow provides gym management software: membership tracking, attendance, billing records, class scheduling, and related tools. GymFlow is software provided to gym operators; it is not itself a payment processor, fitness trainer, or medical provider.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-white font-semibold text-lg">Accounts</h2>
          <p className="text-sm">Gym owners are responsible for the accuracy of the data they enter and for controlling access granted to staff accounts. You are responsible for keeping your login credentials confidential.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-white font-semibold text-lg">Payments</h2>
          <p className="text-sm">[FILL IN based on your actual billing model — subscription pricing, what happens on late/failed payment, refund policy.]</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-white font-semibold text-lg">Limitation of liability</h2>
          <p className="text-sm">[FILL IN — this section in particular should not be launched without a lawyer's input, especially given health data is stored.]</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-white font-semibold text-lg">Termination</h2>
          <p className="text-sm">[FILL IN — what happens to a gym's data if they cancel or their account is terminated.]</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-white font-semibold text-lg">Contact</h2>
          <p className="text-sm">[FILL IN — a real contact email or address.]</p>
        </section>
      </div>
    </div>
  )
}

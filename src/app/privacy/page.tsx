export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-dark-950 text-dark-200 px-6 py-16">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="font-display text-4xl tracking-wider text-white">PRIVACY POLICY</h1>
        <p className="text-dark-500 text-sm">Last updated: [DATE — fill in before publishing]</p>

        <p className="text-yellow-400 text-sm border border-yellow-400/20 bg-yellow-400/5 rounded-xl p-4">
          This is a starting draft, not a substitute for review by a lawyer familiar with your
          jurisdiction. GymFlow stores health information, emergency contacts, and payment
          history for real people — have this reviewed before relying on it.
        </p>

        <section className="space-y-2">
          <h2 className="text-white font-semibold text-lg">What we collect</h2>
          <p className="text-sm">Name, email, phone number, membership and billing details, attendance history, and — where a gym chooses to record it — health conditions, emergency contact information, and fitness progress measurements (weight, body fat, waist measurements).</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-white font-semibold text-lg">How we use it</h2>
          <p className="text-sm">To operate membership management, attendance tracking, billing, and communication on behalf of the gym you belong to. Health and progress data is used only to support your training and is visible to your gym's staff.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-white font-semibold text-lg">Who can see your data</h2>
          <p className="text-sm">Staff at the specific gym you are a member of. GymFlow does not sell personal data to third parties or share it across unrelated gyms.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-white font-semibold text-lg">Data retention</h2>
          <p className="text-sm">[FILL IN — how long is member data kept after a membership ends or is canceled?]</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-white font-semibold text-lg">Your rights</h2>
          <p className="text-sm">You can request a copy of your data or ask your gym to correct or delete it by contacting your gym directly. [FILL IN — add specifics for your actual jurisdiction, e.g. GDPR/CCPA rights if applicable.]</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-white font-semibold text-lg">Contact</h2>
          <p className="text-sm">[FILL IN — a real contact email or address for privacy questions.]</p>
        </section>
      </div>
    </div>
  )
}

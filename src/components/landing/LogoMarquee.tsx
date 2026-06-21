'use client'

export function LogoMarquee() {
  const gyms = [
    'Iron Peak Fitness', 'PowerHouse Gym', 'Elite Athletics', 'FitZone Pro',
    'Peak Performance', 'CoreStrength Club', 'Velocity Fitness', 'Apex Gym',
    'Force Athletic', 'Pulse Fitness', 'Summit Gym', 'Titan Strength',
  ]

  return (
    <section className="py-12 border-y border-dark-700 overflow-hidden bg-dark-900/50">
      <p className="text-center text-xs text-dark-400 font-body tracking-widest uppercase mb-6">
        Trusted by leading gyms worldwide
      </p>
      <div className="flex gap-8 animate-marquee whitespace-nowrap">
        {[...gyms, ...gyms].map((gym, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-3 text-dark-400 font-display text-xl tracking-widest"
          >
            <span className="w-1.5 h-1.5 bg-lime-400 rounded-full" />
            {gym.toUpperCase()}
          </span>
        ))}
      </div>
    </section>
  )
}

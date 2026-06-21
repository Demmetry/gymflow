'use client'
import { motion } from 'framer-motion'
import { Star, Quote } from 'lucide-react'

const testimonials = [
  { name: 'Marcus Reid', role: 'Owner, Iron Peak Fitness', avatar: 'MR', rating: 5, text: 'GymFlow replaced 4 different tools we were using. Member management, billing, scheduling — all in one place. We saved $400/month and our staff actually enjoys using it.' },
  { name: 'Priya Sharma', role: 'Director, YogaFlow Studio', avatar: 'PS', rating: 5, text: 'The class scheduling and QR check-in features are game changers. Our members love the automated reminders and we have zero no-shows now.' },
  { name: 'Derek Chen', role: 'Co-founder, Apex Athletics', avatar: 'DC', rating: 5, text: 'Switched from a legacy system that cost us $800/month. GymFlow is faster, looks better, and the analytics dashboard gives me insights I never had before.' },
  { name: 'Sofia Martinez', role: 'Owner, CoreStrength Gym', avatar: 'SM', rating: 5, text: 'Setup took literally 20 minutes. Imported all my members from a CSV, set up billing rules, and we were live. The support team is incredible too.' },
  { name: 'Tom Patterson', role: 'GM, FitZone Pro Chain', avatar: 'TP', rating: 5, text: 'Managing 3 locations from a single dashboard is seamless. The multi-location analytics help me see exactly which gym needs attention.' },
  { name: 'Aisha Johnson', role: 'Trainer & Owner, EliteFit', avatar: 'AJ', rating: 5, text: 'As a trainer-turned-owner, GymFlow made the business side simple. Automated payments alone save me 5 hours a week chasing invoices.' },
]

export function Testimonials() {
  return (
    <section id="testimonials" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-dark-900/30 to-transparent" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <span className="text-lime-400 font-mono text-sm tracking-widest uppercase mb-4 block">Social Proof</span>
          <h2 className="font-display text-6xl lg:text-7xl uppercase tracking-wider mb-4">
            LOVED BY GYM<br /><span className="gradient-text">OWNERS</span>
          </h2>
          <div className="flex items-center justify-center gap-1 mt-4">
            {[...Array(5)].map((_, i) => <Star key={i} size={20} className="text-lime-400 fill-lime-400" />)}
            <span className="text-dark-200 text-sm ml-2">4.9 from 1,200+ reviews</span>
          </div>
        </motion.div>

        <div className="columns-1 md:columns-2 lg:columns-3 gap-5 space-y-5">
          {testimonials.map((t, i) => (
            <motion.div key={t.name} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              className="break-inside-avoid bg-dark-800 border border-dark-600 rounded-2xl p-6 hover:border-dark-500 transition-colors">
              <Quote size={24} className="text-lime-400/30 mb-3" />
              <p className="text-dark-200 text-sm leading-relaxed mb-5">{t.text}</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-lime-400/20 to-dark-700 border border-dark-600 flex items-center justify-center text-sm font-bold text-lime-400">{t.avatar}</div>
                <div>
                  <div className="text-white text-sm font-semibold">{t.name}</div>
                  <div className="text-dark-400 text-xs">{t.role}</div>
                </div>
                <div className="ml-auto flex gap-0.5">
                  {[...Array(t.rating)].map((_, j) => <Star key={j} size={12} className="text-lime-400 fill-lime-400" />)}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

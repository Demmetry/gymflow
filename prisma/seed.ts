import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d }
function daysFromNow(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return d }
function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
function pick<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)] }

async function main() {
  console.log('🌱 Seeding database...')

  // ── Owner user ────────────────────────────────────────────────
  const hash = await bcrypt.hash('demo123456', 12)
  const user = await prisma.user.upsert({
    where: { email: 'demo@gymflow.app' },
    update: { password: hash },
    create: { email: 'demo@gymflow.app', name: 'Alex Johnson', password: hash, role: 'ADMIN' },
  })
  console.log('✓ User created')

  // ── Gym ───────────────────────────────────────────────────────
  let gym = await prisma.gym.findUnique({ where: { ownerId: user.id } })
  if (!gym) {
    gym = await prisma.gym.create({
      data: {
        name: 'Iron Peak Fitness', slug: 'iron-peak',
        address: '123 Fitness St, New York, NY 10001',
        phone: '+1 (555) 123-4567', email: 'contact@ironpeak.com',
        plan: 'PROFESSIONAL', planStatus: 'ACTIVE', ownerId: user.id,
      },
    })
  }
  console.log('✓ Gym created')

  // helper: wipe and rebuild every time seed runs
  await prisma.checkIn.deleteMany({ where: { member: { gymId: gym.id } } })
  await prisma.classBooking.deleteMany({ where: { class: { gymId: gym.id } } })
  await prisma.gymClass.deleteMany({ where: { gymId: gym.id } })
  await prisma.payment.deleteMany({ where: { gymId: gym.id } })
  await prisma.storeSale.deleteMany({ where: { gymId: gym.id } })
  await prisma.inventoryItem.deleteMany({ where: { gymId: gym.id } })
  await prisma.planExercise.deleteMany({ where: { plan: { gymId: gym.id } } })
  await prisma.workoutPlan.deleteMany({ where: { gymId: gym.id } })
  await prisma.memberProgress.deleteMany({ where: { member: { gymId: gym.id } } })
  await prisma.member.deleteMany({ where: { gymId: gym.id } })
  await prisma.trainer.deleteMany({ where: { gymId: gym.id } })
  await prisma.payrollRun.deleteMany({ where: { gymId: gym.id } })
  await prisma.staff.deleteMany({ where: { gymId: gym.id } })
  await prisma.lead.deleteMany({ where: { gymId: gym.id } })
  await prisma.equipment.deleteMany({ where: { gymId: gym.id } })
  await prisma.branch.deleteMany({ where: { gymId: gym.id } })
  await prisma.announcement.deleteMany({ where: { gymId: gym.id } })
  console.log('✓ Old data cleared')

  // ── Trainers ──────────────────────────────────────────────────
  const trainers = await Promise.all([
    prisma.trainer.create({ data: { gymId: gym.id, firstName: 'Sarah', lastName: 'Mitchell', email: 'sarah@ironpeak.com', phone: '+1 555-2345', specialties: JSON.stringify(['HIIT','CrossFit','Strength']), bio: '8 years certified PT experience.' } }),
    prisma.trainer.create({ data: { gymId: gym.id, firstName: 'Mike', lastName: 'Torres', email: 'mike@ironpeak.com', phone: '+1 555-3456', specialties: JSON.stringify(['Yoga','Pilates','Flexibility']), bio: 'Yoga & wellness coach, 5 years.' } }),
    prisma.trainer.create({ data: { gymId: gym.id, firstName: 'Dana', lastName: 'Lee', email: 'dana@ironpeak.com', phone: '+1 555-4567', specialties: JSON.stringify(['Boxing','Kickboxing','Cardio']), bio: 'Ex-pro boxer turned coach.' } }),
  ])
  console.log('✓ Trainers created')

  // ── Members ───────────────────────────────────────────────────
  const membersData = [
    { firstName:'Emma',     lastName:'Davis',    email:'emma@ex.com',    type:'MONTHLY',   status:'ACTIVE',   s:-20, e:10,   ci:[1,2,4,6,8,10,12,14,16,18,20] },
    { firstName:'James',    lastName:'Wilson',   email:'james@ex.com',   type:'ANNUAL',    status:'ACTIVE',   s:-90, e:275,  ci:[2,4,6,8,10,14,18,22,26,30,36,42,50,58,66,74,82] },
    { firstName:'Olivia',   lastName:'Brown',    email:'olivia@ex.com',  type:'QUARTERLY', status:'ACTIVE',   s:-60, e:30,   ci:[1,3,5,8,11,15,20,25,30,36,42,50,58] },
    { firstName:'Noah',     lastName:'Taylor',   email:'noah@ex.com',    type:'MONTHLY',   status:'FROZEN',   s:-15, e:15,   ci:[1,3,5,7,9,11,13] },
    { firstName:'Ava',      lastName:'Anderson', email:'ava@ex.com',     type:'MONTHLY',   status:'ACTIVE',   s:-25, e:5,    ci:[2,5,9,14,20,25] },
    { firstName:'Liam',     lastName:'Martinez', email:'liam@ex.com',    type:'ANNUAL',    status:'ACTIVE',   s:-180,e:185,  ci:[3,6,9,12,16,20,25,30,40,50,60,70,80,90,100,110,120,130,140,150,160,170] },
    { firstName:'Sophia',   lastName:'Garcia',   email:'sophia@ex.com',  type:'MONTHLY',   status:'EXPIRED',  s:-45, e:-15,  ci:[1,4,7,10,13] },
    { firstName:'Mason',    lastName:'Lee',      email:'mason@ex.com',   type:'QUARTERLY', status:'ACTIVE',   s:-30, e:60,   ci:[2,5,7,10,13,16,20,24,28] },
    { firstName:'Isabella', lastName:'White',    email:'bella@ex.com',   type:'MONTHLY',   status:'ACTIVE',   s:-10, e:20,   ci:[1,3,5,7,9] },
    { firstName:'Ethan',    lastName:'Harris',   email:'ethan@ex.com',   type:'MONTHLY',   status:'CANCELED', s:-40, e:-10,  ci:[1,3,6,9] },
    { firstName:'Mia',      lastName:'Clark',    email:'mia@ex.com',     type:'ANNUAL',    status:'ACTIVE',   s:-200,e:165,  ci:[5,10,15,20,25,30,40,50,60,70,80,90,100,110,120,130,140,150,160,170,180,190] },
    { firstName:'Lucas',    lastName:'Lewis',    email:'lucas@ex.com',   type:'MONTHLY',   status:'EXPIRED',  s:-35, e:-5,   ci:[2,5] },
    { firstName:'Amelia',   lastName:'Walker',   email:'amelia@ex.com',  type:'QUARTERLY', status:'ACTIVE',   s:-50, e:40,   ci:[1,4,7,10,13,17,21,25,30,36,42,48] },
    { firstName:'Oliver',   lastName:'Hall',     email:'oliver@ex.com',  type:'MONTHLY',   status:'ACTIVE',   s:-8,  e:22,   ci:[1,3,6,8] },
    { firstName:'Harper',   lastName:'Young',    email:'harper@ex.com',  type:'ANNUAL',    status:'ACTIVE',   s:-120,e:245,  ci:[3,6,9,13,17,21,26,32,38,44,50,57,64,71,78,85,92,100,108,116] },
  ]

  const members: any[] = []
  for (const m of membersData) {
    const member = await prisma.member.create({
      data: {
        gymId: gym.id,
        firstName: m.firstName, lastName: m.lastName, email: m.email,
        phone: `+1 555-${rand(1000,9999)}`,
        membershipType: m.type,
        membershipStatus: m.status,
        startDate: m.s < 0 ? daysAgo(-m.s) : daysFromNow(m.s),
        endDate:   m.e < 0 ? daysAgo(-m.e) : daysFromNow(m.e),
        goals: pick(['Lose weight','Build muscle','Improve endurance','Stay healthy','Train for marathon']),
        freezeStartedAt:  m.status === 'FROZEN' ? daysAgo(3) : null,
        totalFreezeWeeks: m.status === 'FROZEN' ? 15 : 0,
      },
    })
    for (const d of m.ci) {
      const dt = daysAgo(d); dt.setHours(rand(6,21), rand(0,59), 0, 0)
      await prisma.checkIn.create({ data: { memberId: member.id, checkedIn: dt, method: pick(['MANUAL','QR','MANUAL']) } })
    }
    members.push(member)
  }
  console.log(`✓ ${members.length} members + check-ins created`)

  // ── Classes ───────────────────────────────────────────────────
  const classesData = [
    { name:'Morning HIIT Blast',      tr:0, cat:'HIIT',     dur:45, cap:20, color:'#b5ff47', h:6 },
    { name:'Power Yoga Flow',         tr:1, cat:'YOGA',     dur:60, cap:15, color:'#60a5fa', h:9 },
    { name:'CrossFit Challenge',      tr:0, cat:'CROSSFIT', dur:60, cap:12, color:'#f97316', h:18 },
    { name:'Kickboxing Basics',       tr:2, cat:'BOXING',   dur:45, cap:16, color:'#f43f5e', h:11 },
    { name:'Evening Pilates',         tr:1, cat:'PILATES',  dur:50, cap:10, color:'#a78bfa', h:19 },
    { name:'Strength & Conditioning', tr:0, cat:'STRENGTH', dur:55, cap:14, color:'#34d399', h:7 },
  ]
  for (const c of classesData) {
    const start = daysFromNow(1); start.setHours(c.h,0,0,0)
    const end = new Date(start); end.setMinutes(end.getMinutes() + c.dur)
    const cls = await prisma.gymClass.create({
      data: { gymId: gym.id, trainerId: trainers[c.tr].id, name: c.name, category: c.cat, duration: c.dur, capacity: c.cap, color: c.color, startTime: start, endTime: end },
    })
    const slots = Math.floor(c.cap * rand(50,90) / 100)
    for (let i = 0; i < slots && i < members.length; i++) {
      await prisma.classBooking.create({ data: { classId: cls.id, memberId: members[i].id, status: 'CONFIRMED' } })
    }
  }
  console.log('✓ Classes + bookings created')

  // ── Payments ──────────────────────────────────────────────────
  const amounts: Record<string,number> = { DAILY:5, MONTHLY:49, QUARTERLY:120, ANNUAL:399 }
  for (const m of members) {
    for (let i = 0; i < rand(1,4); i++) {
      await prisma.payment.create({
        data: {
          gymId: gym.id, memberId: m.id,
          amount: amounts[m.membershipType] + rand(-5,10),
          type: 'MEMBERSHIP', status: pick(['COMPLETED','COMPLETED','COMPLETED','PENDING']),
          method: pick(['CARD','CASH','CARD']), description: `${m.membershipType} membership`,
          paidAt: daysAgo(rand(0,90)),
        },
      })
    }
  }
  // Store payments
  for (let i = 0; i < 10; i++) {
    await prisma.payment.create({
      data: { gymId: gym.id, memberId: pick(members).id, amount: rand(20,80), type: 'PRODUCT', status: 'COMPLETED', method: 'CASH', description: 'Supplement purchase', paidAt: daysAgo(rand(0,30)) },
    })
  }
  console.log('✓ Payments created')

  // ── Equipment ─────────────────────────────────────────────────
  const equip = [
    { name:'Treadmill #1',      cat:'CARDIO',       brand:'Life Fitness',    status:'OPERATIONAL',   nextD:30 },
    { name:'Treadmill #2',      cat:'CARDIO',       brand:'Life Fitness',    status:'MAINTENANCE',   nextD:-5 },
    { name:'Treadmill #3',      cat:'CARDIO',       brand:'Technogym',       status:'OPERATIONAL',   nextD:60 },
    { name:'Rowing Machine',    cat:'CARDIO',       brand:'Concept2',        status:'OPERATIONAL',   nextD:45 },
    { name:'Lat Pulldown',      cat:'STRENGTH',     brand:'Hammer Strength', status:'OPERATIONAL',   nextD:90 },
    { name:'Leg Press',         cat:'STRENGTH',     brand:'Hammer Strength', status:'OUT_OF_SERVICE',nextD:-10 },
    { name:'Cable Machine',     cat:'STRENGTH',     brand:'Life Fitness',    status:'OPERATIONAL',   nextD:20 },
    { name:'Olympic Barbell',   cat:'FREE_WEIGHTS', brand:'Rogue',           status:'OPERATIONAL',   nextD:180 },
    { name:'Spin Bike #1',      cat:'CARDIO',       brand:'Peloton',         status:'OPERATIONAL',   nextD:15 },
    { name:'Spin Bike #2',      cat:'CARDIO',       brand:'Peloton',         status:'MAINTENANCE',   nextD:-2 },
    { name:'Pull-up Station',   cat:'FUNCTIONAL',   brand:'Rogue',           status:'OPERATIONAL',   nextD:120 },
    { name:'Dumbbells 5–50kg',  cat:'FREE_WEIGHTS', brand:'Rogue',           status:'OPERATIONAL',   nextD:180 },
  ]
  for (const e of equip) {
    await prisma.equipment.create({
      data: { gymId: gym.id, name: e.name, category: e.cat, brand: e.brand, status: e.status,
        lastMaintenance: daysAgo(rand(30,90)),
        nextMaintenance: e.nextD > 0 ? daysFromNow(e.nextD) : daysAgo(-e.nextD) },
    })
  }
  console.log('✓ Equipment created')

  // ── Leads ─────────────────────────────────────────────────────
  const leadsData = [
    { first:'Carlos',  last:'Mendez',  src:'INSTAGRAM', status:'NEW',         fu:-1 },
    { first:'Priya',   last:'Sharma',  src:'WHATSAPP',  status:'CONTACTED',   fu:2  },
    { first:'Jake',    last:'Roberts', src:'WALK_IN',   status:'TRIAL',       fu:3  },
    { first:'Nina',    last:'Patel',   src:'WEBSITE',   status:'NEGOTIATING', fu:1  },
    { first:'Zara',    last:'Ahmed',   src:'REFERRAL',  status:'CONVERTED',   fu:0  },
    { first:'Bryan',   last:'Cole',    src:'INSTAGRAM', status:'LOST',        fu:0  },
    { first:'Yuki',    last:'Tanaka',  src:'WALK_IN',   status:'NEW',         fu:0  },
    { first:'Fatima',  last:'Hassan',  src:'INSTAGRAM', status:'CONTACTED',   fu:-2 },
    { first:'George',  last:'King',    src:'WEBSITE',   status:'TRIAL',       fu:4  },
    { first:'Elena',   last:'Novak',   src:'REFERRAL',  status:'CONVERTED',   fu:0  },
  ]
  for (const l of leadsData) {
    const lead = await prisma.lead.create({
      data: {
        gymId: gym.id, firstName: l.first, lastName: l.last,
        email: `${l.first.toLowerCase()}@mail.com`, phone: `+1 555-${rand(1000,9999)}`,
        source: l.src, status: l.status,
        followUpAt: l.fu !== 0 ? (l.fu > 0 ? daysFromNow(l.fu) : daysAgo(-l.fu)) : null,
        notes: pick(['Interested in monthly plan','Wants PT sessions','Likes morning slots','Budget conscious','Looking for group classes']),
        createdAt: daysAgo(rand(1,30)),
      },
    })
    await prisma.leadInteraction.create({
      data: { leadId: lead.id, type: pick(['CALL','MESSAGE','EMAIL','VISIT']), note: pick(['Called, left voicemail','Very interested, following up','Toured the gym','Sent pricing PDF','Scheduled trial session']) },
    })
  }
  console.log('✓ Leads created')

  // ── Staff + Payroll ───────────────────────────────────────────
  const staffData = [
    { first:'Sara',  last:'White',  email:'sara@ironpeak.com', role:'TRAINER', salary:2800 },
    { first:'John',  last:'Peters', email:'john@ironpeak.com', role:'MANAGER', salary:3500 },
    { first:'Kim',   last:'Adams',  email:'kim@ironpeak.com',  role:'STAFF',   salary:2200 },
  ]
  const staffList: any[] = []
  for (const s of staffData) {
    const st = await prisma.staff.create({
      data: { gymId: gym.id, firstName: s.first, lastName: s.last, email: s.email, role: s.role, salary: s.salary, salaryType: 'MONTHLY' },
    })
    staffList.push(st)
  }
  const now = new Date()
  for (const st of staffList) {
    for (let mOffset = 2; mOffset >= 0; mOffset--) {
      let month = now.getMonth() + 1 - mOffset
      let year  = now.getFullYear()
      if (month <= 0) { month += 12; year -= 1 }
      const commission = rand(50, 400)
      const bonus      = mOffset === 0 ? rand(0, 200) : 0
      const deductions = rand(0, 50)
      const total      = st.salary + commission + bonus - deductions
      await prisma.payrollRun.create({
        data: {
          gymId: gym.id, staffId: st.id, month, year,
          baseSalary: st.salary, commission, bonus, deductions, total,
          status: mOffset > 0 ? 'PAID' : 'PENDING',
          paidAt: mOffset > 0 ? daysAgo(mOffset * 30) : null,
        },
      })
    }
  }
  console.log('✓ Staff + payroll created')

  // ── Branches ──────────────────────────────────────────────────
  await prisma.branch.createMany({
    data: [
      { gymId: gym.id, name:'Downtown Branch', address:'456 Main St, Manhattan', phone:'+1 555-7890', email:'downtown@ironpeak.com', manager:'John Peters', isActive:true },
      { gymId: gym.id, name:'Midtown Branch',  address:'789 Park Ave, Midtown',  phone:'+1 555-8901', email:'midtown@ironpeak.com',  manager:'Sara White',  isActive:true },
    ],
  })
  console.log('✓ Branches created')

  // ── Inventory ─────────────────────────────────────────────────
  const invData = [
    { name:'Whey Protein 1kg (Chocolate)', sku:'WP-CHO', cat:'SUPPLEMENT', cost:25, sell:45, stock:18, low:5 },
    { name:'Whey Protein 1kg (Vanilla)',   sku:'WP-VAN', cat:'SUPPLEMENT', cost:25, sell:45, stock:12, low:5 },
    { name:'Creatine Monohydrate 500g',    sku:'CR-500', cat:'SUPPLEMENT', cost:12, sell:28, stock:22, low:5 },
    { name:'Pre-Workout (30 servings)',    sku:'PW-030', cat:'SUPPLEMENT', cost:18, sell:38, stock:3,  low:5 },
    { name:'Protein Bar Box x12',          sku:'PB-012', cat:'SUPPLEMENT', cost:14, sell:25, stock:15, low:5 },
    { name:'Energy Drink 500ml',           sku:'ED-500', cat:'DRINK',      cost:1,  sell:4,  stock:48, low:10 },
    { name:'Water Bottle 750ml',           sku:'WB-750', cat:'DRINK',      cost:1,  sell:3,  stock:60, low:20 },
    { name:'Iron Peak T-Shirt (M)',        sku:'TS-M',   cat:'MERCHANDISE',cost:8,  sell:22, stock:9,  low:5 },
    { name:'Iron Peak Hoodie',             sku:'HD-OS',  cat:'MERCHANDISE',cost:20, sell:55, stock:4,  low:3 },
    { name:'Resistance Bands Set',         sku:'RB-SET', cat:'EQUIPMENT',  cost:10, sell:30, stock:7,  low:3 },
    { name:'Gym Gloves',                   sku:'GG-UNI', cat:'EQUIPMENT',  cost:6,  sell:18, stock:2,  low:3 },
  ]
  const invItems: any[] = []
  for (const item of invData) {
    const created = await prisma.inventoryItem.create({
      data: { gymId: gym.id, name: item.name, sku: item.sku, category: item.cat, costPrice: item.cost, sellPrice: item.sell, stock: item.stock, lowStockAt: item.low },
    })
    invItems.push(created)
  }
  for (let i = 0; i < 20; i++) {
    const item = pick(invItems)
    const qty = rand(1,3)
    await prisma.storeSale.create({
      data: { gymId: gym.id, itemId: item.id, quantity: qty, unitPrice: item.sellPrice, total: item.sellPrice * qty, method: pick(['CASH','CARD']), soldAt: daysAgo(rand(0,30)) },
    })
  }
  console.log('✓ Inventory + sales created')

  // ── Workout Plans + Progress ──────────────────────────────────
  const activeMembers = members.filter(m => m.membershipStatus === 'ACTIVE').slice(0, 5)
  for (const m of activeMembers) {
    const plan = await prisma.workoutPlan.create({
      data: { gymId: gym.id, memberId: m.id, title: pick(['Strength Builder 8W','Fat Loss Program','Endurance Pack','Full Body Recomp']), goal: pick(['MUSCLE_GAIN','WEIGHT_LOSS','ENDURANCE']), weeks: 8, isActive: true, description: 'Customized 8-week program tailored to your goals.' },
    })
    const exs = [
      { name:'Bench Press', sets:4, reps:'8-10', rest:90,  day:1 },
      { name:'Squat',       sets:4, reps:'6-8',  rest:120, day:2 },
      { name:'Pull-ups',    sets:3, reps:'8-12', rest:60,  day:3 },
      { name:'Deadlift',    sets:3, reps:'5',    rest:180, day:4 },
      { name:'5km Run',     sets:1, reps:'1',    rest:0,   day:5 },
    ]
    for (const ex of exs) {
      await prisma.planExercise.create({ data: { planId: plan.id, ...ex } })
    }
    for (let w = 8; w >= 0; w--) {
      await prisma.memberProgress.create({
        data: { memberId: m.id, weight: 75 + rand(-3,3) + w * 0.2, bodyFat: 20 - w * 0.15, waist: 82 - w * 0.2, notes: w === 0 ? 'Latest measurement' : '', recordedAt: daysAgo(w * 7) },
      })
    }
  }
  console.log('✓ Workout plans + progress created')

  // ── Announcements ─────────────────────────────────────────────
  await prisma.announcement.createMany({
    data: [
      { gymId: gym.id, title:'🎉 Summer Challenge Starts June 1st', content:'8-week transformation challenge. Prizes for top 3!' },
      { gymId: gym.id, title:'⚠️ Leg Press Out of Service', content:'The leg press is being repaired. Use Smith machine as alternative.' },
      { gymId: gym.id, title:'🥗 Nutrition Bar Now Open', content:'Protein shakes, meals, and supplements available 7am–9pm daily.' },
    ],
  })
  console.log('✓ Announcements created')

  console.log('')
  console.log('✅ Seed complete!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔑  Email:    demo@gymflow.app')
  console.log('🔑  Password: demo123456')
  console.log('🌐  URL:      http://localhost:3000')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch(e => { console.error('❌ Seed failed:', e); process.exit(1) }).finally(() => prisma.$disconnect())

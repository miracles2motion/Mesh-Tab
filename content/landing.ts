export const LANDING_CONTENT = {
  metadata: {
    title: "MeshTab | Zero-Friction Group Expense Netting on Monad",
    description: "Replace crisscrossing international bank wires with a single, gasless ledger. Settle group expenses instantly in stablecoins on Monad.",
    keywords: ["Monad", "expense tracker", "debt netting", "stablecoin settlement", "gasless", "passkeys", "fintech"],
  },
  hero: {
    badge: "Live on Monad Mainnet",
    headline: "The end of group debt.",
    headlineHighlight: "Settled instantly.",
    subheadline: "MeshTab replaces crisscrossing international bank wires with a single, gasless ledger. We calculate the minimum possible payments and settle them instantly in stablecoins.",
    primaryCta: "Create a Smart Tab",
    secondaryCta: "View Live Demo",
  },
  socialProof: {
    text: "Powered by next-generation Web3 infrastructure",
    partners: [
      { name: "Monad", src: "/logos/monad.svg" },
      { name: "Dynamic", src: "/logos/dynamic.svg" },
      { name: "Pimlico", src: "/logos/pimlico.svg" },
      { name: "Envio", src: "/logos/envio.png" },
      { name: "Agora", src: "/logos/agora.svg" },
      { name: "Alchemy", src: "/logos/alchemy.svg" },
      { name: "Mera", src: "/logos/mera.svg?v=2" }
    ],
  },
  problemAgitation: {
    title: "The Web2 Friction",
    description: "When friends travel across borders, they accumulate shared expenses across different currencies. Settling up means dealing with foreign exchange fees, slow bank wires, and the headache of figuring out who owes whom.",
    painPoints: [
      { title: "Foreign Exchange Fees", desc: "Every time you pay a friend in a different country, banks take a 3-5% cut." },
      { title: "Manual Spreadsheets", desc: "You have to manually track receipts, figure out who paid for what, and do the math yourself." },
      { title: "Crisscrossing Payments", desc: "If you owe Sarah $50, and Sarah owes Ben $50, you both have to make separate transfers." }
    ]
  },
  solutionReveal: {
    title: "The MeshTab Solution",
    description: "All shared expenses are recorded on a single ledger. Instead of every person paying each other back through crisscrossing transfers, our graph algorithm cancels out mutual debt obligations and consolidates residual amounts into the minimum number of direct payments."
  },
  howItWorks: {
    title: "How It Works",
    steps: [
      { step: "01", title: "Create a Smart Tab", desc: "Name your trip and invite your friends via a simple link." },
      { step: "02", title: "Claim with a Passkey", desc: "Friends tap their name and use FaceID to instantly bind a gasless smart account." },
      { step: "03", title: "Tangle Netting", desc: "Log expenses in any currency. When the trip is over, MeshTab calculates the most efficient settlement map." },
      { step: "04", title: "Stablecoin Settlement", desc: "Pay your exact residual debt in AUSD, funded instantly via Apple Pay." }
    ]
  },
  features: [
    {
      title: "Multilateral Netting",
      description: "Our offchain graph algorithm cancels out mutual debt, consolidating residual amounts into the absolute minimum number of direct payments.",
      icon: "Network",
    },
    {
      title: "Mera Passkeys",
      description: "Bind your smart account instantly using FaceID or TouchID. Zero browser extensions or seed phrases required for your friends to join.",
      icon: "Fingerprint",
    },
    {
      title: "Stablecoin Settlement",
      description: "Bypass international wire fees entirely. Debts are settled atomically on Monad using Agora AUSD, funded instantly via Apple Pay.",
      icon: "Wallet",
    },
    {
      title: "Gasless Abstraction",
      description: "You never pay gas fees to log an expense. Our Verifying Paymaster sponsors all ledger operations permanently.",
      icon: "Zap",
    }
  ],
  nettingVisualizer: {
    title: "Watch the math work.",
    description: "12 crisscrossing international bank wires collapse into just 3 direct payments. $900 of gross volume cleared without moving a single cent of capital.",
    cta: "Calculate Settlement Map",
  },
  comparison: {
    title: "Why MeshTab?",
    headers: ["Feature", "MeshTab", "Splitwise + Bank Transfer"],
    rows: [
      { feature: "Settlement Speed", us: "Instant", them: "3-5 Business Days" },
      { feature: "Fee Events / Cost", us: "Reduced to 1–2 (Netted)", them: "Up to 12 Transfers (Crisscrossing)" },
      { feature: "Crisscrossing Payments", us: "Eliminated (Netting)", them: "Required" },
      { feature: "Web3 Onboarding", us: "Passkeys (FaceID)", them: "N/A" }
    ]
  },
  faq: [
    {
      question: "Do my friends need crypto wallets to join?",
      answer: "No. MeshTab uses Mera Passkeys, which instantly generate a smart account bound to their FaceID or TouchID. They never see a seed phrase or install a browser extension."
    },
    {
      question: "Who pays for the network gas fees?",
      answer: "Ledger writes (logExpense) are permanently gasless via our Verifying Paymaster, while final settlements deduct a sub-cent fee directly from the AUSD transferred."
    },
    {
      question: "How do I fund my account?",
      answer: "When it's time to settle, you can instantly purchase Agora AUSD directly within the app using Apple Pay, Google Pay, or a standard debit card via Dynamic."
    }
  ],
  finalCta: {
    title: "Ready to settle the tab?",
    description: "Join thousands of groups saving time and money on international trips.",
    cta: "Launch App",
  }
} as const;

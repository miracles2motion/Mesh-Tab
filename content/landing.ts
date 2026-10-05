export const LANDING_CONTENT = {
  metadata: {
    title: "MeshTab | Zero-Friction Group Expense Netting on Monad",
    description: "Replace crisscrossing international bank wires with a single, gasless ledger. Settle group expenses instantly in stablecoins on Monad.",
    keywords: ["Monad", "expense tracker", "debt netting", "stablecoin settlement", "gasless", "passkeys", "fintech"],
  },
  hero: {
    badge: "Monad Metropolis Hackathon Sandbox",
    headline: "The end of group debt.",
    headlineHighlight: "Settled instantly.",
    subheadline: "MeshTab replaces crisscrossing international bank wires with a single, gasless ledger. We calculate the minimum possible payments and settle them instantly in stablecoins.",
    primaryCta: "Explore Demo Tab",
    secondaryCta: "Explore Testnet",
  },
  socialProof: {
    text: "Powered by next-generation Web3 infrastructure",
    partners: [
      { name: "Monad", src: "/logos/monad.svg" },
      { name: "Privy", src: "/logos/privy-logo-dark.png" },
      { name: "Envio", src: "/logos/envio.svg" },
      { name: "Agora", src: "/logos/agora.svg" },
      { name: "Pimlico", src: "/logos/pimlico.svg" }
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
      { step: "04", title: "Stablecoin Settlement", desc: "Pay your exact residual debt in AUSD, funded instantly via Card or Bank Transfer." }
    ]
  },
  features: [
    {
      title: "Multilateral Netting",
      description: "Our offchain graph algorithm cancels out mutual debt, consolidating residual amounts into the absolute minimum number of direct payments.",
      icon: "Network",
    },
    {
      title: "Touch ID & Face ID",
      description: "Secure your account in 1 tap with your device's built-in biometrics. No passwords, seed phrases, or extra apps required.",
      icon: "Fingerprint",
    },
    {
      title: "Digital Dollar Settlement",
      description: "Bypass international bank wire fees entirely. Debts are settled instantly using 1:1 Digital Dollars, funded effortlessly via Card or Bank Transfer.",
      icon: "Wallet",
    },
    {
      title: "Zero Transfer Fees",
      description: "You never pay transfer fees to log an expense or split a tab. All routine ledger operations are 100% free and sponsored.",
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
      { feature: "Sign-in Speed", us: "Touch ID / Face ID", them: "Password / Manual" }
    ]
  },
  faq: [
    {
      question: "Do my friends need crypto apps or special accounts to join?",
      answer: "No. Friends join in seconds using Face ID or Touch ID on their phone. No passwords, no wallet extensions, and no complex account setups required."
    },
    {
      question: "Are there any fees for adding expenses or splitting tabs?",
      answer: "None. Logging expenses and calculating debt netting are permanently free. All ledger updates are sponsored by the platform with zero transaction fees."
    },
    {
      question: "How do I fund and cash out my balance?",
      answer: "When it's time to settle, you can fund your balance instantly using your Virtual Visa Card, debit card, or bank transfer. You can cash out to your bank account or Visa card in seconds."
    }
  ],
  finalCta: {
    title: "Ready to settle the tab?",
    description: "Join thousands of groups saving time and money on international trips.",
    cta: "Explore Demo Tab",
  }
} as const;

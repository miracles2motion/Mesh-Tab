export const LANDING_CONTENT = {
  metadata: {
    title: "MeshTab | Close the tab. Keep the friends.",
    description: "Log expenses in any currency. MeshTab nets them into fewer payments, and everyone settles in one tap.",
    keywords: ["Monad", "expense tracker", "debt netting", "stablecoin settlement", "gasless", "passkeys", "fintech", "travel expenses"],
  },
  hero: {
    badge: "Live on Monad Testnet · Sponsored Gas",
    headline: "Close the tab.",
    headlineHighlight: "Keep the friends.",
    subline: "Group expenses, without the awkward money conversations.",
    body: "Log expenses in any currency. MeshTab nets them into fewer payments, and everyone settles in one tap.",
    primaryCta: "Start a tab.",
    primaryCtaMicro: "Cross-currency debt netting and one-tap, sponsored on-chain settlement on Monad Testnet.",
    secondaryCta: "Try the sample",
    secondaryCtaMicro: "Opens the sample tab, no sign-in.",
    metrics: [
      { label: "Fewer Transfers", val: "67%" },
      { label: "Gas Fees", val: "$0" },
      { label: "Settlement Finality", val: "800 ms" },
      { label: "Currencies", val: "6 live rates, 3 indicative" }
    ]
  },
  socialProof: {
    text: "Engineered on Monad with Ecosystem Infrastructure",
    partners: [
      { name: "Monad", src: "/logos/monad.svg" },
      { name: "Privy", src: "/logos/privy-logo-dark.png" },
      { name: "Agora", src: "/logos/agora.svg" },
      { name: "Pimlico", src: "/logos/pimlico.svg" }
    ],
  },
  nettingVisualizer: {
    stakes: "Four friends. Lisbon trip. 6 expenses across 3 currencies (EUR, GBP, USD). Here is what settling up actually looks like.",
    title: "Watch the math untangle.",
    description: "9 fragmented cross-border transfers collapse into just 3 direct payments in AUSD. $391.54 of net liquidity clears the entire trip.",
    cta: "Untangle it",
    resetCta: "Reset to Chaos",
    demoLink: "Open this exact Lisbon trip in the demo →",
    caption: "Illustrative example. Your tab's results depend on who paid and which currencies you use."
  },
  settlementMoment: {
    badge: "The Settlement Engine",
    title: "Legacy apps tell you who owes whom. MeshTab actually clears the balance.",
    description: "Traditional splitting apps lack cross-border settlement rails, leaving international travel groups stranded with manual bank wires and exchange markups. MeshTab executes the final settlement schedule in one tap on Monad.",
    metrics: [
      { title: "Execution Speed", val: "800ms", desc: "Consensus finality on Monad" },
      { title: "User Gas Cost", val: "$0.00", desc: "Sponsored via Pimlico ERC-4337" },
      { title: "Authentication", val: "Passkey", desc: "Native Face ID / Touch ID" }
    ]
  },
  problemAgitation: {
    title: "Splitting a trip is easy. Paying it back isn't.",
    description: "Four friends travel to Lisbon. Over their trip they accumulate shared expenses across Euros, British Pounds, and US Dollars. Here is where traditional payment systems break down.",
    painPoints: [
      { title: "Siloed Currencies", desc: "Traditional splitting tools don't net across different currencies, leaving groups with 9 separate international transfers across multiple bank accounts." },
      { title: "Bank & Card Fees", desc: "Traditional payment rails often add foreign-transaction fees and FX markups on cross-border wires." },
      { title: "The Spreadsheet Trap", desc: "Someone spends hours in a spreadsheet trying to reconcile receipts, then spends three weeks chasing friends in WhatsApp." }
    ]
  },
  howItWorks: {
    title: "How MeshTab works",
    steps: [
      { step: "01", title: "Start a trip tab", desc: "Name your trip and share a single invite link with your group." },
      { step: "02", title: "Join with one tap", desc: "Friends tap their name and authenticate with Face ID or fingerprint. Zero wallet setup." },
      { step: "03", title: "Log as you go", desc: "Snap receipts with Gemini OCR, speak an expense aloud, or type it in any currency. Works offline." },
      { step: "04", title: "Settle in one tap", desc: "MeshTab calculates the optimal settlement schedule and clears residual balances on Monad." }
    ]
  },
  liveSuperpowers: {
    title: "Live in this demo",
    description: "Production-grade features built directly for the Monad Metropolis Hackathon.",
    items: [
      {
        tag: "Client-Side AI",
        title: "Receipt Scanning (Gemini Flash Latest)",
        desc: "Take a photo of any physical receipt. Merchant and total amounts parse in ~1s using Gemini Flash Latest with automated multi-tier fallback resilience.",
        icon: "Camera"
      },
      {
        tag: "Web Speech API",
        title: "Voice Expense Logging",
        desc: "Say '85 dollars for dinner' out loud. Speech is transcribed and converted into a verified draft expense.",
        icon: "Mic"
      },
      {
        tag: "Pyth Oracle",
        title: "Real-Time Pyth Network FX",
        desc: "Live mid-market currency feeds across 6 major global currencies plus USD. Log in EUR, settle in AUSD with zero bank markups.",
        icon: "Coins"
      },
      {
        tag: "Local-First PWA",
        title: "Offline-First PWA Sync",
        desc: "Log expenses on an airplane or without cellular coverage. Changes queue locally in a persistent outbox and reconcile automatically on reconnect.",
        icon: "WifiOff"
      }
    ]
  },
  maturityMatrix: {
    title: "What is live today vs. what comes next",
    description: "Radical transparency: the core settlement engine is live; consumer banking rails are planned.",
    live: [
      { name: "Netting Engine", detail: "Greedy net-position matching off-chain" },
      { name: "Monad Settlement Contract", detail: "MeshTabAgoraLedger verified on testnet" },
      { name: "Biometric Passkey Accounts", detail: "Embedded smart accounts via Privy" },
      { name: "Sponsored Gas Relaying", detail: "ERC-4337 paymaster via Pimlico" },
      { name: "Gemini Flash OCR (Latest)", detail: "Receipt parsing with automated multi-tier fallback" },
      { name: "Pyth Oracle FX Feeds", detail: "Live mid-market rates for 6 currencies" },
      { name: "Offline Sync Outbox", detail: "Persistent local-first reconciliation" }
    ],
    inDevelopment: [
      { name: "Fiat Card / Bank On-Ramp", detail: "Deposit local currency directly into AUSD" },
      { name: "Virtual Visa Card", detail: "Spend trip balances at physical merchants" },
      { name: "Automated Yield Vault", detail: "Earn yield on idle group trip reserves" }
    ]
  },
  faq: [
    {
      question: "Do my friends need a crypto wallet?",
      answer: "No. Friends join in seconds using their face or fingerprint. Smart accounts are generated seamlessly in the background."
    },
    {
      question: "Are there any transaction fees?",
      answer: "None in this demo. All transaction gas on Monad Testnet is sponsored by the platform."
    },
    {
      question: "What happens if someone doesn't pay?",
      answer: "MeshTab does not custody user funds and nothing forces payment. Settlement is peer-to-peer and requires each debtor's biometric approval. The app calculates the optimal netted schedule so friends settle cleanly when they are ready. Smart escrow reserves are on our roadmap."
    },
    {
      question: "Why not traditional splitting apps?",
      answer: "Traditional expense apps record who owes whom and net only one currency at a time. MeshTab nets across currencies and settles directly in digital dollars in the same app."
    },
    {
      question: "Is this real money?",
      answer: "No. This is a hackathon demo on Monad Testnet using Agora's official testnet AUSD (available free from the in-app faucet)."
    },
    {
      question: "Can I fund or withdraw with a debit card?",
      answer: "Not in this demo. Fiat card funding and bank cash-out are in active development for our mainnet roadmap."
    },
    {
      question: "What is stored on-chain vs. off-chain?",
      answer: "Expense receipts and graph netting are calculated off-chain for speed; final settlement payments execute on-chain via the MeshTabAgoraLedger contract on Monad Testnet."
    }
  ],
  finalCta: {
    title: "Close the tab. Keep the friends.",
    description: "Try the sample tab in 30 seconds. No sign-in or wallet required.",
    cta: "Try the sample",
  }
} as const;

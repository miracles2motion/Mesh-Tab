export type KBCategoryId = 
  | "netting" 
  | "monad-web3" 
  | "settlement" 
  | "expenses" 
  | "groups" 
  | "sandbox" 
  | "security";

export interface KBCategory {
  id: KBCategoryId;
  label: string;
  icon: string;
  description: string;
}

export interface KBAction {
  label: string;
  type: "navigate" | "faucet" | "toggle-mode" | "custom";
  destination?: string;
}

export interface KBArticle {
  id: string;
  categoryId: KBCategoryId;
  title: string;
  keywords: string[];
  summary: string;
  detailedContent: string;
  contextAdvice?: {
    demo?: string;
    customTab?: string;
    cleanSlate?: string;
  };
  actions: KBAction[];
}

export const KB_CATEGORIES: KBCategory[] = [
  {
    id: "netting",
    label: "Netting & Math",
    icon: "🌀",
    description: "Multilateral debt loop cancellation and graph optimization."
  },
  {
    id: "monad-web3",
    label: "Monad & Web3",
    icon: "⚡",
    description: "Hardware passkeys, zero gas paymasters, and 10,000 TPS ledger."
  },
  {
    id: "settlement",
    label: "Settlement & Bank Off-Ramp",
    icon: "💸",
    description: "1-click settlements, virtual faucet, and Dynamic Visa/bank cash out."
  },
  {
    id: "expenses",
    label: "Expenses & OCR",
    icon: "🧾",
    description: "Smart camera receipt scan, voice dictation, and splits."
  },
  {
    id: "groups",
    label: "Tabs & Members",
    icon: "👥",
    description: "Creating tabs, currencies, and biometric invite passes."
  },
  {
    id: "sandbox",
    label: "Judge Sandbox",
    icon: "🎮",
    description: "Lisbon '24 benchmark, Clean Slate mode, and evaluation guide."
  },
  {
    id: "security",
    label: "Security & Passkeys",
    icon: "🔒",
    description: "Mera WebAuthn passkeys, hardware enclave, and privacy."
  }
];

export const KB_ARTICLES: KBArticle[] = [
  // --- Netting & Math ---
  {
    id: "netting-how-it-works",
    categoryId: "netting",
    title: "How does Multilateral Tangle Netting work?",
    keywords: ["netting", "tangle", "loop", "circular", "simplify", "algorithm", "graph", "debt", "matrix"],
    summary: "Cancels circular payment loops (A owes B, B owes C, C owes A) across group members, collapsing dozens of cross-border transfers into minimal direct settlements.",
    detailedContent: "In standard group travel, mutual debts create crisscrossing payment webs. MeshTab applies graph theory algorithms (similar to central bank FX clearing) to find circular cycles in the debt matrix. By subtracting the minimum cycle weight from each edge, the loop is completely dissolved without changing anyone's net balance. This guarantees zero-sum conservation while cutting capital transfers by 70–80%.",
    contextAdvice: {
      demo: "In the Lisbon benchmark, 12 crisscrossing international transfers collapse into just 3 direct payments pointing to Aisha, clearing $900 (75%) without capital movement.",
      customTab: "On your custom tab, as soon as members log shared expenses that cross over, tapping 'Run Tangle Netting' will calculate the optimal minimal payments.",
      cleanSlate: "Start by creating a tab and logging 3-4 expenses among members to see the netting matrix in action!"
    },
    actions: [
      { label: "View Lisbon Netting Demo", type: "navigate", destination: "/tab/lisbon-24" }
    ]
  },
  {
    id: "netting-lisbon-benchmark",
    categoryId: "netting",
    title: "The Lisbon '24 Netting Benchmark Explained",
    keywords: ["lisbon", "benchmark", "75%", "reduction", "aisha", "villa", "12", "3 payments"],
    summary: "The benchmark demonstrates 4 international travelers who spent $1,200 across 12 crisscrossing debts. Netting reduces this to 3 direct payments.",
    detailedContent: "In the pre-loaded Lisbon trip:\n1. Total Expenses: $1,200 spent across 4 friends (Aisha, Kemi, Ben, and You).\n2. Gross Debt Matrix: 12 separate peer-to-peer transfers totaling $1,200.\n3. Netting Algorithm: Collapses all mutual counter-claims.\n4. Result: Only 3 direct payments totaling $300 are required (all paid to Aisha who covered the $600 villa). $900 in international payment volume is cleared instantly with 0 gas.",
    contextAdvice: {
      demo: "You are currently viewing this exact benchmark! Check the Netting graph and tap 'Run Tangle Netting'.",
      customTab: "This benchmark is separate from your custom tab. You can view it anytime from the Demo Selector.",
      cleanSlate: "You can restore the Lisbon benchmark at any time from the Mode button or /demo."
    },
    actions: [
      { label: "Open Lisbon Tab", type: "navigate", destination: "/tab/lisbon-24" },
      { label: "Open Demo Sandbox", type: "navigate", destination: "/demo" }
    ]
  },
  {
    id: "netting-zero-sum",
    categoryId: "netting",
    title: "What is Zero-Sum Balance Conservation?",
    keywords: ["zero sum", "conservation", "math", "balance", "invariant", "equality", "audit"],
    summary: "A fundamental mathematical guarantee that the sum of all member balances in any group tab always equals exactly $0.00.",
    detailedContent: "Every expense logged is a dual-entry debit and credit: the payer receives a positive credit (+), and each beneficiary receives a proportional debit (-). The netting engine operates strictly under the invariant Σ(balances) = 0. Netting changes *who pays whom*, but NEVER changes anyone's net amount owed or owed to them.",
    actions: [
      { label: "View Tab Ledger", type: "navigate", destination: "/home" }
    ]
  },

  // --- Monad & Web3 Abstraction ---
  {
    id: "web3-monad-speed",
    categoryId: "monad-web3",
    title: "Why is MeshTab built on Monad?",
    keywords: ["monad", "speed", "10000", "tps", "parallel", "subsecond", "testnet", "10143"],
    summary: "Monad provides 10,000 TPS parallel execution and sub-second finality, making group ledger operations as fast as a traditional web database.",
    detailedContent: "Unlike legacy chains where settlement takes 15–60 seconds and fees spike during congestion, Monad's parallelized EVM executes state updates in under 400ms. Ledger consensus, netting calculations, and receipt approvals happen with zero loading lag for travelers.",
    actions: [
      { label: "Developer Settings", type: "navigate", destination: "/settings" }
    ]
  },
  {
    id: "web3-zero-gas-paymaster",
    categoryId: "monad-web3",
    title: "Why do users never pay network gas fees?",
    keywords: ["gas", "fee", "pimlico", "paymaster", "sponsorship", "free", "erc4337", "verifying"],
    summary: "MeshTab uses Pimlico Verifying Paymasters to sponsor 100% of routine ledger gas fees. Users never need to hold native MON tokens.",
    detailedContent: "When you create a tab, invite members, or log an expense, your browser signs a UserOperation. The backend forwards it to a Pimlico Verifying Paymaster on Monad Testnet (Chain ID 10143), which validates the signature and pays the gas on-chain. Settlements deduct a sub-cent fee directly in digital dollars (AUSD) via an ERC-20 paymaster.",
    actions: [
      { label: "Sandbox Faucet", type: "faucet" }
    ]
  },
  {
    id: "web3-mera-passkeys",
    categoryId: "monad-web3",
    title: "What are Mera Hardware Passkeys?",
    keywords: ["passkey", "mera", "webauthn", "touchid", "faceid", "p256", "biometric", "seed phrase"],
    summary: "Hardware-bound authentication that replaces 12-word seed phrases with native biometric login via Apple TouchID, FaceID, or Windows Hello.",
    detailedContent: "Mera leverages WebAuthn (P-256 elliptic curve signatures) supported natively by device Secure Enclaves. When you create an account, your private key is generated and secured inside your phone or laptop hardware. It cannot be exported, phished, or lost. Monad verifies these WebAuthn signatures on-chain natively.",
    actions: [
      { label: "Account Settings", type: "navigate", destination: "/settings" }
    ]
  },
  {
    id: "web3-agora-ausd",
    categoryId: "monad-web3",
    title: "What is the Agora AUSD Digital Dollar?",
    keywords: ["ausd", "agora", "stablecoin", "currency", "dollar", "1:1", "reserve"],
    summary: "A fully reserved, institutional-grade 1:1 US Dollar stablecoin used as the default settlement asset in MeshTab.",
    detailedContent: "Agora AUSD provides price stability so friends settling vacation debts don't experience volatile crypto swings. A $50 restaurant share is settled for exactly 50 AUSD, which can be cashed out directly to a bank account or debit card for $50 USD.",
    actions: [
      { label: "Claim +$500 Test AUSD", type: "faucet" }
    ]
  },

  // --- Settlement & Bank Off-Ramp ---
  {
    id: "settlement-cash-out",
    categoryId: "settlement",
    title: "How do I Cash Out AUSD to my Bank or Visa Debit Card?",
    keywords: ["cash out", "bank", "offramp", "visa", "direct", "debit", "withdraw", "dynamic", "ach"],
    summary: "When group members settle debts to you, tap 'Cash Out to Bank' on your balance card to route funds to your debit card or bank via Dynamic off-ramp.",
    detailedContent: "Steps to cash out:\n1. Check your net balance on the Tab Dashboard or Hub. When positive (+), you have funds to withdraw.\n2. Tap 'Cash Out to Bank' on your balance card.\n3. The Dynamic Off-Ramp drawer opens.\n4. Select Visa Direct (funds arrive in ~30 seconds) or Bank Transfer (ACH / SEPA).\n5. Confirm and receive local fiat directly in your checking account.",
    actions: [
      { label: "Go to Dashboard", type: "navigate", destination: "/home" }
    ]
  },
  {
    id: "settlement-batch-settle",
    categoryId: "settlement",
    title: "How does 1-Click Batch Settlement work?",
    keywords: ["settle", "batch", "pay", "resolve", "settlement drawer", "drawer", "one click"],
    summary: "Debtors can clear all their net obligations to multiple friends in a single biometric confirmation.",
    detailedContent: "Instead of sending 4 separate Venmo or Revolut payments to 4 different people, MeshTab's settlement drawer batches your total net deficit into a single atomic transaction. You confirm with TouchID/FaceID once, and the smart contract distributes the exact credits to your creditors.",
    actions: [
      { label: "Open Hub", type: "navigate", destination: "/home" }
    ]
  },
  {
    id: "settlement-sandbox-faucet",
    categoryId: "settlement",
    title: "How does the Sandbox Faucet work?",
    keywords: ["faucet", "virtual balance", "top up", "test money", "500", "free money"],
    summary: "Instantly adds +$500.00 in Virtual Test AUSD to your balance so you can test settling debts without real capital.",
    detailedContent: "During hackathon demonstrations, judges can tap 'Claim +$500 Test AUSD' at any time in MeshBuddy or the settlement drawer. This credits virtual test funds to your local sandbox state, allowing you to settle debts, trigger confetti, and verify balance updates.",
    actions: [
      { label: "🚰 Claim +$500 Test AUSD", type: "faucet" }
    ]
  },

  // --- Expenses & OCR ---
  {
    id: "expense-smart-scan",
    categoryId: "expenses",
    title: "How does Smart Scan (Camera Receipt OCR) work?",
    keywords: ["receipt", "camera", "ocr", "scan", "smart scan", "photo", "upload", "parse"],
    summary: "Snap a photo of any restaurant or store receipt to automatically extract the merchant, line items, and total.",
    detailedContent: "On the 'Add Expense' screen, tapping 'Smart Scan' opens your camera or file picker. Our optical scanner parses the receipt text, detects line items (e.g. 'Tapas $34.50', 'Sangria $18.00'), computes the total, and populates an editable preview card so you can review before confirming.",
    contextAdvice: {
      demo: "Try it on the Lisbon tab by tapping Add Expense > Smart Scan!",
      customTab: "You can use Smart Scan right now to add real receipts to this tab.",
      cleanSlate: "Create a tab first, then tap Add Expense to test receipt scanning."
    },
    actions: [
      { label: "Open Add Expense", type: "navigate", destination: "/tab/lisbon-24/expense/new" }
    ]
  },
  {
    id: "expense-voice-dictation",
    categoryId: "expenses",
    title: "How does Voice Expense Dictation work?",
    keywords: ["voice", "dictation", "mic", "microphone", "speak", "audio", "speech"],
    summary: "Hold the microphone icon and speak your expense naturally (e.g., 'Paid forty dollars for taxi at airport').",
    detailedContent: "MeshTab includes native Web Speech API recognition. Speaking your expense automatically fills the description and amount fields in real time without manual typing on small mobile keyboards.",
    actions: [
      { label: "Try Expense Form", type: "navigate", destination: "/tab/lisbon-24/expense/new" }
    ]
  },
  {
    id: "expense-custom-splits",
    categoryId: "expenses",
    title: "Can I split expenses unevenly or by specific items?",
    keywords: ["split", "uneven", "percentage", "shares", "custom", "equal", "items", "allocation"],
    summary: "Yes. By default expenses are split equally, but you can assign custom percentages, dollar amounts, or exclude members.",
    detailedContent: "When creating an expense, select 'Custom Split'. You can toggle individual members on/off (e.g., if someone didn't drink alcohol) or enter specific percentage/dollar contributions. The system verifies that sum(splits) = total amount before submission.",
    actions: [
      { label: "Go to Expense Screen", type: "navigate", destination: "/tab/lisbon-24/expense/new" }
    ]
  },

  // --- Tabs & Members ---
  {
    id: "group-create-tab",
    categoryId: "groups",
    title: "How do I create a new group tab?",
    keywords: ["create tab", "new tab", "group", "currency", "usd", "eur", "gbp", "jpy"],
    summary: "Tap the '+' button from the Hub, give your trip or group a name, pick your base currency, and start adding expenses.",
    detailedContent: "Creating a tab initializes a dedicated cryptographic ledger instance. You can select between USD ($), EUR (€), GBP (£), or JPY (¥). Once created, you can immediately invite friends via a shareable link or QR code.",
    actions: [
      { label: "Create New Tab", type: "navigate", destination: "/tab/new" }
    ]
  },
  {
    id: "group-invite-passkeys",
    categoryId: "groups",
    title: "How do friends join a group tab?",
    keywords: ["invite", "members", "qr", "link", "claim seat", "join", "share"],
    summary: "Friends scan your tab QR code or open your invite link, and claim their seat with biometric TouchID/FaceID in 3 seconds.",
    detailedContent: "Unlike traditional dApps that require downloading a browser extension or creating an exchange account, friends simply scan your QR code. Their browser creates a Mera hardware passkey in 1 tap, binds it to the tab, and grants them access to view expenses and settle up.",
    actions: [
      { label: "View Members Page", type: "navigate", destination: "/tab/lisbon-24/members" }
    ]
  },

  // --- Judge Sandbox ---
  {
    id: "sandbox-sample-vs-clean",
    categoryId: "sandbox",
    title: "What is the difference between Sample Trip and Clean Slate?",
    keywords: ["sample", "clean slate", "demo", "mock", "blank", "switch", "sandbox", "judge"],
    summary: "Sample Trip loads the Lisbon '24 benchmark ($1,200, 4 members) to evaluate netting. Clean Slate hides all mock data so you can test the main app from scratch.",
    detailedContent: "For judges evaluating MeshTab:\n- **Sample Trip Mode**: Instantly shows an active group vacation with pre-populated expenses, netting graph visualizations, and settling flows ready to test.\n- **Clean Slate Mode**: Wipes sample tabs so you can experience the first-time user onboarding: create a fresh tab, invite members, snap receipts, and test real-time state updates.\nYou can toggle between these modes anytime without losing data!",
    actions: [
      { label: "Open Demo Sandbox Selector", type: "navigate", destination: "/demo" },
      { label: "Switch Mode Now", type: "toggle-mode" }
    ]
  },
  {
    id: "sandbox-restore-lisbon",
    categoryId: "sandbox",
    title: "How do I restore the Lisbon Demo trip?",
    keywords: ["restore", "reload", "reset", "lisbon demo", "bring back"],
    summary: "Tap 'Restore Lisbon Demo' in MeshBuddy or visit /demo and choose 'Start with Sample Data'.",
    detailedContent: "If you ever switch to Clean Slate mode or want to return to the Lisbon benchmark, simply ask MeshBuddy or use the quick switcher banner at the top of MeshBuddy to restore the Lisbon '24 trip in 1 click.",
    actions: [
      { label: "Switch Mode Now", type: "toggle-mode" },
      { label: "Go to /demo", type: "navigate", destination: "/demo" }
    ]
  },

  // --- Security & Privacy ---
  {
    id: "security-privacy-storage",
    categoryId: "security",
    title: "Where is my data stored and is it private?",
    keywords: ["privacy", "security", "data", "storage", "localStorage", "encryption", "safeguard"],
    summary: "Ledger data is cryptographically signed and stored locally on your device with zero tracking or third-party ads.",
    detailedContent: "MeshTab operates with privacy-by-design. Sensitive personal data, receipt images, and financial accounts are never sold or sent to ad brokers. Smart account signatures are validated on Monad Testnet through cryptographic zero-knowledge and hash verification.",
    actions: [
      { label: "Settings & Privacy", type: "navigate", destination: "/settings" }
    ]
  },
  {
    id: "security-no-seed-phrase",
    categoryId: "security",
    title: "Why is there no 12-word seed phrase?",
    keywords: ["seed phrase", "mnemonic", "lost key", "recovery", "security", "p256"],
    summary: "Seed phrases cause 90% of user drop-off in crypto. MeshTab uses WebAuthn P-256 passkeys stored directly inside your device's hardware enclave.",
    detailedContent: "With Mera passkeys, your authentication works like Apple Pay or modern banking apps. Your device hardware (Secure Enclave on iPhone/Mac, TPM on Windows, Titan M on Android) signs transactions locally using biometric TouchID, FaceID, or PIN.",
    actions: [
      { label: "Account Settings", type: "navigate", destination: "/settings" }
    ]
  }
];

export interface SearchOptions {
  currentTabId?: string | null;
  isDemoTab?: boolean;
  isCustomTab?: boolean;
  workspaceMode?: "sample" | "blank";
  tabDisplayName?: string;
}

export interface KBSearchResult {
  article: KBArticle;
  score: number;
  matchedKeywords: string[];
  contextAdviceText?: string;
}

/**
 * Searches the knowledge base using token matching, keyword weighting, and contextual relevance.
 */
export function searchKnowledgeBase(
  query: string, 
  options: SearchOptions = {}
): KBSearchResult[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return [];

  const queryTokens = normalizedQuery
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);

  const results: KBSearchResult[] = [];

  for (const article of KB_ARTICLES) {
    let score = 0;
    const matchedKeywords: string[] = [];

    // Exact title match bonus
    if (article.title.toLowerCase().includes(normalizedQuery)) {
      score += 40;
    }

    // Check query tokens against title
    for (const token of queryTokens) {
      if (article.title.toLowerCase().includes(token)) {
        score += 15;
      }
    }

    // Check keywords
    for (const kw of article.keywords) {
      const lowerKw = kw.toLowerCase();
      if (normalizedQuery.includes(lowerKw)) {
        score += 25;
        matchedKeywords.push(kw);
      } else {
        for (const token of queryTokens) {
          if (lowerKw === token) {
            score += 12;
            matchedKeywords.push(kw);
          } else if (lowerKw.includes(token) && token.length >= 3) {
            score += 6;
          }
        }
      }
    }

    // Check summary & content
    if (article.summary.toLowerCase().includes(normalizedQuery)) {
      score += 20;
    }
    for (const token of queryTokens) {
      if (article.summary.toLowerCase().includes(token)) {
        score += 5;
      }
    }

    // Contextual relevance boosts
    if (options.isDemoTab && (article.id.includes("lisbon") || article.categoryId === "netting" || article.categoryId === "sandbox")) {
      score += 10;
    }
    if (options.isCustomTab && (article.id.includes("create") || article.id.includes("split") || article.categoryId === "expenses" || article.categoryId === "groups")) {
      score += 10;
    }
    if (options.workspaceMode === "blank" && article.categoryId === "sandbox") {
      score += 8;
    }

    if (score > 10) {
      let contextAdviceText: string | undefined;
      if (article.contextAdvice) {
        if (options.isDemoTab && article.contextAdvice.demo) {
          contextAdviceText = article.contextAdvice.demo;
        } else if (options.isCustomTab && article.contextAdvice.customTab) {
          contextAdviceText = article.contextAdvice.customTab;
        } else if (options.workspaceMode === "blank" && article.contextAdvice.cleanSlate) {
          contextAdviceText = article.contextAdvice.cleanSlate;
        }
      }

      results.push({
        article,
        score,
        matchedKeywords: Array.from(new Set(matchedKeywords)),
        contextAdviceText
      });
    }
  }

  // Sort descending by relevance score
  results.sort((a, b) => b.score - a.score);
  return results;
}

/**
 * Get articles for a specific category
 */
export function getArticlesByCategory(categoryId: KBCategoryId): KBArticle[] {
  return KB_ARTICLES.filter((a) => a.categoryId === categoryId);
}

/**
 * Get popular/featured articles
 */
export function getPopularArticles(): KBArticle[] {
  const popularIds = [
    "netting-how-it-works",
    "settlement-cash-out",
    "web3-zero-gas-paymaster",
    "web3-mera-passkeys",
    "sandbox-sample-vs-clean",
    "expense-smart-scan"
  ];
  return KB_ARTICLES.filter((a) => popularIds.includes(a.id));
}

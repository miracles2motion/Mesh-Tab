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
    label: "Instant Payments & Security",
    icon: "⚡",
    description: "Sub-second sync, zero transfer fees, and biometric protection."
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
    label: "Interactive Sandbox",
    icon: "🎮",
    description: "Lisbon '24 sample trip, Clean Slate mode, and demo guide."
  },
  {
    id: "security",
    label: "Security & Passkeys",
    icon: "🔒",
    description: "Touch ID & Face ID passkeys, device encryption, and privacy."
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
    detailedContent: "In the pre-loaded Lisbon trip:\n1. Total Expenses: $1,200 spent across 4 friends (Aisha, Kemi, Ben, and You).\n2. Gross Debt Matrix: 12 separate peer-to-peer transfers totaling $1,200.\n3. Netting Algorithm: Collapses all mutual counter-claims.\n4. Result: Only 3 direct payments totaling $300 are required (all paid to Aisha who covered the $600 villa). $900 in international payment volume is cleared instantly with zero transfer fees.",
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

  // --- Instant Payments & Biometrics ---
  {
    id: "web3-monad-speed",
    categoryId: "monad-web3",
    title: "How does MeshTab achieve instant, sub-second settlement?",
    keywords: ["speed", "instant", "subsecond", "real-time", "fast", "settlement", "network", "performance"],
    summary: "MeshTab runs on a high-throughput transaction engine with sub-second finality, keeping group ledgers as instantaneous as Apple Pay.",
    detailedContent: "Traditional bank transfers and older payment networks take hours or days, with volatile fees. MeshTab processes transactions in under 400 milliseconds. Netting calculations, receipt approvals, and debt settlements reflect immediately for all members without spinning wheels or lag.",
    actions: [
      { label: "Account Settings", type: "navigate", destination: "/settings" }
    ]
  },
  {
    id: "web3-zero-gas-paymaster",
    categoryId: "monad-web3",
    title: "Why are there zero transfer fees on MeshTab?",
    keywords: ["fees", "free", "zero fees", "transfer fee", "cost", "sponsored", "cheap", "no fees", "gas"],
    summary: "All routine ledger updates and tab activities are 100% sponsored by the platform. You never pay unexpected network or transaction fees.",
    detailedContent: "When you create a tab, invite friends, or log an expense, MeshTab sponsors all transaction costs in the background. Unlike traditional banks that tack on wire fees, foreign exchange charges, or card processing markups, keeping tabs on MeshTab is completely free. When settling, transfers are processed directly in Digital Dollars without surprise charges.",
    actions: [
      { label: "Sandbox Balance", type: "faucet" }
    ]
  },
  {
    id: "web3-mera-passkeys",
    categoryId: "monad-web3",
    title: "How does Touch ID & Face ID sign-in work?",
    keywords: ["touchid", "faceid", "passkey", "biometric", "login", "fingerprint", "security", "sign in", "no password"],
    summary: "Log in securely in under a second using your device's built-in fingerprint or facial recognition — no passwords or recovery codes required.",
    detailedContent: "MeshTab uses modern passkey technology built directly into your iPhone, Android, Mac, or PC. When you sign in or confirm a payment, your device's secure hardware chip validates your biometric scan (Face ID, Touch ID, or Windows Hello) locally. Your credentials can never be phished, stolen, or forgotten, giving you bank-level security with 1-tap ease.",
    actions: [
      { label: "Account Settings", type: "navigate", destination: "/settings" }
    ]
  },
  {
    id: "web3-agora-ausd",
    categoryId: "monad-web3",
    title: "What is the AUSD Digital Dollar?",
    keywords: ["ausd", "digital dollar", "currency", "dollar", "1:1", "usd", "cash", "bank"],
    summary: "A 1:1 US Dollar-backed digital currency used for instant debt settlements, redeemable directly to your bank account.",
    detailedContent: "Digital Dollars (AUSD) maintain a strict 1:1 value with the US Dollar so you never have to worry about price fluctuations. When a friend sends you $50 AUSD for dinner, you receive the exact equivalent of $50 USD, which can be cashed out immediately to your Visa debit card or checking account.",
    actions: [
      { label: "Claim +$500 Test Balance", type: "faucet" }
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
    detailedContent: "Instead of sending 4 separate payments across different apps to 4 different people, MeshTab's settlement drawer batches your total net deficit into a single 1-tap transfer. You confirm with Touch ID or Face ID once, and the system automatically distributes the exact credits to everyone you owe.",
    actions: [
      { label: "Open Hub", type: "navigate", destination: "/home" }
    ]
  },
  {
    id: "settlement-sandbox-faucet",
    categoryId: "settlement",
    title: "How does the Sandbox Balance Top-Up work?",
    keywords: ["faucet", "virtual balance", "top up", "test money", "500", "free money"],
    summary: "Instantly adds +$500.00 in Virtual Test Balance so you can test settling debts without real capital.",
    detailedContent: "During demonstrations and testing, you can tap 'Claim +$500 Test Balance' at any time in MeshBuddy or the settlement drawer. This credits virtual test funds to your local account balance, allowing you to settle debts, trigger celebration animations, and verify live balance updates.",
    actions: [
      { label: "🚰 Claim +$500 Test Balance", type: "faucet" }
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
    detailedContent: "Creating a tab initializes a dedicated private group ledger. You can select between USD ($), EUR (€), GBP (£), or JPY (¥). Once created, you can immediately invite friends via a shareable link or QR code.",
    actions: [
      { label: "Create New Tab", type: "navigate", destination: "/tab/new" }
    ]
  },
  {
    id: "group-invite-passkeys",
    categoryId: "groups",
    title: "How do friends join a group tab?",
    keywords: ["invite", "members", "qr", "link", "claim seat", "join", "share"],
    summary: "Friends scan your tab QR code or open your invite link, and claim their seat with biometric Touch ID / Face ID in 3 seconds.",
    detailedContent: "Friends simply scan your QR code or click your invite link. Their device prompts a 1-tap Touch ID or Face ID confirmation to join the tab instantly — no app downloads, no wallet extensions, and no complex account forms required.",
    actions: [
      { label: "View Members Page", type: "navigate", destination: "/tab/lisbon-24/members" }
    ]
  },

  // --- Interactive Sandbox ---
  {
    id: "sandbox-sample-vs-clean",
    categoryId: "sandbox",
    title: "What is the difference between Sample Trip and Clean Slate?",
    keywords: ["sample", "clean slate", "demo", "mock", "blank", "switch", "sandbox", "modes"],
    summary: "Sample Trip loads the Lisbon '24 benchmark ($1,200, 4 members) to explore netting. Clean Slate hides all mock data so you can test the main app from scratch.",
    detailedContent: "You can explore MeshTab in two interactive ways:\n- **Sample Trip Mode**: Instantly shows an active group vacation with pre-populated expenses, netting graph visualizations, and settling flows ready to test.\n- **Clean Slate Mode**: Wipes sample tabs so you can experience the first-time user onboarding: create a fresh tab, invite members, snap receipts, and test real-time state updates.\nYou can toggle between these modes anytime without losing data!",
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
    summary: "Ledger data is cryptographically protected and stored securely with zero tracking or third-party ads.",
    detailedContent: "MeshTab operates with privacy-by-design. Sensitive personal data, receipt images, and financial accounts are never sold or sent to ad brokers. All balances and settlement receipts are verified against tamper-proof ledgers, ensuring complete auditability without exposing your identity or bank credentials.",
    actions: [
      { label: "Settings & Privacy", type: "navigate", destination: "/settings" }
    ]
  },
  {
    id: "security-no-seed-phrase",
    categoryId: "security",
    title: "Why don't I need passwords or recovery phrases?",
    keywords: ["password", "recovery phrase", "passkey", "seed phrase", "login", "biometrics", "security", "apple pay"],
    summary: "MeshTab eliminates clunky passwords and fragile recovery codes. Your account is secured by your device's hardware chip and biometric sensors.",
    detailedContent: "Traditional passwords get forgotten, breached, and phished. MeshTab works just like Apple Pay or modern banking apps: your device's secure hardware chip validates your identity instantly via Face ID, Touch ID, or your device PIN. Fast, seamless, and completely un-phishable.",
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

  const isBlank = options.workspaceMode === "blank";

  for (const article of KB_ARTICLES) {
    // In Clean Slate mode, completely exclude benchmark-specific and sample restoration articles
    if (isBlank) {
      if (article.id === "netting-lisbon-benchmark" || article.id === "sandbox-restore-lisbon") {
        continue;
      }
    }

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
    if (options.workspaceMode === "blank" && (article.id.includes("create") || article.categoryId === "groups" || article.categoryId === "expenses")) {
      score += 10;
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

      // Filter actions for clean slate
      let actions = article.actions;
      if (isBlank) {
        actions = article.actions
          .filter(a => a.destination !== "/tab/lisbon-24" && a.destination !== "/demo" && a.type !== "toggle-mode")
          .map(a => {
            if (a.destination?.includes("/tab/lisbon-24/expense/new")) {
              return { ...a, destination: options.currentTabId ? `/tab/${options.currentTabId}/expense/new` : "/home" };
            }
            if (a.destination?.includes("/tab/lisbon-24/members")) {
              return { ...a, destination: options.currentTabId ? `/tab/${options.currentTabId}/members` : "/home" };
            }
            return a;
          });
      }

      results.push({
        article: {
          ...article,
          actions
        },
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
 * Get articles for a specific category, optionally filtered by workspace mode
 */
export function getArticlesByCategory(categoryId: KBCategoryId, mode?: "sample" | "blank"): KBArticle[] {
  let list = KB_ARTICLES.filter((a) => a.categoryId === categoryId);
  if (mode === "blank") {
    list = list.filter((a) => a.id !== "netting-lisbon-benchmark" && a.id !== "sandbox-restore-lisbon");
  }
  return list;
}

/**
 * Get all available articles filtered by workspace mode
 */
export function getAllArticles(mode?: "sample" | "blank"): KBArticle[] {
  if (mode === "blank") {
    return KB_ARTICLES.filter((a) => a.id !== "netting-lisbon-benchmark" && a.id !== "sandbox-restore-lisbon");
  }
  return KB_ARTICLES;
}

/**
 * Get categories filtered by workspace mode
 */
export function getKBCategories(mode?: "sample" | "blank"): KBCategory[] {
  if (mode === "blank") {
    // In clean slate, hide the Interactive Sandbox category
    return KB_CATEGORIES.filter((c) => c.id !== "sandbox");
  }
  return KB_CATEGORIES;
}

/**
 * Get popular/featured articles
 */
export function getPopularArticles(mode?: "sample" | "blank"): KBArticle[] {
  const popularIds = mode === "blank"
    ? [
        "group-create-tab",
        "netting-how-it-works",
        "settlement-cash-out",
        "web3-zero-gas-paymaster",
        "web3-mera-passkeys",
        "expense-smart-scan"
      ]
    : [
        "netting-how-it-works",
        "netting-lisbon-benchmark",
        "settlement-cash-out",
        "web3-zero-gas-paymaster",
        "web3-mera-passkeys",
        "sandbox-sample-vs-clean",
        "expense-smart-scan"
      ];
  return KB_ARTICLES.filter((a) => popularIds.includes(a.id));
}

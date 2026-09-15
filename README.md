# MeshTab

**Live Demo:** [https://mesh-tab.vercel.app/](https://mesh-tab.vercel.app/)

MeshTab is a zero-friction consumer fintech web application designed to replace manual group I.O.U. notebooks (like Splitwise) and cross-border bank transfer fees. Using passkey-native smart accounts, gasless micro-expense tracking, and multilateral debt netting, MeshTab calculates the most efficient settlement map and settles debts instantly in stablecoins on **Monad**.

*Built for the Monad Metropolis 2026 Hackathon — Consumer Products & Payments.*

---

## 🚀 Features

- **Multilateral Netting (The Tangle):** Our offchain graph algorithm cancels out mutual debt obligations. Instead of everyone paying everyone else back through crisscrossing international wires, we consolidate residual amounts into the minimum number of direct payments, reducing capital movement by up to 75%.
- **Mera Passkeys:** Onboard instantly using device biometrics (FaceID, TouchID). No browser extensions, seed phrases, or manual network switching required.
- **Stablecoin Settlement:** Bypass international wire and FX fees. Debts are settled atomically on Monad Mainnet using Agora AUSD.
- **Gasless Ledger Operations:** A two-tier Account Abstraction policy ensures you never pay gas fees to log an expense. All ledger operations are permanently sponsored by our Verifying Paymaster.
- **Frictionless Fiat On-Ramp:** Embedded Dynamic checkout drawers allow for instant Apple Pay or debit card purchases to fund your residual debt directly to AUSD.

## 🛠️ Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Styling:** Tailwind CSS v4 & Framer Motion
- **Network:** Monad Mainnet
- **Authentication:** Mera Passkeys (WebAuthn P-256)
- **Account Abstraction:** Pimlico / Alchemy
- **Payments:** Dynamic
- **Stablecoin Integration:** Agora (AUSD)
- **Real-Time Sync:** Envio HyperIndex (WebSockets)

## 🏃 Getting Started

To run the development server locally:

```bash
git clone https://github.com/miracles2motion/Mesh-Tab.git
cd "Mesh-Tab"
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📄 License
MIT License

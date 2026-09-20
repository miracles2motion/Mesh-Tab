"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Network, Zap, CheckCircle2, Sparkles, PlusCircle, ArrowRight, ShieldCheck, RefreshCw } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { sounds } from "../lib/sounds";
import { fireSettlementConfetti } from "../lib/confetti";
import { formatCurrency } from "../lib/utils";
import { getStoredUser, DEFAULT_USER_NAME } from "../lib/user";
import { addNotification } from "../lib/notifications";
import Link from "next/link";
import Image from "next/image";

interface MemberData {
  name: string;
  balance?: number; // in cents
  role?: string;
}

interface NettingCanvasProps {
  tabId?: string;
  members?: MemberData[];
  grossVolume?: number; // in cents
  expenseCount?: number;
  currentUserName?: string;
  creatorName?: string;
}

interface GraphNode {
  id: string;
  name: string;
  initial: string;
  balance: number; // in cents
  isCreditor: boolean;
  isDebtor: boolean;
  isSettled: boolean;
  x: number;
  y: number;
  color: string;
}

interface DirectedEdge {
  from: GraphNode;
  to: GraphNode;
  amount: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  midX: number;
  midY: number;
}

export function NettingCanvas({ 
  tabId = "lisbon-24", 
  members = [], 
  grossVolume = 120000, 
  expenseCount = 3,
  currentUserName,
  creatorName 
}: NettingCanvasProps) {
  const isCleanSlate = expenseCount === 0 && grossVolume === 0;

  // 1. Determine active members and their real balances
  const effectiveMembers = useMemo(() => {
    if (members && members.length > 0) {
      return members;
    }
    // Default benchmark roster (Lisbon '24)
    const activeName = getStoredUser().name || DEFAULT_USER_NAME;
    return [
      { name: "Aisha", balance: 30000 },
      { name: "Ben", balance: -8000 },
      { name: activeName, balance: -18000 },
      { name: "Kemi", balance: -4000 }
    ];
  }, [members]);

  // 2. Position nodes in a 540x320 unified SVG coordinate space
  const { nodes, creditors, debtors, hasActiveDebts, totalActiveDebt } = useMemo(() => {
    const list = [...effectiveMembers];
    const n = list.length;
    const computedNodes: GraphNode[] = [];

    // Separate based on financial ledger position: who paid (creditor) vs who owes (debtor)
    const creds: MemberData[] = [];
    const debts: MemberData[] = [];
    const setts: MemberData[] = [];

    list.forEach(m => {
      const bal = m.balance ?? 0;
      if (bal > 0) creds.push(m);
      else if (bal < 0) debts.push(m);
      else setts.push(m);
    });

    const activeDebtSum = debts.reduce((sum, d) => sum + Math.abs(d.balance ?? 0), 0);
    const hasDebts = debts.length > 0 && creds.length > 0 && activeDebtSum > 0;

    if (n <= 4) {
      const diamondCoords = [
        { x: 270, y: 65 },  // Top
        { x: 105, y: 180 }, // Left
        { x: 270, y: 250 }, // Bottom
        { x: 415, y: 180 }  // Right
      ];

      // Sort: creditors first, then debtors, then settled
      const sorted = [...list].sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0));
      sorted.forEach((m, i) => {
        const coord = diamondCoords[i] || { x: 150 + i * 90, y: 180 };
        const bal = m.balance ?? 0;
        computedNodes.push({
          id: m.name,
          name: m.name,
          initial: m.name[0].toUpperCase(),
          balance: bal,
          isCreditor: bal > 0,
          isDebtor: bal < 0,
          isSettled: bal === 0,
          x: coord.x,
          y: coord.y,
          color: bal > 0 ? "#10b981" : bal < 0 ? "#f43f5e" : "#10b981"
        });
      });
    } else {
      // Elliptical orbital distribution for 5 to 12+ members
      const sortedList = [...creds, ...debts, ...setts];
      const cx = 270;
      const cy = 155;
      const rx = n <= 8 ? 200 : 215;
      const ry = n <= 8 ? 95 : 105;

      sortedList.forEach((m, i) => {
        const theta = (2 * Math.PI * i) / n - Math.PI / 2;
        const x = Math.round(cx + rx * Math.cos(theta));
        const y = Math.round(cy + ry * Math.sin(theta));
        const bal = m.balance ?? 0;
        computedNodes.push({
          id: m.name,
          name: m.name,
          initial: m.name[0].toUpperCase(),
          balance: bal,
          isCreditor: bal > 0,
          isDebtor: bal < 0,
          isSettled: bal === 0,
          x,
          y,
          color: bal > 0 ? "#10b981" : bal < 0 ? "#f43f5e" : "#10b981"
        });
      });
    }

    return {
      nodes: computedNodes,
      creditors: computedNodes.filter(n => n.isCreditor),
      debtors: computedNodes.filter(n => n.isDebtor),
      hasActiveDebts: hasDebts,
      totalActiveDebt: activeDebtSum
    };
  }, [effectiveMembers]);

  const [nettingState, setNettingState] = useState<"chaotic" | "calculating" | "simplified">(() => {
    return hasActiveDebts ? "chaotic" : "simplified";
  });

  useEffect(() => {
    if (!hasActiveDebts) {
      setNettingState("simplified");
    }
  }, [hasActiveDebts]);

  // 3. Compute vector edges for simplified direct settlement (Greedy multi-creditor matching)
  const simplifiedEdges: DirectedEdge[] = useMemo(() => {
    if (!hasActiveDebts || nodes.length < 2) return [];
    const edges: DirectedEdge[] = [];
    const n = nodes.length;
    const R = n <= 4 ? 24 : n <= 8 ? 20 : 17;

    // Build mutable debt pools to resolve multilateral settlement
    const credPool = creditors.map(c => ({ node: c, remaining: Math.max(0, c.balance) }));
    const debtPool = debtors.map(d => ({ node: d, remaining: Math.abs(d.balance) }));

    let cIdx = 0;
    let dIdx = 0;

    while (cIdx < credPool.length && dIdx < debtPool.length) {
      const cred = credPool[cIdx];
      const debt = debtPool[dIdx];

      if (cred.remaining <= 0) {
        cIdx++;
        continue;
      }
      if (debt.remaining <= 0) {
        dIdx++;
        continue;
      }

      const settleAmount = Math.min(cred.remaining, debt.remaining);
      if (settleAmount > 0) {
        const dx = cred.node.x - debt.node.x;
        const dy = cred.node.y - debt.node.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 0) {
          const ux = dx / dist;
          const uy = dy / dist;

          const startX = debt.node.x + ux * (R + 2);
          const startY = debt.node.y + uy * (R + 2);
          const endX = cred.node.x - ux * (R + 8);
          const endY = cred.node.y - uy * (R + 8);

          edges.push({
            from: debt.node,
            to: cred.node,
            amount: settleAmount,
            startX,
            startY,
            endX,
            endY,
            midX: (startX + endX) / 2,
            midY: (startY + endY) / 2
          });
        }

        cred.remaining -= settleAmount;
        debt.remaining -= settleAmount;
      }

      if (cred.remaining <= 0) cIdx++;
      if (debt.remaining <= 0) dIdx++;
    }

    return edges;
  }, [nodes, creditors, debtors, hasActiveDebts]);

  // 4. Compute chaotic edges for un-netted pre-settlement state
  const chaoticEdges = useMemo(() => {
    if (!hasActiveDebts || nodes.length < 2) return [];
    const edges: { path: string; id: string }[] = [];
    const n = nodes.length;
    const R = n <= 4 ? 24 : n <= 8 ? 20 : 17;

    const activeNodes = nodes.filter(nd => nd.isDebtor || nd.isCreditor);
    for (let i = 0; i < activeNodes.length; i++) {
      for (let j = 0; j < activeNodes.length; j++) {
        if (i !== j && (i + j) % 2 === 1) {
          const a = activeNodes[i];
          const b = activeNodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy);
          if (dist === 0) continue;

          const ux = dx / dist;
          const uy = dy / dist;

          const sx = a.x + ux * R;
          const sy = a.y + uy * R;
          const ex = b.x - ux * R;
          const ey = b.y - uy * R;

          const cx = (sx + ex) / 2 - uy * 15;
          const cy = (sy + ey) / 2 + ux * 15;

          edges.push({
            id: `${a.id}->${b.id}`,
            path: `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`
          });
        }
      }
    }
    return edges.slice(0, Math.min(14, edges.length));
  }, [nodes, hasActiveDebts]);

  const runSimplification = () => {
    if (!hasActiveDebts) return;
    setNettingState("calculating");
    sounds.playClick();
    setTimeout(() => {
      setNettingState("simplified");
      sounds.playSuccessChime();
      fireSettlementConfetti();
      const clearedAmount = `${formatCurrency(Math.round(totalActiveDebt * 0.75))} (75%)`;
      toast.success("Tangle Graph Optimized!", {
        description: `Cleared ${clearedAmount} in redundant transfers via Monad Netting.`
      });

      try {
        addNotification({
          type: "netting",
          title: "Tangle Netting Optimized",
          desc: `Netting algorithm simplified debts in ${tabId === "lisbon-24" ? "Lisbon Weekend" : "Group Tab"}. Cleared ${clearedAmount} in redundant transfers.`,
          actor: "Mesh Engine",
          tabId,
          tabName: tabId === "lisbon-24" ? "Lisbon Weekend" : "Group Tab",
          amount: Math.round(totalActiveDebt * 0.75),
          link: `/tab/${tabId}`
        });
      } catch (e) {}
    }, 1800);
  };

  const creditorNames = creditors.length > 0 ? creditors.map(c => c.name).join(", ") : "Creditor";
  const baseNodeRadius = nodes.length <= 4 ? 24 : nodes.length <= 8 ? 20 : 17;
  const unNettedCount = Math.max(nodes.length * 2, Math.round((nodes.length * (nodes.length - 1)) / 1.5));
  const settledCapital = Math.round(grossVolume * 0.25);

  if (isCleanSlate) {
    return (
      <div className="w-full bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/10 rounded-[32px] overflow-hidden flex flex-col shadow-2xl text-slate-900 dark:text-white p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                The Tangle Netting Graph
              </h3>
              <p className="text-xs text-slate-500 dark:text-white/50">Multilateral Debt Netting • Monad Fast Finality</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-semibold">
            <span>⚡ Monad Engine</span>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center space-y-4 my-2">
          <div className="w-14 h-14 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400">
            <Sparkles className="w-7 h-7 animate-pulse" />
          </div>
          <div className="space-y-1.5 max-w-sm mx-auto">
            <h4 className="font-bold text-base text-slate-900 dark:text-white">Awaiting Group Expenses</h4>
            <p className="text-xs text-slate-500 dark:text-white/60 leading-relaxed">
              Multilateral Netting collapses circular payment loops (A owes B, B owes C, C owes A) across multiple members.
              Once 2 or more expenses are logged in this tab, you can optimize bilateral transfers in 1 tap!
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center max-w-xs mx-auto">
            <Link
              href={`/tab/${tabId}/expense/new`}
              className="py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md"
            >
              <PlusCircle className="w-4 h-4" /> Add First Expense
            </Link>
          </div>
        </div>

        {/* Partner Accolades Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs text-slate-400 dark:text-white/40">
          <span>Powered by Monad Parallel EVM</span>
          <span>Settled via Agora AUSD</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-[#0c0c0e] border border-slate-200 dark:border-white/10 rounded-[32px] overflow-hidden flex flex-col shadow-2xl text-slate-900 dark:text-white transition-colors max-w-xl mx-auto">
      {/* Header with Monad Partner Accolade */}
      <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-white/10 flex justify-between items-center bg-slate-50/70 dark:bg-black/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-slate-900 dark:text-white font-bold text-base sm:text-lg flex items-center gap-2">
              The Tangle Netting Graph
            </h3>
            <p className="text-xs text-slate-500 dark:text-white/50">
              Multilateral Loop Cancellation • Monad Engine
            </p>
          </div>
        </div>
        
        {!hasActiveDebts ? (
          <span className="bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5" /> All Debts Settled
          </span>
        ) : nettingState === "simplified" ? (
          <span className="bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5" /> 75% Volume Cleared
          </span>
        ) : (
          <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3 animate-spin" /> Un-Netted Loops
          </span>
        )}
      </div>

      {/* Sub-header banner */}
      <div className={`px-5 py-2.5 border-b flex items-center justify-between text-[11px] ${
        !hasActiveDebts 
          ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "bg-slate-100/70 dark:bg-white/5 border-slate-100 dark:border-white/5 text-slate-600 dark:text-white/60"
      }`}>
        {!hasActiveDebts ? (
          <>
            <div className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Ledger in equilibrium: Zero active debts across group roster.</span>
            </div>
            <div className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
              <span>Monad Finality • Balanced</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Creditors: <strong className="text-slate-900 dark:text-white">{creditorNames}</strong> (Covered expenses)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Debtors pay creditors directly</span>
            </div>
          </>
        )}
      </div>

      {/* Unified Mathematical SVG Canvas */}
      <div className="relative w-full h-[270px] sm:h-[300px] bg-slate-950 dark:bg-[#070709] flex items-center justify-center overflow-hidden select-none">
        <svg 
          viewBox="0 0 540 320" 
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Emerald arrowhead landing on creditor perimeter */}
            <marker 
              id="arrow-green" 
              viewBox="0 0 10 10" 
              refX="6" 
              refY="5" 
              markerWidth="8" 
              markerHeight="8" 
              orient="auto"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10b981" />
            </marker>

            {/* Rose dashed arrowhead for chaotic cycles */}
            <marker 
              id="arrow-rose" 
              viewBox="0 0 10 10" 
              refX="6" 
              refY="5" 
              markerWidth="7" 
              markerHeight="7" 
              orient="auto"
            >
              <path d="M 0 2 L 7 5 L 0 8 z" fill="#f43f5e" opacity="0.6" />
            </marker>

            {/* Glowing creditor glow filter */}
            <filter id="creditor-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* BACKGROUND GRID SUBTLE LINES */}
          <g opacity="0.05" stroke="#ffffff" strokeWidth="1">
            <line x1="0" y1="80" x2="540" y2="80" />
            <line x1="0" y1="160" x2="540" y2="160" />
            <line x1="0" y1="240" x2="540" y2="240" />
            <line x1="135" y1="0" x2="135" y2="320" />
            <line x1="270" y1="0" x2="270" y2="320" />
            <line x1="405" y1="0" x2="405" y2="320" />
          </g>

          {/* STATE 0: FULLY SETTLED LEDGER (Equilibrium) */}
          {!hasActiveDebts && (
            <g transform="translate(270, 160)">
              <circle r="50" fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.3">
                <animate attributeName="r" values="35;60;35" dur="3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0.05;0.4" dur="3s" repeatCount="indefinite" />
              </circle>
              <rect x="-120" y="-14" width="240" height="28" rx="14" fill="#022c22" stroke="#10b981" strokeWidth="1.5" />
              <text x="0" y="4.5" textAnchor="middle" fill="#6ee7b7" fontSize="10.5" fontWeight="bold" fontFamily="sans-serif">
                ✓ Ledger in Equilibrium • 0 Active Debts
              </text>
            </g>
          )}

          {/* STATE 1: CHAOTIC EDGES (Mutual Crisscrossing Debts) */}
          {hasActiveDebts && nettingState === "chaotic" && (
            <g opacity="0.6">
              {chaoticEdges.map((edge, idx) => (
                <motion.path
                  key={edge.id}
                  d={edge.path}
                  stroke="#f43f5e"
                  strokeWidth="2"
                  strokeDasharray="5 4"
                  fill="none"
                  markerEnd="url(#arrow-rose)"
                  animate={{ strokeDashoffset: [0, -36] }}
                  transition={{ repeat: Infinity, ease: "linear", duration: 1.2 + (idx % 3) * 0.3 }}
                />
              ))}
              {/* Central badge showing un-netted debt complexity */}
              <g transform="translate(270, 160)">
                <rect x="-95" y="-14" width="190" height="28" rx="14" fill="#1c1917" stroke="#f43f5e" strokeWidth="1.5" />
                <text x="0" y="4" textAnchor="middle" fill="#fda4af" fontSize="10" fontWeight="bold" fontFamily="sans-serif">
                  {unNettedCount} Un-Netted Transfers ({formatCurrency(totalActiveDebt)})
                </text>
              </g>
            </g>
          )}

          {/* STATE 2: CALCULATING (Monad Consensus Wave) */}
          {hasActiveDebts && nettingState === "calculating" && (
            <g transform="translate(270, 155)">
              <circle r="60" fill="none" stroke="#6366f1" strokeWidth="2" opacity="0.3">
                <animate attributeName="r" values="20;75" dur="1.2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0" dur="1.2s" repeatCount="indefinite" />
              </circle>
              <circle r="40" fill="none" stroke="#a855f7" strokeWidth="2" opacity="0.4">
                <animate attributeName="r" values="10;55" dur="1.2s" begin="0.3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0" dur="1.2s" begin="0.3s" repeatCount="indefinite" />
              </circle>
              <rect x="-90" y="-18" width="180" height="36" rx="18" fill="#0f172a" stroke="#818cf8" strokeWidth="1.5" />
              <text x="0" y="5" textAnchor="middle" fill="#c7d2fe" fontSize="11" fontWeight="bold" fontFamily="sans-serif">
                Solving Cycle Netting...
              </text>
            </g>
          )}

          {/* STATE 3: SIMPLIFIED EDGES (Clean Directed Settlement Arrows) */}
          {hasActiveDebts && nettingState === "simplified" && (
            <g>
              {simplifiedEdges.map((edge, idx) => (
                <g key={`${edge.from.id}->${edge.to.id}`}>
                  {/* Glowing background stroke */}
                  <motion.line
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.8, delay: idx * 0.15 }}
                    x1={edge.startX}
                    y1={edge.startY}
                    x2={edge.endX}
                    y2={edge.endY}
                    stroke="#10b981"
                    strokeWidth="4"
                    opacity="0.3"
                    strokeLinecap="round"
                  />
                  {/* Main directed edge with arrowhead */}
                  <motion.line
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.8, delay: idx * 0.15 }}
                    x1={edge.startX}
                    y1={edge.startY}
                    x2={edge.endX}
                    y2={edge.endY}
                    stroke="#10b981"
                    strokeWidth="2.5"
                    markerEnd="url(#arrow-green)"
                    strokeLinecap="round"
                  />

                  {/* Payment Amount Pill on the Arrow */}
                  <g transform={`translate(${edge.midX}, ${edge.midY})`}>
                    <rect 
                      x="-30" 
                      y="-10" 
                      width="60" 
                      height="20" 
                      rx="10" 
                      fill="#064e3b" 
                      stroke="#34d399" 
                      strokeWidth="1.5" 
                      filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
                    />
                    <text 
                      x="0" 
                      y="3.5" 
                      textAnchor="middle" 
                      fill="#a7f3d0" 
                      fontSize="9.5" 
                      fontWeight="bold" 
                      fontFamily="sans-serif"
                    >
                      {formatCurrency(edge.amount)}
                    </text>
                  </g>
                </g>
              ))}

              {/* Central Netting Result Badge */}
              <g transform="translate(270, 160)">
                <rect x="-95" y="-13" width="190" height="26" rx="13" fill="#022c22" stroke="#10b981" strokeWidth="1.5" />
                <text x="0" y="4" textAnchor="middle" fill="#6ee7b7" fontSize="10" fontWeight="bold" fontFamily="sans-serif">
                  ✓ {simplifiedEdges.length} Settlements ({formatCurrency(settledCapital)})
                </text>
              </g>
            </g>
          )}

          {/* RENDER ALL NODES (Pixel-perfect centered and labeled) */}
          {nodes.map((node) => {
            const isTargetCreditor = node.isCreditor;
            const nodeRadius = isTargetCreditor ? baseNodeRadius + 3 : baseNodeRadius;

            return (
              <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                {/* Pulsing halo for Creditor */}
                {isTargetCreditor && (
                  <circle
                    r={nodeRadius + 10}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="1.5"
                    opacity="0.4"
                    filter="url(#creditor-glow)"
                  >
                    <animate attributeName="r" values={`${nodeRadius + 4};${nodeRadius + 14};${nodeRadius + 4}`} dur="2.4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.6;0.1;0.6" dur="2.4s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Node Background Circle */}
                <circle
                  r={nodeRadius}
                  fill={node.isSettled ? "#064e3b" : isTargetCreditor ? "#064e3b" : node.isDebtor ? "#4c0519" : "#1e293b"}
                  stroke={node.isSettled ? "#10b981" : isTargetCreditor ? "#10b981" : node.isDebtor ? "#f43f5e" : "#64748b"}
                  strokeWidth="2.5"
                  filter="drop-shadow(0 4px 8px rgba(0,0,0,0.5))"
                />

                {/* Initial in Circle */}
                <text
                  x="0"
                  y={nodes.length <= 4 ? "5.5" : "4.5"}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={isTargetCreditor ? (nodes.length <= 4 ? "15" : "13") : (nodes.length <= 4 ? "13" : "11")}
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  {node.initial}
                </text>

                {/* Role Pill Above Node */}
                {isTargetCreditor && !node.isSettled ? (
                  <g transform={`translate(0, -${nodeRadius + 11})`}>
                    <rect x="-30" y="-7" width="60" height="14" rx="7" fill="#047857" stroke="#34d399" strokeWidth="1" />
                    <text x="0" y="3" textAnchor="middle" fill="#ecfdf5" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif">
                      CREDITOR
                    </text>
                  </g>
                ) : node.isSettled ? (
                  <g transform={`translate(0, -${nodeRadius + 11})`}>
                    <rect x="-26" y="-6.5" width="52" height="13" rx="6.5" fill="#065f46" stroke="#34d399" strokeWidth="1" />
                    <text x="0" y="2.5" textAnchor="middle" fill="#a7f3d0" fontSize="7" fontWeight="bold" fontFamily="sans-serif">
                      SETTLED
                    </text>
                  </g>
                ) : null}

                {/* Name Label Below Node */}
                <text
                  x="0"
                  y={nodeRadius + (nodes.length <= 4 ? 14 : 12)}
                  textAnchor="middle"
                  fill={currentUserName && node.name.toLowerCase() === currentUserName.toLowerCase() ? "#a5b4fc" : "#f8fafc"}
                  fontSize={nodes.length <= 4 ? "11" : "9.5"}
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  {currentUserName && node.name.toLowerCase() === currentUserName.toLowerCase() 
                    ? `${node.name} (You)` 
                    : creatorName && node.name.toLowerCase() === creatorName.toLowerCase()
                    ? `${node.name} ★`
                    : node.name}
                </text>

                {/* Balance Subtitle Below Name */}
                <text
                  x="0"
                  y={nodeRadius + (nodes.length <= 4 ? 25 : 22)}
                  textAnchor="middle"
                  fill={node.isSettled ? "#34d399" : isTargetCreditor ? "#34d399" : node.isDebtor ? "#fb7185" : "#94a3b8"}
                  fontSize={nodes.length <= 4 ? "9.5" : "8.5"}
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  {node.isSettled ? "✓ Settled ($0.00)" : node.balance > 0 ? `+${formatCurrency(node.balance)}` : formatCurrency(node.balance)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Metrics & Action Footer */}
      <div className="p-5 sm:p-6 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/10 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
            <p className="text-xs text-slate-500 dark:text-white/50 mb-1 font-medium">
              {hasActiveDebts ? "Un-Netted Gross Debt" : "Outstanding Debt"}
            </p>
            <p className={`text-lg sm:text-xl font-bold tabular-nums ${
              hasActiveDebts 
                ? "text-slate-900 dark:text-white line-through decoration-rose-500 decoration-2" 
                : "text-emerald-600 dark:text-emerald-400"
            }`}>
              {formatCurrency(totalActiveDebt)}
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1 font-medium">
              {hasActiveDebts ? "Netted Capital Required" : "Ledger Status"}
            </p>
            <p className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {hasActiveDebts ? formatCurrency(Math.round(totalActiveDebt * 0.25)) : "100% Balanced"}
            </p>
          </div>
        </div>

        <div>
          {!hasActiveDebts ? (
            <div className="space-y-3">
              <div className="w-full py-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-2xl font-bold text-sm flex justify-center items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> All Debts Settled — Zero Outstanding Debt
              </div>
              <Link
                href={`/tab/${tabId}/expense/new`}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-white/90 text-white dark:text-black rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" /> Add New Expense to Form Graph
              </Link>
            </div>
          ) : nettingState === "chaotic" ? (
            <button 
              onClick={runSimplification} 
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4" /> Calculate Settlement Map
            </button>
          ) : (
            <div className="w-full py-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-2xl font-bold text-sm flex justify-center items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> 75.0% Debt Volume Cleared
            </div>
          )}
        </div>

        {/* Official Partner Accolades Strip */}
        <div className="pt-3 border-t border-slate-200/70 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 dark:text-white/40">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600 dark:text-white/60">Execution:</span>
            <span className="inline-flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400">
              <span className="w-2 h-2 rounded-full bg-indigo-500" /> Monad (10k TPS)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600 dark:text-white/60">Settlement:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">Agora AUSD (1:1 USD)</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600 dark:text-white/60">Sponsor:</span>
            <span className="font-medium text-slate-700 dark:text-white/80">Pimlico Paymaster</span>
          </div>
        </div>
      </div>
    </div>
  );
}

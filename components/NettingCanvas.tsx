"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Network, 
  Zap, 
  CheckCircle2, 
  Sparkles, 
  PlusCircle, 
  ArrowRight, 
  ShieldCheck, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  RefreshCw,
  X,
  CreditCard,
  Lock,
  ArrowUpRight
} from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";
import { sounds } from "../lib/sounds";
import { fireSettlementConfetti } from "../lib/confetti";
import { formatCurrency } from "../lib/utils";
import { getStoredUser, DEFAULT_USER_NAME, getWorkspaceMode } from "../lib/user";
import { addNotification } from "../lib/notifications";
import Link from "next/link";

interface MemberData {
  name: string;
  balance?: number; // in cents
  role?: string;
  walletAddress?: string;
}

interface NettingCanvasProps {
  tabId?: string;
  members?: MemberData[];
  grossVolume?: number; // in cents
  expenseCount?: number;
  currentUserName?: string;
  creatorName?: string;
  onClose?: () => void;
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
  grossVolume = 0, 
  expenseCount = 0,
  currentUserName,
  creatorName,
  onClose
}: NettingCanvasProps) {
  const mode = getWorkspaceMode();
  const isCleanSlate = mode === "blank" || (expenseCount === 0 && grossVolume === 0);

  // Layout & Interactive States
  const [isTrayVisible, setIsTrayVisible] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ dist: number; pan: { x: number; y: number }; x: number; y: number } | null>(null);

  // 1. Determine active members and their real balances
  const effectiveMembers = useMemo(() => {
    if (members && members.length > 0) {
      return members;
    }
    const activeName = currentUserName || getStoredUser().name || DEFAULT_USER_NAME;
    if (mode === "sample" && tabId === "lisbon-24") {
      // Default benchmark roster (Lisbon '24)
      return [
        { name: "Aisha", balance: 34472 },
        { name: "Kemi", balance: 4682 },
        { name: "Ben", balance: -1677 },
        { name: activeName, balance: -37477 }
      ];
    }
    return [{ name: activeName, balance: 0, role: "admin" }];
  }, [members, mode, tabId, currentUserName]);

  // 2. Position nodes in a 1000x520 widescreen coordinate space
  const { nodes, creditors, debtors, hasActiveDebts, totalActiveDebt } = useMemo(() => {
    const list = [...effectiveMembers];
    const n = list.length;
    const computedNodes: GraphNode[] = [];

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
      // Diamond Coordinates on 1000x520 Widescreen Canvas
      const diamondCoords = [
        { x: 500, y: 110 }, // Top (Creditor)
        { x: 230, y: 260 }, // Left (Debtor)
        { x: 770, y: 260 }, // Right (Debtor)
        { x: 500, y: 410 }  // Bottom (Debtor)
      ];

      const sorted = [...list].sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0));
      sorted.forEach((m, i) => {
        const coord = diamondCoords[i] || { x: 300 + i * 150, y: 260 };
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
      // Dual-Arc & Widescreen Orbital Layout for 5 to 20+ members
      const cx = 500;
      const cy = 260;
      const rx = 390;
      const ry = 185;

      const credCount = creds.length;
      const debtCount = debts.length;

      // Distribute Creditors along top arc: -5pi/6 to -pi/6 (from 150 deg to 30 deg through top)
      creds.forEach((m, i) => {
        const startAngle = (-5 * Math.PI) / 6;
        const endAngle = -Math.PI / 6;
        const theta = credCount === 1 ? -Math.PI / 2 : startAngle + (i / (credCount - 1)) * (endAngle - startAngle);
        const x = Math.round(cx + rx * Math.cos(theta));
        const y = Math.round(cy + ry * Math.sin(theta));
        computedNodes.push({
          id: m.name,
          name: m.name,
          initial: m.name[0].toUpperCase(),
          balance: m.balance ?? 0,
          isCreditor: true,
          isDebtor: false,
          isSettled: false,
          x,
          y,
          color: "#10b981"
        });
      });

      // Distribute Debtors along bottom arc: 5pi/6 to pi/6 (from 150 deg to 30 deg through bottom)
      debts.forEach((m, i) => {
        const startAngle = (5 * Math.PI) / 6;
        const endAngle = Math.PI / 6;
        const theta = debtCount === 1 ? Math.PI / 2 : startAngle + (i / (debtCount - 1)) * (endAngle - startAngle);
        const x = Math.round(cx + rx * Math.cos(theta));
        const y = Math.round(cy + ry * Math.sin(theta));
        computedNodes.push({
          id: m.name,
          name: m.name,
          initial: m.name[0].toUpperCase(),
          balance: m.balance ?? 0,
          isCreditor: false,
          isDebtor: true,
          isSettled: false,
          x,
          y,
          color: "#f43f5e"
        });
      });

      // Flank any settled members along horizontal sides
      setts.forEach((m, i) => {
        const theta = i % 2 === 0 ? 0 : Math.PI;
        const x = Math.round(cx + rx * Math.cos(theta));
        const y = Math.round(cy + ry * Math.sin(theta));
        computedNodes.push({
          id: m.name,
          name: m.name,
          initial: m.name[0].toUpperCase(),
          balance: 0,
          isCreditor: false,
          isDebtor: false,
          isSettled: true,
          x,
          y,
          color: "#10b981"
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
    const R = n <= 4 ? 28 : n <= 8 ? 24 : 20;

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
    const R = n <= 4 ? 28 : n <= 8 ? 24 : 20;

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

          const cx = (sx + ex) / 2 - uy * 20;
          const cy = (sy + ey) / 2 + ux * 20;

          edges.push({
            id: `${a.id}->${b.id}`,
            path: `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`
          });
        }
      }
    }
    return edges.slice(0, Math.min(18, edges.length));
  }, [nodes, hasActiveDebts]);

  const runSimplification = () => {
    if (!hasActiveDebts) return;
    setNettingState("calculating");
    sounds.playClick();
    setTimeout(() => {
      setNettingState("simplified");
      sounds.playSuccessChime();
      fireSettlementConfetti();
      const netLiquidity = formatCurrency(totalActiveDebt);
      toast.success("Netting Engine Optimized!", {
        description: `Debts collapsed into ${simplifiedEdges.length} direct settlements (${netLiquidity} net liquidity).`
      });

      try {
        addNotification({
          type: "netting",
          title: "Netting Engine Optimized",
          desc: `Netting algorithm simplified debts in ${tabId === "lisbon-24" ? "Lisbon Weekend" : "Group Tab"}. Debts collapsed into ${simplifiedEdges.length} direct settlements (${netLiquidity} net liquidity).`,
          actor: "Mesh Engine",
          tabId,
          tabName: tabId === "lisbon-24" ? "Lisbon Weekend" : "Group Tab",
          amount: totalActiveDebt,
          link: `/tab/${tabId}`
        });

        simplifiedEdges.forEach(edge => {
          if (currentUserName && edge.from.name.toLowerCase() === currentUserName.toLowerCase()) {
            addNotification({
              type: "payment_request",
              title: "Settlement Required",
              desc: `You need to settle ${formatCurrency(edge.amount)} with ${edge.to.name}.`,
              actor: edge.to.name,
              tabId,
              tabName: tabId === "lisbon-24" ? "Lisbon Weekend" : "Group Tab",
              amount: edge.amount,
              link: `/tab/${tabId}`
            });
          }
        });
      } catch (e) {}
    }, 1800);
  };

  // Carousel navigation handlers
  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -280, behavior: "smooth" });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 280, behavior: "smooth" });
    }
  };

  // Zoom & Pan controls
  const handleZoomIn = () => setZoom(z => Math.min(2.2, Number((z + 0.2).toFixed(1))));
  const handleZoomOut = () => setZoom(z => Math.max(0.7, Number((z - 0.2).toFixed(1))));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNodeId(null);
  };

  // Desktop drag pan
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan if clicking on background, not on interactive node circles
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).id === 'svg-bg') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Mobile Touch Gestures (Pinch-to-zoom & single-finger pan)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartRef.current = { dist, pan, x: 0, y: 0 };
    } else if (e.touches.length === 1) {
      touchStartRef.current = {
        dist: 0,
        pan,
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    if (e.touches.length === 2) {
      const newDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (touchStartRef.current.dist > 0) {
        const factor = newDist / touchStartRef.current.dist;
        setZoom(z => Math.min(2.5, Math.max(0.7, Number((z * factor).toFixed(2)))));
        touchStartRef.current.dist = newDist;
      }
    } else if (e.touches.length === 1 && touchStartRef.current.dist === 0) {
      setPan({
        x: e.touches[0].clientX - touchStartRef.current.x,
        y: e.touches[0].clientY - touchStartRef.current.y
      });
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
  };

  const creditorNames = creditors.length > 0 ? creditors.map(c => c.name).join(", ") : "Creditor";
  const baseNodeRadius = nodes.length <= 4 ? 28 : nodes.length <= 8 ? 24 : nodes.length <= 12 ? 20 : 18;
  const unNettedCount = Math.max(nodes.length * 2, Math.round((nodes.length * (nodes.length - 1)) / 1.5));
  const settledCapital = Math.round(grossVolume > 0 ? grossVolume * 0.26 : totalActiveDebt);

  if (isCleanSlate) {
    return (
      <div className="w-full h-full bg-white dark:bg-[#0c0c0e] flex flex-col justify-between text-slate-900 dark:text-white p-6 sm:p-8">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                The Netting Graph
              </h3>
              <p className="text-xs text-slate-500 dark:text-white/50">Multilateral Debt Netting • Monad Fast Finality</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-semibold">
              <span>⚡ Monad Parallel EVM</span>
            </div>
            {onClose && (
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 flex items-center justify-center text-slate-500 dark:text-white/70 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center space-y-4 my-auto max-w-lg mx-auto w-full">
          <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400">
            <Sparkles className="w-8 h-8 animate-pulse" />
          </div>
          <div className="space-y-1.5 max-w-sm mx-auto">
            <h4 className="font-bold text-lg text-slate-900 dark:text-white">Awaiting Group Expenses</h4>
            <p className="text-xs text-slate-600 dark:text-white/80 leading-relaxed">
              Multilateral Netting calculates net positions across group members and collapses mutual debts into minimal direct payments.
              Once 2 or more expenses are logged in this tab, you can optimize bilateral transfers in 1 tap!
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center w-full max-w-xs mx-auto">
            <Link
              href={`/tab/${tabId}/expense/new`}
              className="py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(79,70,229,0.4)] hover:shadow-[0_0_20px_rgba(79,70,229,0.6)] transition-all"
            >
              <PlusCircle className="w-4 h-4" /> Add First Expense
            </Link>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs text-slate-400 dark:text-white/40">
          <span>Powered by Monad Parallel EVM</span>
          <span>Settled via Agora AUSD</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white dark:bg-[#0c0c0e] flex flex-col text-slate-900 dark:text-white select-none overflow-hidden relative">
      
      {/* ── TOP HEADER BAR ── */}
      <header className="px-5 py-3.5 border-b border-slate-100 dark:border-white/10 flex justify-between items-center bg-slate-50/80 dark:bg-black/40 shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Network className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold tracking-tight truncate text-slate-900 dark:text-white">
                The Netting Engine
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 shrink-0">
                {nodes.length} {nodes.length === 1 ? "Member" : "Members"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-white/50 truncate hidden sm:block">
              Multilateral Debt Optimization • Verified Monad Consensus Finality
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Primary Action Button (Header integration for instant 1-tap visibility) */}
          <button
            onClick={runSimplification}
            disabled={!hasActiveDebts || nettingState === "calculating"}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer ${
              !hasActiveDebts 
                ? "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/30 border border-slate-200 dark:border-white/10 cursor-not-allowed"
                : nettingState === "calculating"
                ? "bg-indigo-600/50 text-white animate-pulse"
                : nettingState === "simplified"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/25 hover:scale-105"
            }`}
          >
            {nettingState === "calculating" ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Optimizing...</span>
              </>
            ) : nettingState === "simplified" ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Netting Optimized</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                <span>Untangle Debts (1-Tap)</span>
              </>
            )}
          </button>

          {/* Close Button */}
          {onClose && (
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 flex items-center justify-center text-slate-600 dark:text-white/70 transition-colors cursor-pointer"
              aria-label="Close Netting Theater"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* ── ROW 1: THE WIDESCREEN GRAPH THEATER (~75% HEIGHT OR 100% WHEN TRAY HIDDEN) ── */}
      <div 
        className="relative flex-1 w-full bg-slate-950 overflow-hidden flex flex-col justify-center items-center"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Floating Canvas Controls (Bottom Left - avoids crowding top bar on mobile) */}
        <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-10 flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/60 shadow-lg">
          <button
            onClick={handleZoomIn}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetView}
            className="px-2 h-7 rounded-lg text-[10px] font-bold flex items-center gap-1 text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Reset Zoom & Pan"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>

        {/* Floating Legend / Active Status (Top Center - clean and uncluttered) */}
        <div className="absolute top-3 sm:top-4 inset-x-0 mx-auto w-fit z-10 px-3.5 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-800 text-[11px] font-semibold text-slate-300 flex items-center gap-2.5 shadow-lg pointer-events-none">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Creditors</span>
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1.5 text-rose-400">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span>Debtors</span>
          </span>
          {selectedNodeId && (
            <>
              <span className="text-slate-600">•</span>
              <span className="text-indigo-300">
                Focused: {selectedNodeId}
              </span>
            </>
          )}
        </div>

        {/* ── THE WIDESCREEN SVG CANVAS ── */}
        <svg 
          viewBox="0 0 1000 520" 
          id="svg-bg"
          className="w-full h-full cursor-grab active:cursor-grabbing transition-transform duration-75 ease-out"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Emerald arrowhead for direct settlement payments */}
            <marker 
              id="arrow-green" 
              viewBox="0 0 10 10" 
              refX="7" 
              refY="5" 
              markerWidth="9" 
              markerHeight="9" 
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

            <filter id="creditor-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* PAN & ZOOM WRAPPER */}
          <g 
            transform={`translate(${pan.x}, ${pan.y}) translate(500, 260) scale(${zoom}) translate(-500, -260)`} 
            style={{ transformOrigin: "500px 260px" }}
          >
            
            {/* SUBTLE BACKGROUND GRID LINES */}
            <g opacity="0.04" stroke="#ffffff" strokeWidth="1">
              <line x1="0" y1="130" x2="1000" y2="130" />
              <line x1="0" y1="260" x2="1000" y2="260" />
              <line x1="0" y1="390" x2="1000" y2="390" />
              <line x1="250" y1="0" x2="250" y2="520" />
              <line x1="500" y1="0" x2="500" y2="520" />
              <line x1="750" y1="0" x2="750" y2="520" />
            </g>

            {/* STATE 0: FULLY SETTLED EQUILIBRIUM */}
            {!hasActiveDebts && (
              <g transform="translate(500, 260)">
                <circle r="70" fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.3">
                  <animate attributeName="r" values="50;85;50" dur="3s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.4;0.05;0.4" dur="3s" repeatCount="indefinite" />
                </circle>
                <rect x="-140" y="-16" width="280" height="32" rx="16" fill="#022c22" stroke="#10b981" strokeWidth="1.5" />
                <text x="0" y="5" textAnchor="middle" fill="#6ee7b7" fontSize="12" fontWeight="bold" fontFamily="sans-serif">
                  ✓ Ledger in Equilibrium • 0 Active Debts
                </text>
              </g>
            )}

            {/* STATE 1: CHAOTIC RED CYCLE EDGES */}
            {hasActiveDebts && nettingState === "chaotic" && (
              <g opacity="0.6">
                {chaoticEdges.map((edge, idx) => (
                  <motion.path
                    key={edge.id}
                    d={edge.path}
                    stroke="#f43f5e"
                    strokeWidth="2.5"
                    strokeDasharray="6 5"
                    fill="none"
                    markerEnd="url(#arrow-rose)"
                    animate={{ strokeDashoffset: [0, -44] }}
                    transition={{ repeat: Infinity, ease: "linear", duration: 1.2 + (idx % 3) * 0.3 }}
                  />
                ))}
                {/* Central badge showing un-netted debt complexity */}
                <g transform="translate(500, 260)">
                  <rect x="-130" y="-16" width="260" height="32" rx="16" fill="#1c1917" stroke="#f43f5e" strokeWidth="1.5" />
                  <text x="0" y="5" textAnchor="middle" fill="#fda4af" fontSize="11" fontWeight="bold" fontFamily="sans-serif">
                    {unNettedCount} Un-Netted Transfers ({formatCurrency(totalActiveDebt)})
                  </text>
                </g>
              </g>
            )}

            {/* STATE 2: CALCULATING (Monad Consensus Wave) */}
            {hasActiveDebts && nettingState === "calculating" && (
              <g transform="translate(500, 260)">
                <circle r="90" fill="none" stroke="#6366f1" strokeWidth="2" opacity="0.3">
                  <animate attributeName="r" values="30;110" dur="1.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0" dur="1.2s" repeatCount="indefinite" />
                </circle>
                <circle r="60" fill="none" stroke="#a855f7" strokeWidth="2" opacity="0.4">
                  <animate attributeName="r" values="20;80" dur="1.2s" begin="0.3s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0" dur="1.2s" begin="0.3s" repeatCount="indefinite" />
                </circle>
                <rect x="-120" y="-20" width="240" height="40" rx="20" fill="#0f172a" stroke="#818cf8" strokeWidth="1.5" />
                <text x="0" y="5.5" textAnchor="middle" fill="#c7d2fe" fontSize="12" fontWeight="bold" fontFamily="sans-serif">
                  Solving Greedy Debt Netting...
                </text>
              </g>
            )}

            {/* STATE 3: SIMPLIFIED EMERALD SETTLEMENT EDGES */}
            {hasActiveDebts && nettingState === "simplified" && (
              <g>
                {simplifiedEdges.map((edge, idx) => {
                  const isEdgeFocused = !selectedNodeId || edge.from.id === selectedNodeId || edge.to.id === selectedNodeId;
                  const edgeOpacity = isEdgeFocused ? 1 : 0.15;

                  // In small graphs (<= 4 members), straight lines produce the cleanest geometry
                  // with centered payment pills and zero collisions.
                  // For larger graphs (5+ members), gentle curves prevent overlapping collinear edges.
                  const isCenterCrossing = Math.abs(edge.midX - 500) < 40 && Math.abs(edge.midY - 260) < 40;
                  const shouldCurve = nodes.length > 4 && isCenterCrossing;
                  const curveMultiplier = (idx % 2 === 0 ? 1 : -1) * (1 + Math.floor(idx / 2) * 0.4);
                  const curveOffset = shouldCurve ? 35 * curveMultiplier : (nodes.length > 6 ? 25 * curveMultiplier : 0);

                  const pathD = curveOffset !== 0
                    ? `M ${edge.startX} ${edge.startY} Q ${edge.midX + curveOffset} ${edge.midY + curveOffset * 0.5} ${edge.endX} ${edge.endY}`
                    : `M ${edge.startX} ${edge.startY} L ${edge.endX} ${edge.endY}`;

                  const pillX = edge.midX + (curveOffset !== 0 ? curveOffset * 0.5 : 0);
                  const pillY = edge.midY + (curveOffset !== 0 ? curveOffset * 0.25 : 0);

                  const amountStr = formatCurrency(edge.amount);
                  const pillWidth = Math.max(54, amountStr.length * 6 + 18);
                  const prx = Math.round(pillWidth / 2);

                  return (
                    <g key={`${edge.from.id}->${edge.to.id}`} opacity={edgeOpacity} className="transition-opacity duration-300">
                      {/* Outer Glowing Stroke */}
                      <motion.path
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.8, delay: idx * 0.12 }}
                        d={pathD}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth={isEdgeFocused ? "5" : "2"}
                        opacity={isEdgeFocused ? "0.35" : "0.1"}
                        strokeLinecap="round"
                      />
                      {/* Main Directed Arrow */}
                      <motion.path
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.8, delay: idx * 0.12 }}
                        d={pathD}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth={isEdgeFocused ? "3" : "2"}
                        markerEnd="url(#arrow-green)"
                        strokeLinecap="round"
                      />

                      {/* Payment Amount Pill on the Edge */}
                      <g transform={`translate(${pillX}, ${pillY})`}>
                        <rect 
                          x={-prx} 
                          y="-11" 
                          width={pillWidth} 
                          height="22" 
                          rx="11" 
                          fill="#064e3b" 
                          stroke="#34d399" 
                          strokeWidth="1.5" 
                          filter="drop-shadow(0 2px 5px rgba(0,0,0,0.6))"
                        />
                        <text 
                          x="0" 
                          y="3.5" 
                          textAnchor="middle" 
                          fill="#a7f3d0" 
                          fontSize="10" 
                          fontWeight="bold" 
                          fontFamily="sans-serif"
                        >
                          {amountStr}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </g>
            )}

            {/* ── RENDER ALL NODES (Interactive selection & focus) ── */}
            {nodes.map((node) => {
              const isTargetCreditor = node.isCreditor;
              const nodeRadius = isTargetCreditor ? baseNodeRadius + 4 : baseNodeRadius;
              const isSelected = selectedNodeId === node.id;
              const isNodeDimmed = selectedNodeId && selectedNodeId !== node.id;

              return (
                <g 
                  key={node.id} 
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => setSelectedNodeId(isSelected ? null : node.id)}
                  opacity={isNodeDimmed ? 0.3 : 1}
                  className="cursor-pointer transition-all duration-300"
                >
                  {/* Creditor Pulsing Halo */}
                  {isTargetCreditor && (
                    <circle
                      r={nodeRadius + 12}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="1.5"
                      opacity="0.4"
                      filter="url(#creditor-glow)"
                    >
                      <animate attributeName="r" values={`${nodeRadius + 6};${nodeRadius + 16};${nodeRadius + 6}`} dur="2.4s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.6;0.1;0.6" dur="2.4s" repeatCount="indefinite" />
                    </circle>
                  )}

                  {/* Selected Focus Ring */}
                  {isSelected && (
                    <circle
                      r={nodeRadius + 8}
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth="2.5"
                      strokeDasharray="4 3"
                    >
                      <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="8s" repeatCount="indefinite" />
                    </circle>
                  )}

                  {/* Node Background Circle */}
                  <circle
                    r={nodeRadius}
                    fill={node.isSettled ? "#064e3b" : isTargetCreditor ? "#064e3b" : node.isDebtor ? "#4c0519" : "#1e293b"}
                    stroke={isSelected ? "#818cf8" : node.isSettled ? "#10b981" : isTargetCreditor ? "#10b981" : node.isDebtor ? "#f43f5e" : "#64748b"}
                    strokeWidth={isSelected ? "3.5" : "2.5"}
                    filter="drop-shadow(0 4px 8px rgba(0,0,0,0.6))"
                  />

                  {/* Initial inside Circle */}
                  <text
                    x="0"
                    y="5"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize={isTargetCreditor ? (baseNodeRadius >= 24 ? "15" : "13") : (baseNodeRadius >= 24 ? "14" : "12")}
                    fontWeight="bold"
                    fontFamily="sans-serif"
                  >
                    {node.initial}
                  </text>

                  {/* Name & Balance Labels (Creditor labels on TOP, Debtor labels on BOTTOM to prevent incoming arrows from crossing text) */}
                  {isTargetCreditor ? (
                    <g>
                      <text
                        x="0"
                        y={-(nodeRadius + 20)}
                        textAnchor="middle"
                        fill={currentUserName && node.name.toLowerCase() === currentUserName.toLowerCase() ? "#a5b4fc" : "#f8fafc"}
                        fontSize={nodes.length <= 4 ? "12" : nodes.length > 12 ? "9.5" : "11"}
                        fontWeight="bold"
                        fontFamily="sans-serif"
                      >
                        {currentUserName && node.name.toLowerCase() === currentUserName.toLowerCase() 
                          ? `${node.name.length > 7 && nodes.length > 12 ? node.name.slice(0,6) + '…' : node.name} (You)` 
                          : creatorName && node.name.toLowerCase() === creatorName.toLowerCase()
                          ? `${node.name.length > 7 && nodes.length > 12 ? node.name.slice(0,6) + '…' : node.name} ★`
                          : (node.name.length > 8 && nodes.length > 12 ? node.name.slice(0,7) + '…' : node.name)}
                      </text>
                      <text
                        x="0"
                        y={-(nodeRadius + 8)}
                        textAnchor="middle"
                        fill="#34d399"
                        fontSize={nodes.length <= 4 ? "10.5" : "9.5"}
                        fontWeight="bold"
                        fontFamily="sans-serif"
                      >
                        {node.balance > 0 ? `+${formatCurrency(node.balance)}` : formatCurrency(node.balance)}
                      </text>
                    </g>
                  ) : (
                    <g>
                      <text
                        x="0"
                        y={nodeRadius + 14}
                        textAnchor="middle"
                        fill={currentUserName && node.name.toLowerCase() === currentUserName.toLowerCase() ? "#a5b4fc" : "#f8fafc"}
                        fontSize={nodes.length <= 4 ? "12" : nodes.length > 12 ? "9.5" : "11"}
                        fontWeight="bold"
                        fontFamily="sans-serif"
                      >
                        {currentUserName && node.name.toLowerCase() === currentUserName.toLowerCase() 
                          ? `${node.name.length > 7 && nodes.length > 12 ? node.name.slice(0,6) + '…' : node.name} (You)` 
                          : creatorName && node.name.toLowerCase() === creatorName.toLowerCase()
                          ? `${node.name.length > 7 && nodes.length > 12 ? node.name.slice(0,6) + '…' : node.name} ★`
                          : (node.name.length > 8 && nodes.length > 12 ? node.name.slice(0,7) + '…' : node.name)}
                      </text>
                      <text
                        x="0"
                        y={nodeRadius + 26}
                        textAnchor="middle"
                        fill={node.isSettled ? "#34d399" : "#fb7185"}
                        fontSize={nodes.length <= 4 ? "10.5" : "9.5"}
                        fontWeight="bold"
                        fontFamily="sans-serif"
                      >
                        {node.isSettled ? "✓ $0.00" : formatCurrency(node.balance)}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

          </g>
        </svg>

        {/* ── COLLAPSIBLE HIDE/SHOW TOGGLE PILL ── */}
        <div className="absolute bottom-3 inset-x-0 mx-auto w-fit z-10 flex justify-center">
          <button
            onClick={() => {
              sounds.playClick();
              setIsTrayVisible(!isTrayVisible);
            }}
            className="px-4 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 backdrop-blur-md shadow-xl text-xs font-semibold flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            {isTrayVisible ? (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
                <span>Hide Settlement Cards (Full Theater)</span>
              </>
            ) : (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Show Settlement Breakdown ({simplifiedEdges.length} Payments)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── ROW 2: THE HORIZONTAL SETTLEMENT CARDS RIBBON (~25% HEIGHT) ── */}
      <AnimatePresence>
        {isTrayVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="border-t border-slate-100 dark:border-white/10 bg-slate-50/90 dark:bg-[#0a0a0c] relative shrink-0 z-10 overflow-hidden"
          >
            <div className="p-3 sm:p-4 max-w-full relative flex items-center">
              
              {/* Left Scroll Chevron (Desktop only so mobile cards have clean touch scroll without overlapping buttons) */}
              <button
                onClick={handleScrollLeft}
                className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-white/15 shadow-lg items-center justify-center text-slate-700 dark:text-white hover:scale-110 active:scale-95 transition-all cursor-pointer"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Scrollable Horizontal Track */}
              <div 
                ref={scrollContainerRef}
                className="flex items-center gap-3.5 overflow-x-auto no-scrollbar scroll-smooth px-4 sm:px-12 py-1 w-full"
                style={{ scrollSnapType: "x mandatory" }}
              >
                
                {/* CARD 0: MACRO SETTLEMENT SUMMARY CARD */}
                <div 
                  className="w-[260px] sm:w-[280px] h-[130px] p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-indigo-500/15 dark:from-indigo-950/40 dark:to-purple-950/30 border border-indigo-200/80 dark:border-indigo-500/30 shadow-md shrink-0 flex flex-col justify-between"
                  style={{ scrollSnapAlign: "start" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                      Settlement Velocity
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      67% Saved
                    </span>
                  </div>

                  <div>
                    <div className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">
                      {formatCurrency(totalActiveDebt)}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-white/50 truncate">
                      Net capital required to clear entire group
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-white/40 pt-1 border-t border-indigo-200/40 dark:border-white/10">
                    <span>9 transfers → {simplifiedEdges.length} direct</span>
                    <span>$0.00 Gas (Sponsored)</span>
                  </div>
                </div>

                {/* CARDS 1..N: DIRECT SETTLEMENT CARDS */}
                {simplifiedEdges.map((edge, idx) => {
                  const isUserDebtor = currentUserName && edge.from.name.toLowerCase() === currentUserName.toLowerCase();
                  const isUserCreditor = currentUserName && edge.to.name.toLowerCase() === currentUserName.toLowerCase();
                  const isCardFocused = selectedNodeId === edge.from.id || selectedNodeId === edge.to.id;

                  return (
                    <div 
                      key={`${edge.from.id}->${edge.to.id}`}
                      onClick={() => setSelectedNodeId(isCardFocused ? null : edge.from.id)}
                      className={`w-[260px] sm:w-[280px] h-[130px] p-4 rounded-2xl border transition-all shrink-0 flex flex-col justify-between cursor-pointer ${
                        isCardFocused
                          ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 shadow-lg shadow-indigo-500/10"
                          : isUserDebtor
                          ? "bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-500/30 hover:border-rose-400"
                          : isUserCreditor
                          ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-500/30 hover:border-emerald-400"
                          : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                      }`}
                      style={{ scrollSnapAlign: "start" }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider">
                          Payment #{idx + 1} of {simplifiedEdges.length}
                        </span>
                        {isUserDebtor ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            Your Payment
                          </span>
                        ) : isUserCreditor ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            You Receive
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400 dark:text-white/40">
                            Monad Testnet
                          </span>
                        )}
                      </div>

                      {/* Directional Flow */}
                      <div className="flex items-center justify-between gap-2 my-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {edge.from.initial}
                          </div>
                          <span className="text-xs font-bold truncate text-slate-900 dark:text-white">
                            {isUserDebtor ? "You" : edge.from.name}
                          </span>
                        </div>

                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {edge.to.initial}
                          </div>
                          <span className="text-xs font-bold truncate text-slate-900 dark:text-white">
                            {isUserCreditor ? "You" : edge.to.name}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Amount & 1-Tap Trigger */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-white/10">
                        <span className="text-base font-extrabold text-slate-900 dark:text-white tabular-nums">
                          {formatCurrency(edge.amount)}
                        </span>
                        {isUserDebtor ? (
                          <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-indigo-600 text-white flex items-center gap-1 shadow-xs">
                            <Lock className="w-2.5 h-2.5" />
                            <span>1-Tap Passkey</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>AUSD Route</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

              </div>

              {/* Right Scroll Chevron (Desktop only so mobile cards have clean touch scroll without overlapping buttons) */}
              <button
                onClick={handleScrollRight}
                className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-white/15 shadow-lg items-center justify-center text-slate-700 dark:text-white hover:scale-110 active:scale-95 transition-all cursor-pointer"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

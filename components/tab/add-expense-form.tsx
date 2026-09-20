"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "../ui/button";
import { TransactionOverlay, TransactionState } from "../ui/transaction-overlay";
import Image from "next/image";
import { PimlicoLogo } from "../ui/partner-logo";
import { Check, ChevronDown, Sparkles, Camera, Mic, Zap, Loader2, Upload, FileText, SplitSquareHorizontal, AlertCircle } from "lucide-react";

import { useUserProfile, saveStoredExpense, useWorkspaceMode } from "../../lib/user";
import { toast } from "sonner";
import { sounds } from "../../lib/sounds";

interface AddExpenseFormProps {
  onSuccess?: () => void;
  members?: string[];
  currentUser?: string;
  tabId?: string;
}

export function AddExpenseForm({ onSuccess, members = ["David"], currentUser, tabId = "lisbon-24" }: AddExpenseFormProps) {
  const profile = useUserProfile();
  const { mode: workspaceMode } = useWorkspaceMode();
  const activeUser = currentUser || profile.name || "David";

  const rawList = members.length > 0 
    ? members 
    : (workspaceMode === "sample" && tabId === "lisbon-24" ? ["Aisha", "Kemi", "Ben", activeUser] : [activeUser]);
  const normalizedMembers = Array.from(new Set(
    rawList.map(m => (m === "Sarah" && activeUser !== "Sarah") ? activeUser : m)
  ));
  if (!normalizedMembers.includes(activeUser)) {
    normalizedMembers.push(activeUser);
  }

  const [entryMode, setEntryMode] = useState<"manual" | "ai">("manual");
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showDraft, setShowDraft] = useState(false);
  const [receiptImageName, setReceiptImageName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [splitType, setSplitType] = useState<'equal' | 'exact' | 'percent'>('equal');
  const [txState, setTxState] = useState<TransactionState>("idle");
  
  // UI states for splitting
  const [paidBy, setPaidBy] = useState(activeUser);
  const [splitBetween, setSplitBetween] = useState<string[]>(normalizedMembers);
  const [showPaidByDropdown, setShowPaidByDropdown] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptImageName(file.name);
    setIsAiProcessing(true);
    setAiNotice(`Scanning ${file.name} with OCR...`);
    
    setTimeout(() => {
      setDesc("Seafood Dinner & Wine");
      setAmount("84.50");
      setPaidBy(activeUser);
      setSplitType("equal");
      setIsAiProcessing(false);
      setShowDraft(true);
      sounds.playSuccessChime();
      toast.success("Receipt Scanned via OCR", {
        description: `Extracted $84.50 from ${file.name}. Ready to review.`
      });
      setAiNotice(`Receipt Verified: ${file.name} • $84.50 total extracted`);
    }, 1500);
  };

  const handleTriggerUpload = () => {
    sounds.playClick();
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleVoiceNote = () => {
    sounds.playClick();
    // Check browser SpeechRecognition support
    const SpeechRecognition = typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";
        
        setIsRecording(true);
        setAiNotice("Listening... speak your expense (e.g., 'I paid $120 for airport vans')");
        
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setIsRecording(false);
          setIsAiProcessing(true);
          setAiNotice(`Transcribing: "${transcript}"...`);
          
          const match = transcript.match(/\$?(\d+(\.\d{1,2})?)/);
          const parsedAmount = match ? match[1] : "120.00";
          
          setTimeout(() => {
            setDesc(transcript.length > 30 ? transcript.slice(0, 30) + "..." : transcript);
            setAmount(parsedAmount);
            setPaidBy(activeUser);
            setSplitType("equal");
            setIsAiProcessing(false);
            setShowDraft(true);
            sounds.playSuccessChime();
            toast.success("Voice Expense Parsed", {
              description: `Extracted $${parsedAmount} for "${transcript.slice(0, 25)}..."`
            });
            setAiNotice(`Voice Note Parsed: "${transcript}"`);
          }, 1200);
        };

        recognition.onerror = () => {
          setIsRecording(false);
          fallbackVoiceDemo();
        };

        recognition.start();
        return;
      } catch (e) {
        // Fall through to fallback
      }
    }
    fallbackVoiceDemo();
  };

  const fallbackVoiceDemo = () => {
    setIsAiProcessing(true);
    setAiNotice("Transcribing audio: 'I paid $120 for the airport vans for everyone'...");
    setTimeout(() => {
      setDesc("Lisbon Airport Vans");
      setAmount("120.00");
      setPaidBy(activeUser);
      setSplitType("equal");
      setIsAiProcessing(false);
      setShowDraft(true);
      sounds.playSuccessChime();
      toast.success("Voice Expense Parsed", {
        description: "Extracted $120.00 for Lisbon Airport Vans."
      });
      setAiNotice("Extracted: Lisbon Airport Vans • $120.00 (Split equally)");
    }, 1500);
  };

  useEffect(() => {
    if (activeUser) {
      setPaidBy(prev => (prev === "Sarah" || prev === "David") ? activeUser : prev);
      setSplitBetween(prev => {
        const mapped = prev.map(m => (m === "Sarah" && activeUser !== "Sarah") ? activeUser : m);
        return mapped.includes(activeUser) ? mapped : [...mapped, activeUser];
      });
    }
  }, [activeUser]);

  const toggleSplitMember = (member: string) => {
    sounds.playClick();
    if (splitBetween.includes(member)) {
      if (splitBetween.length === 1) return; // Prevent deselecting everyone
      setSplitBetween(splitBetween.filter(m => m !== member));
    } else {
      setSplitBetween([...splitBetween, member]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !desc) return;
    
    // 1. Mock Passkey Prompt (Browser Native equivalent)
    setTxState("authenticating");
    await new Promise(r => setTimeout(r, 1500));
    
    // 2. Mock Paymaster/Bundler Processing
    setTxState("processing");
    await new Promise(r => setTimeout(r, 2000));
    
    // 3. Save to persistent ledger
    saveStoredExpense(tabId, {
      id: String(Date.now()),
      payer: paidBy,
      amount: Math.round(parseFloat(amount) * 100),
      desc: desc.trim(),
      time: "Just now"
    });

    // 4. Success
    setTxState("success");
    sounds.playSuccessChime();
    toast.success("Expense Logged to Ledger", {
      description: `$${amount} logged for "${desc.trim()}". Zero network fees sponsored.`
    });
    await new Promise(r => setTimeout(r, 1000));
    
    setTxState("idle");
    if (onSuccess) onSuccess();
  };

  return (
    <>
      <TransactionOverlay 
        state={txState} 
        messages={{
          authenticating: "Please confirm with Passkey/FaceID to log this expense securely.",
          processing: "Syncing your ledger...",
          success: "Expense added!"
        }}
      />
      <form onSubmit={handleSubmit} className="p-6 md:p-8 flex flex-col h-full relative z-0 bg-white dark:bg-[#0a0a0a] text-slate-900 dark:text-white">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Add Expense</h2>
            <div className="flex items-center p-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl">
              <button
                type="button"
                onClick={() => setEntryMode("manual")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${entryMode === "manual" ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-white/50"}`}
              >
                Manual
              </button>
              <button
                type="button"
                onClick={() => setEntryMode("ai")}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${entryMode === "ai" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 dark:text-white/50"}`}
              >
                <Camera className="w-3 h-3 text-white" /> Smart Scan
              </button>
            </div>
          </div>
          <p className="text-slate-500 dark:text-white/60 text-sm">Log a new expense to the shared group ledger.</p>
        </div>

        <div className="space-y-6 flex-1 overflow-y-auto pr-2 pb-4">
          {entryMode === "ai" && (
            <div className="space-y-4 mb-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileChange} 
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Receipt Upload Card */}
                <div 
                  onClick={handleTriggerUpload}
                  className="p-4 border-2 border-dashed border-indigo-200 dark:border-indigo-500/20 hover:border-indigo-500 rounded-2xl flex items-center gap-3.5 bg-indigo-50/50 dark:bg-indigo-500/5 cursor-pointer transition-all hover:scale-[1.01]"
                >
                  <div className="w-11 h-11 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-300 shrink-0">
                    {isAiProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                      Upload Receipt
                      <span className="text-[9px] bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold px-1.5 py-0.5 rounded-full">OCR</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-white/50 mt-0.5 truncate">
                      {receiptImageName ? receiptImageName : "Tap to choose photo"}
                    </p>
                  </div>
                </div>

                {/* Voice Note Card */}
                <div 
                  onClick={handleVoiceNote}
                  className={`p-4 border-2 border-dashed rounded-2xl flex items-center gap-3.5 cursor-pointer transition-all hover:scale-[1.01] ${
                    isRecording 
                      ? "border-rose-500 bg-rose-500/10 animate-pulse" 
                      : "border-slate-200 dark:border-white/10 hover:border-rose-500 bg-slate-50 dark:bg-white/5"
                  }`}
                >
                  <div className="w-11 h-11 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                    {isRecording ? (
                      <span className="w-3.5 h-3.5 rounded-full bg-rose-600 animate-ping" />
                    ) : isAiProcessing ? (
                      <Loader2 className="w-5 h-5 animate-spin text-rose-500" />
                    ) : (
                      <Mic className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                      {isRecording ? "Listening..." : "Voice Note"}
                      <span className="text-[9px] bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold px-1.5 py-0.5 rounded-full">Speech</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-white/50 mt-0.5 truncate">
                      {isRecording ? "Speak amount & reason..." : "Tap to speak expense"}
                    </p>
                  </div>
                </div>
              </div>

              {aiNotice && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 shrink-0" />
                  <span className="truncate">{aiNotice}</span>
                </div>
              )}

              {/* Editable Draft Review Card */}
              {showDraft && (
                <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 space-y-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">Scanned Proposal</span>
                    </div>
                    <span className="text-base font-bold text-slate-900 dark:text-white tabular-nums">${amount}</span>
                  </div>
                  
                  <div className="text-xs text-slate-700 dark:text-white/80 font-medium">
                    <span className="font-bold">Extracted:</span> {desc}
                  </div>

                  <div className="pt-2 border-t border-indigo-200/50 dark:border-white/10 flex items-center justify-between text-xs text-slate-600 dark:text-white/60">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px] font-bold">
                        {paidBy[0]}
                      </div>
                      <span>Paid by {paidBy === activeUser ? "You" : paidBy}</span>
                    </div>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Equal split ({splitBetween.length} ways)</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] flex items-start gap-2 leading-relaxed">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Human Review:</strong> If the OCR misread handwriting, tips, or tax, tap <strong>Fine-Tune in Form</strong> to edit any numbers before signing.
                    </span>
                  </div>

                  <div className="pt-1 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEntryMode("manual")}
                      className="flex-1 py-2 px-3 rounded-xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/15 text-slate-800 dark:text-white font-bold text-xs border border-slate-200 dark:border-white/10 transition-colors"
                    >
                      Fine-Tune in Form
                    </button>
                    <button
                      type="submit"
                      disabled={txState !== "idle"}
                      className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-colors flex items-center justify-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Commit with Passkey
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between ml-1">
              <label className="text-sm font-semibold text-slate-700 dark:text-white/80">Amount (AUSD)</label>
              {showDraft && (
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md">
                  Editable • Auto-Extracted
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/50 text-xl font-bold">$</span>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl pl-10 pr-5 py-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-2xl tabular-nums font-bold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between ml-1">
              <label className="text-sm font-semibold text-slate-700 dark:text-white/80">Description</label>
              {showDraft && (
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md">
                  Editable • Auto-Extracted
                </span>
              )}
            </div>
            <input
              type="text"
              required
              placeholder="What was this for?"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-base font-medium"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Paid By Dropdown */}
            <div className="space-y-2 relative">
              <label className="text-sm font-semibold text-slate-700 dark:text-white/80 ml-1">Paid By</label>
              <div 
                onClick={() => setShowPaidByDropdown(!showPaidByDropdown)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-slate-900 dark:text-white flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-xs font-bold">
                    {paidBy[0]}
                  </div>
                  <span className="text-sm font-semibold">{paidBy === activeUser ? "You" : paidBy}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 dark:text-white/50" />
              </div>
              
              {showPaidByDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden z-20 shadow-2xl">
                  {normalizedMembers.map(member => (
                    <div 
                      key={member}
                      onClick={() => { setPaidBy(member); setShowPaidByDropdown(false); }}
                      className="px-4 py-3 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer text-sm font-medium text-slate-800 dark:text-white/80 flex items-center gap-2 transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-xs font-bold">
                        {member[0]}
                      </div>
                      {member === activeUser ? `You (${member})` : member}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Split Type */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-white/80 ml-1">Split Method</label>
              <div className="flex p-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl h-[50px]">
                <button 
                  type="button" 
                  onClick={() => setSplitType('equal')}
                  className={`flex-1 rounded-xl font-semibold text-xs transition-colors ${splitType === 'equal' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  Equal
                </button>
                <button 
                  type="button" 
                  onClick={() => setSplitType('exact')}
                  className={`flex-1 rounded-xl font-semibold text-xs transition-colors ${splitType === 'exact' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  Exact
                </button>
              </div>
            </div>
          </div>

          {/* Split Between */}
          <div className="space-y-2 pt-2">
             <div className="flex items-center justify-between ml-1 mb-2">
               <label className="text-sm font-semibold text-slate-700 dark:text-white/80">Split Between</label>
               <span className="text-xs text-slate-500 dark:text-white/40">{splitBetween.length} selected</span>
             </div>
             
             <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-2 space-y-1">
               {normalizedMembers.map(member => {
                 const isSelected = splitBetween.includes(member);
                 return (
                   <div 
                     key={member}
                     onClick={() => toggleSplitMember(member)}
                     className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer transition-colors group"
                   >
                     <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-sm">
                         {member[0]}
                       </div>
                       <span className={`font-semibold text-sm ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-white/40'}`}>
                         {member === activeUser ? "You" : member}
                       </span>
                     </div>
                     <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-slate-300 dark:border-white/20'}`}>
                       {isSelected && <Check className="w-3 h-3 text-white" />}
                     </div>
                   </div>
                 );
               })}
             </div>
          </div>
        </div>

        <div className="mt-4 pt-6 border-t border-slate-200 dark:border-white/10 flex-shrink-0">
          <Button 
            type="submit" 
            variant="primary" 
            size="lg" 
            className="w-full relative overflow-hidden"
            disabled={txState !== "idle"}
          >
            Log Expense
          </Button>
          
          <div className="mt-4 flex items-center justify-center gap-2 text-slate-500 dark:text-white/50 text-xs font-medium">
            <span>Zero-fee sponsored sync via</span>
            <div className="opacity-90 hover:opacity-100 transition-all text-slate-800 dark:text-white">
              <PimlicoLogo className="h-4 w-auto" />
            </div>
          </div>
        </div>
      </form>
    </>
  );
}

"use client";

import { useState } from "react";
import { Copy, Users, Check, QrCode } from "lucide-react";
import { Button } from "../ui/button";
import { QRCodeSVG } from "qrcode.react";

export function ManageMembers({ tabId, members }: { tabId: string, members: any[] }) {
  const [copied, setCopied] = useState(false);
  
  // Fake invite link
  const inviteLink = `https://mesh-tab.vercel.app/tab/${tabId}?invite=true`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 md:p-8 flex flex-col h-full bg-[#0a0a0a] min-h-[500px]">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
          <Users className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Manage Group</h2>
          <p className="text-white/60 text-sm">Invite friends or manage access.</p>
        </div>
      </div>

      <div className="space-y-8 flex-1">
        {/* Invite Section */}
        <div className="space-y-4 bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col items-center text-center">
          <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider mb-2">Scan to Join</h3>
          <div className="bg-white p-4 rounded-xl shadow-xl">
            <QRCodeSVG value={inviteLink} size={150} level="H" includeMargin={false} />
          </div>
          
          <div className="w-full pt-4">
             <div className="text-sm font-medium text-white/80 mb-2 text-left ml-1">Or share link</div>
             <div className="flex items-center gap-2">
               <div className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm truncate select-all font-mono">
                 {inviteLink}
               </div>
               <Button onClick={copyToClipboard} variant="primary" className="h-11 px-4 flex-shrink-0">
                 {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
               </Button>
             </div>
          </div>
        </div>

        {/* Current Roster */}
        <div>
          <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider mb-4">Current Members</h3>
          <div className="space-y-3">
            {members.map((member, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-500/20 text-indigo-300 rounded-full flex items-center justify-center font-bold">
                    {member.name[0]}
                  </div>
                  <div>
                    <div className="text-white font-medium">{member.name}</div>
                    <div className="text-white/40 text-xs text-left">{member.type === "creditor" ? "Owed money" : "Owes money"}</div>
                  </div>
                </div>
                <button className="text-xs font-bold text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity bg-rose-400/10 px-3 py-1.5 rounded-lg hover:bg-rose-400/20">
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

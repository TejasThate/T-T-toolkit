import React from 'react';

export function LiveBadge({ isLive, asOf }: { isLive: boolean, asOf?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${
        isLive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
      }`}>
        <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></div>
        {isLive ? 'LIVE' : 'DELAYED'}
      </div>
      {asOf && (
        <span className="text-[10px] text-slate-500 font-mono">
          As of {new Date(asOf).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}

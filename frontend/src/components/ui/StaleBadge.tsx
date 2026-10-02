import React from 'react';
import { Clock } from 'lucide-react';

export const StaleBadge = ({ lastUpdated }: { lastUpdated: string }) => {
  return (
    <div className="flex items-center space-x-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[10px] font-medium text-amber-400">
      <Clock size={10} />
      <span>Stale • updated {lastUpdated}</span>
    </div>
  );
};

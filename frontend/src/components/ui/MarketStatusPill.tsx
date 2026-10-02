import React, { useState, useEffect } from 'react';
import { getISTDateString } from '@/lib/format';

export const MarketStatusPill = ({ status = 'CLOSED' }: { status?: 'OPEN' | 'CLOSED' | 'PRE_OPEN' | 'HOLIDAY' }) => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(getISTDateString(new Date()).split(', ')[1]);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'OPEN': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'PRE_OPEN': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'CLOSED':
      case 'HOLIDAY': 
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border text-xs font-medium ${getStatusColor()}`}>
      <div className={`w-2 h-2 rounded-full ${status === 'OPEN' ? 'bg-emerald-400 animate-pulse' : status === 'PRE_OPEN' ? 'bg-amber-400' : 'bg-slate-400'}`} />
      <span>{status.replace('_', ' ')} • IST {time || '...'}</span>
    </div>
  );
};

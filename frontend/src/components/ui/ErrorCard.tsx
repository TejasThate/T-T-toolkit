import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const ErrorCard = ({ message, onRetry }: { message: string; onRetry?: () => void }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-center">
      <AlertCircle className="w-10 h-10 text-rose-400 mb-4" />
      <h3 className="text-lg font-semibold text-rose-200 mb-2">Failed to load data</h3>
      <p className="text-rose-300/80 mb-6 text-sm max-w-md">{message}</p>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="flex items-center space-x-2 px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg transition-colors text-sm font-medium"
        >
          <RefreshCw size={16} />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
};

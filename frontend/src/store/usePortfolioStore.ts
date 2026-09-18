import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface Holding {
  id: number;
  symbol: string;
  company_name: string;
  quantity: number;
  average_price: number;
  current_price?: number;
  currency: string;
}

interface PortfolioState {
  holdings: Holding[];
  totalValue: number;
  dailyPnl: number;
  overallPnl: number;
  isFetching: boolean;
  setHoldings: (holdings: Holding[]) => void;
  updateMarketPrices: (prices: Record<string, number>) => void;
  setIsFetching: (status: boolean) => void;
}

export const usePortfolioStore = create<PortfolioState>()(
  devtools(
    (set) => ({
      holdings: [],
      totalValue: 0,
      dailyPnl: 0,
      overallPnl: 0,
      isFetching: false,
      setIsFetching: (status) => set({ isFetching: status }, false, 'setIsFetching'),
      
      setHoldings: (newHoldings) => {
        set((state) => {
          // If we already have current prices, preserve them
          const holdingsWithPrices = newHoldings.map(h => {
            const existing = state.holdings.find(eh => eh.symbol === h.symbol);
            return {
              ...h,
              current_price: existing?.current_price || h.current_price || h.average_price
            };
          });
          
          return calculateTotals({ ...state, holdings: holdingsWithPrices });
        }, false, 'setHoldings');
      },
      
      updateMarketPrices: (prices) => {
        set((state) => {
          const updatedHoldings = state.holdings.map(h => {
            if (prices[h.symbol]) {
              return { ...h, current_price: prices[h.symbol] };
            }
            return h;
          });
          
          return calculateTotals({ ...state, holdings: updatedHoldings });
        }, false, 'updateMarketPrices');
      }
    }),
    { name: 'PortfolioStore' }
  )
);

// Helper function to recalculate P&L metrics
function calculateTotals(state: PortfolioState): Partial<PortfolioState> {
  let totalVal = 0;
  let overallPnl = 0;
  // Let's assume dailyPnl requires previous close which we don't store yet,
  // so we'll just simulate it or set to 0 for now.
  
  state.holdings.forEach(h => {
    const currentPrice = h.current_price || h.average_price;
    const value = currentPrice * h.quantity;
    const cost = h.average_price * h.quantity;
    
    totalVal += value;
    overallPnl += (value - cost);
  });
  
  return {
    holdings: state.holdings,
    totalValue: totalVal,
    overallPnl: overallPnl,
    // dailyPnl computation can be expanded if historical prices are added
  };
}

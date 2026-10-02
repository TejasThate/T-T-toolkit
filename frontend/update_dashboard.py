import re

content = open('src/components/DashboardLayout.tsx', 'r', encoding='utf-8').read()

repl = '''import { FlashingPrice } from './ui/FlashingPrice';
import { LiveBadge } from './ui/LiveBadge';
import { useMarketDataSync } from '../hooks/useMarketDataSync';'''

if 'import { FlashingPrice }' not in content:
    content = content.replace("import { useMarketDataSync } from '../hooks/useMarketDataSync';", repl)

content = content.replace(
    '''<div className="text-sm font-mono font-bold text-white tracking-tight">₹{item?.price?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>''',
    '''<FlashingPrice price={item?.price} className="text-sm font-mono font-bold text-white tracking-tight block" />'''
)

# Add LiveBadge to Live Markets
if 'Live Markets' in content and '<LiveBadge' not in content:
    content = content.replace(
        '''<h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Live Markets</h3>''',
        '''<div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Live Markets</h3>
              <LiveBadge isLive={true} asOf={marketData?.as_of as string | undefined} />
            </div>'''
    )

open('src/components/DashboardLayout.tsx', 'w', encoding='utf-8').write(content)

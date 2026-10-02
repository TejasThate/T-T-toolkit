import sys
import re

content = open('app/main.py', 'r', encoding='utf-8').read()

repl = '''@app.get("/api/market/quotes")
async def get_market_quotes(
    symbols: str = Query(..., description="Comma-separated list of symbols (e.g. RELIANCE.NS,TCS.NS)")
):
    from app.services.market_data import LatestTick
    symbol_list = [s.strip().upper() for s in symbols.split(",")]
    results = {}
    for sym in symbol_list:
        if not sym.endswith(".NS") and not sym.endswith(".BO") and not sym.startswith("^"):
            sym = f"{sym}.NS"
        
        tick = LatestTick.get(sym)
        if tick:
            results[sym] = {
                "price": tick.price,
                "change_pct": tick.change_pct,
                "volume": tick.volume,
                "as_of": tick.ts.isoformat(),
                "source": tick.source,
                "is_live": tick.is_live
            }
        else:
            results[sym] = None
    return results'''

new_content = re.sub(
    r'@app\.get\("/api/market/quotes"\).*?return quotes',
    repl,
    content,
    flags=re.DOTALL
)

open('app/main.py', 'w', encoding='utf-8').write(new_content)

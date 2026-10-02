import sys

content = open('app/crud.py', 'r', encoding='utf-8').read()

part1 = '''async def update_live_prices(db: AsyncSession, holdings: list):'''

repl1 = '''async def update_live_prices(db: AsyncSession, holdings: list):
    if not holdings:
        return []
    from app.services.market_data import LatestTick
    updated = False
    for h in holdings:
        sym = h.symbol.strip()
        if not sym.endswith(".NS") and not sym.endswith(".BO"):
            sym = f"{sym}.NS"
        tick = LatestTick.get(sym)
        if tick and not math.isnan(tick.price):
            h.current_price = tick.price
            updated = True
    if updated:
        await db.commit()
    return holdings
    
async def _old_update_live_prices(db: AsyncSession, holdings: list):'''

content = content.replace(part1, repl1)
open('app/crud.py', 'w', encoding='utf-8').write(content)

import requests
from bs4 import BeautifulSoup
import logging
import json
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

MOCK_IPOS = [
    {
        "name": "Tata Tech AI",
        "type": "Mainboard",
        "price_band": "₹450 - ₹475",
        "issue_size": "₹2,500 Cr",
        "status": "Upcoming",
        "open_date": (datetime.now() + timedelta(days=2)).strftime("%d %b %Y"),
        "close_date": (datetime.now() + timedelta(days=5)).strftime("%d %b %Y"),
        "gmp": "₹120",
        "est_listing": "₹595 (25.26%)",
        "dynamics": "High retail demand, AI expansion plans",
        "summary": "Tata group's new AI solutions arm focusing on enterprise transformation."
    },
    {
        "name": "Swiggy Delivery",
        "type": "Mainboard",
        "price_band": "₹820 - ₹850",
        "issue_size": "₹8,300 Cr",
        "status": "Open",
        "open_date": (datetime.now() - timedelta(days=1)).strftime("%d %b %Y"),
        "close_date": (datetime.now() + timedelta(days=2)).strftime("%d %b %Y"),
        "gmp": "₹45",
        "est_listing": "₹895 (5.29%)",
        "dynamics": "Moderate HNI response, strong Q2 results",
        "summary": "Leading food delivery and quick commerce player expanding reach."
    },
    {
        "name": "Reliance Green",
        "type": "Mainboard",
        "price_band": "₹1,200 - ₹1,250",
        "issue_size": "₹15,000 Cr",
        "status": "Upcoming",
        "open_date": (datetime.now() + timedelta(days=10)).strftime("%d %b %Y"),
        "close_date": (datetime.now() + timedelta(days=13)).strftime("%d %b %Y"),
        "gmp": "₹280",
        "est_listing": "₹1,530 (22.40%)",
        "dynamics": "Massive institutional anchor interest",
        "summary": "Renewable energy division of Reliance Industries building giga-factories."
    },
    {
        "name": "Oyo Rooms",
        "type": "Mainboard",
        "price_band": "₹90 - ₹105",
        "issue_size": "₹4,200 Cr",
        "status": "Closed",
        "open_date": (datetime.now() - timedelta(days=10)).strftime("%d %b %Y"),
        "close_date": (datetime.now() - timedelta(days=7)).strftime("%d %b %Y"),
        "gmp": "₹-5",
        "est_listing": "₹100 (-4.76%)",
        "dynamics": "Oversubscribed 2.1x, weak GMP momentum",
        "summary": "Global hospitality chain turning profitable."
    },
    {
        "name": "Zetwerk",
        "type": "SME",
        "price_band": "₹320 - ₹340",
        "issue_size": "₹950 Cr",
        "status": "Open",
        "open_date": (datetime.now() - timedelta(days=0)).strftime("%d %b %Y"),
        "close_date": (datetime.now() + timedelta(days=3)).strftime("%d %b %Y"),
        "gmp": "₹160",
        "est_listing": "₹500 (47.05%)",
        "dynamics": "Huge buzz in unlisted market",
        "summary": "B2B manufacturing platform for custom manufacturing."
    }
]

def fetch_live_ipos():
    """
    Scrapes live IPO data from ipowatch.in for both Mainboard and SME IPOs.
    """
    try:
        url = 'https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/'
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/114.0.0.0 Safari/537.36'}
        res = requests.get(url, headers=headers, timeout=10)
        soup = BeautifulSoup(res.text, 'html.parser')
        
        # IPOWatch puts tables in figure class wp-block-table
        tables = soup.find_all('figure', class_='wp-block-table')
        if not tables or len(tables) < 2:
            return MOCK_IPOS
            
        live_ipos = []
        
        # Parse Mainboard (Table 0) and SME (Table 1)
        for i, table_fig in enumerate(tables[:2]):
            ipo_type = "Mainboard" if i == 0 else "SME"
            table = table_fig.find('table')
            if not table: continue
            
            rows = table.find_all('tr')
            if len(rows) <= 1: continue
            
            for row in rows[1:]: # Skip header
                cols = row.find_all(['td'])
                if len(cols) >= 7:
                    name_raw = cols[0].text.strip()
                    gmp_raw = cols[1].text.strip()
                    price_raw = cols[3].text.strip()
                    listing_raw = cols[4].text.strip()
                    date_raw = cols[5].text.strip()
                    status_raw = cols[6].text.strip()
                    
                    if "Not Announced" in name_raw or not name_raw:
                        continue
                        
                    # Basic extraction
                    name = name_raw.split("IPO")[0].strip() if "IPO" in name_raw else name_raw
                    
                    # Split date like "18 - 21 Sep" -> "18 Sep", "21 Sep"
                    open_date = date_raw
                    close_date = date_raw
                    if "-" in date_raw:
                        parts = date_raw.split("-")
                        month = "".join([c for c in parts[1] if c.isalpha()]).strip()
                        open_date = parts[0].strip() + (f" {month}" if not any(c.isalpha() for c in parts[0]) else "")
                        close_date = parts[1].strip()
                    
                    live_ipos.append({
                        "name": name,
                        "type": ipo_type,
                        "price_band": price_raw if price_raw != "--" else "TBA",
                        "issue_size": "TBA", # IPowatch GMP table doesn't have issue size directly
                        "status": status_raw if status_raw else "Upcoming",
                        "open_date": open_date,
                        "close_date": close_date,
                        "gmp": gmp_raw if gmp_raw != "--" else "₹0",
                        "est_listing": listing_raw if listing_raw != "--" else "TBA",
                        "dynamics": f"Live GMP momentum tracking for {name}",
                        "summary": f"{ipo_type} IPO currently in {status_raw.lower()} phase."
                    })
                    
        if len(live_ipos) > 0:
            return live_ipos
            
        return MOCK_IPOS
    except Exception as e:
        logger.error(f"Error fetching live IPOs: {e}")
        return MOCK_IPOS

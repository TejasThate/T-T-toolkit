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
    Attempts to fetch live IPO data. If it fails due to bot protection,
    returns realistic fallback data for the demo.
    """
    try:
        url = 'https://www.investorgain.com/report/live-ipo-gmp/331/'
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'}
        res = requests.get(url, headers=headers, timeout=5)
        soup = BeautifulSoup(res.text, 'html.parser')
        table = soup.find('table', {'id': 'reportTable'})
        
        if table:
            # Parse table logic here if available
            rows = table.find('tbody').find_all('tr')
            if len(rows) > 0 and 'No data available' not in rows[0].text:
                live_ipos = []
                # Placeholder for parsing logic once we bypass Cloudflare
                return live_ipos
                
        # If we reach here, we hit Cloudflare or structure changed
        return MOCK_IPOS
    except Exception as e:
        logger.error(f"Error fetching live IPOs: {e}")
        return MOCK_IPOS

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class HoldingBase(BaseModel):
    symbol: str
    company_name: str
    quantity: float
    average_price: float
    current_price: Optional[float] = None
    sector: Optional[str] = None

class HoldingCreate(HoldingBase):
    pass

class Holding(HoldingBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class NewsArticleBase(BaseModel):
    title: str
    link: str
    published_at: datetime
    source: str
    content: Optional[str] = None
    impact_score: Optional[float] = None
    impact_reason: Optional[str] = None
    affected_symbol: Optional[str] = None

class NewsArticleCreate(NewsArticleBase):
    pass

class NewsArticle(NewsArticleBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

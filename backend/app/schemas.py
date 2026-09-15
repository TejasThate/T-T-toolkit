from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class UserCreate(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class GoogleLoginRequest(BaseModel):
    credential: str

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

class ChatMessageBase(BaseModel):
    role: str
    content: str

class ChatMessageCreate(ChatMessageBase):
    pass

class ChatMessage(ChatMessageBase):
    id: int
    session_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ChatSessionBase(BaseModel):
    title: Optional[str] = None

class ChatSessionCreate(ChatSessionBase):
    pass

class ChatSession(ChatSessionBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    messages: List[ChatMessage] = []

    class Config:
        from_attributes = True

class AlertBase(BaseModel):
    symbol: str
    condition: str
    target_value: float
    is_active: int = 1

class AlertCreate(AlertBase):
    pass

class Alert(AlertBase):
    id: int
    user_id: int
    created_at: datetime
    triggered_at: Optional[datetime] = None

    class Config:
        from_attributes = True

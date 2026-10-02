import sys
content = open('app/models.py', 'r', encoding='utf-8').read()

part1 = """from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.sql import func
from .database import Base
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.sql import func
from .database import Base"""

part1_repl = """from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Index
from sqlalchemy.sql import func
from .database import Base"""

content = content.replace(part1, part1_repl)

part2 = """class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, index=True)
    role = Column(String) # 'user' or 'assistant'
    content = Column(Text)
    created_at = Column(DateTime, server_default=func.now())"""

part2_repl = """class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, index=True)
    role = Column(String) # 'user' or 'assistant'
    content = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index('idx_chat_msg_session_time', 'session_id', 'created_at'),
    )"""

content = content.replace(part2, part2_repl)

part3 = """    confidence = Column(Float, nullable=True)
    reason = Column(String, nullable=True)
    scored_by = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())"""

part3_repl = """    confidence = Column(Float, nullable=True)
    reason = Column(String, nullable=True)
    scored_by = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index('idx_news_items_time_symbol', 'published_at', 'symbols'),
    )"""
content = content.replace(part3, part3_repl)

open('app/models.py', 'w', encoding='utf-8').write(content)

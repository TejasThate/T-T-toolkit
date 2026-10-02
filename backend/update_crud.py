import sys
content = open('app/crud.py', 'r', encoding='utf-8').read()

replacements = [
    (
        "async def get_holdings(db: AsyncSession, user_id: int):",
        "async def get_holdings(db: AsyncSession, user_id: int, limit: int = 50, offset: int = 0):"
    ),
    (
        "result = await db.execute(select(models.Holding).where(models.Holding.user_id == user_id))",
        "result = await db.execute(select(models.Holding).where(models.Holding.user_id == user_id).limit(limit).offset(offset))"
    ),
    (
        "async def get_news_articles(db: AsyncSession, limit: int = 50):",
        "async def get_news_articles(db: AsyncSession, limit: int = 50, offset: int = 0):"
    ),
    (
        "result = await db.execute(select(models.NewsArticle).order_by(models.NewsArticle.published_at.desc()).limit(limit))",
        "result = await db.execute(select(models.NewsArticle).order_by(models.NewsArticle.published_at.desc()).limit(limit).offset(offset))"
    ),
    (
        "async def get_chat_sessions(db: AsyncSession, user_id: int):",
        "async def get_chat_sessions(db: AsyncSession, user_id: int, limit: int = 50, offset: int = 0):"
    ),
    (
        "result = await db.execute(select(models.ChatSession).where(models.ChatSession.user_id == user_id).order_by(models.ChatSession.updated_at.desc()))",
        "result = await db.execute(select(models.ChatSession).where(models.ChatSession.user_id == user_id).order_by(models.ChatSession.updated_at.desc()).limit(limit).offset(offset))"
    ),
    (
        "async def get_chat_messages(db: AsyncSession, session_id: int):",
        "async def get_chat_messages(db: AsyncSession, session_id: int, limit: int = 50, offset: int = 0):"
    ),
    (
        "result = await db.execute(select(models.ChatMessage).where(models.ChatMessage.session_id == session_id).order_by(models.ChatMessage.created_at.asc()))",
        "result = await db.execute(select(models.ChatMessage).where(models.ChatMessage.session_id == session_id).order_by(models.ChatMessage.created_at.asc()).limit(limit).offset(offset))"
    ),
    (
        "async def get_alerts(db: AsyncSession, user_id: int):",
        "async def get_alerts(db: AsyncSession, user_id: int, limit: int = 50, offset: int = 0):"
    ),
    (
        "result = await db.execute(select(models.Alert).where(models.Alert.user_id == user_id).order_by(models.Alert.created_at.desc()))",
        "result = await db.execute(select(models.Alert).where(models.Alert.user_id == user_id).order_by(models.Alert.created_at.desc()).limit(limit).offset(offset))"
    )
]

for old, new in replacements:
    content = content.replace(old, new)

open('app/crud.py', 'w', encoding='utf-8').write(content)

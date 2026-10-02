import sys
import glob

files = glob.glob("app/routers/*.py")

for file in files:
    content = open(file, 'r', encoding='utf-8').read()
    
    # Portfolio get_holdings
    content = content.replace(
        "def get_holdings(current_user: schemas.User = Depends(auth.get_current_user), db: AsyncSession = Depends(get_db)):",
        "def get_holdings(limit: int = 50, offset: int = 0, current_user: schemas.User = Depends(auth.get_current_user), db: AsyncSession = Depends(get_db)):"
    )
    content = content.replace(
        "return await crud.get_holdings(db, current_user.id)",
        "return await crud.get_holdings(db, current_user.id, limit, offset)"
    )
    
    # News get_news
    content = content.replace(
        "def get_news(category: str = Query(\"All\"), current_user: schemas.User = Depends(auth.get_current_user), db: AsyncSession = Depends(get_db)):",
        "def get_news(category: str = Query(\"All\"), limit: int = 50, offset: int = 0, current_user: schemas.User = Depends(auth.get_current_user), db: AsyncSession = Depends(get_db)):"
    )
    content = content.replace(
        "articles = await crud.get_news_articles(db)",
        "articles = await crud.get_news_articles(db, limit, offset)"
    )
    
    # Chat get_chat_history
    content = content.replace(
        "def get_chat_history(session_id: int, current_user: schemas.User = Depends(auth.get_current_user), db: AsyncSession = Depends(get_db)):",
        "def get_chat_history(session_id: int, limit: int = 50, offset: int = 0, current_user: schemas.User = Depends(auth.get_current_user), db: AsyncSession = Depends(get_db)):"
    )
    content = content.replace(
        "return await crud.get_chat_messages(db, session_id)",
        "return await crud.get_chat_messages(db, session_id, limit, offset)"
    )
    
    # Alerts get_alerts
    content = content.replace(
        "def get_alerts(current_user: schemas.User = Depends(auth.get_current_user), db: AsyncSession = Depends(get_db)):",
        "def get_alerts(limit: int = 50, offset: int = 0, current_user: schemas.User = Depends(auth.get_current_user), db: AsyncSession = Depends(get_db)):"
    )
    content = content.replace(
        "return await crud.get_alerts(db, current_user.id)",
        "return await crud.get_alerts(db, current_user.id, limit, offset)"
    )

    open(file, 'w', encoding='utf-8').write(content)

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app import models, schemas, crud

# Use in-memory sqlite for tests
SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

@pytest_asyncio.fixture(scope="function")
async def db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with TestingSessionLocal() as session:
        yield session
        
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.mark.asyncio
async def test_create_and_get_chat_session(db: AsyncSession):
    user_id = 1
    session = await crud.create_chat_session(db, user_id=user_id, title="Test Session")
    assert session.id is not None
    assert session.title == "Test Session"
    
    sessions = await crud.get_chat_sessions(db, user_id=user_id)
    assert len(sessions) == 1
    assert sessions[0].id == session.id

@pytest.mark.asyncio
async def test_create_chat_message(db: AsyncSession):
    session = await crud.create_chat_session(db, user_id=1, title="Test Session")
    msg_in = schemas.ChatMessageCreate(role="user", content="Hello!")
    
    msg = await crud.create_chat_message(db, session_id=session.id, message=msg_in)
    assert msg.id is not None
    assert msg.content == "Hello!"
    
    messages = await crud.get_chat_messages(db, session_id=session.id)
    assert len(messages) == 1
    assert messages[0].content == "Hello!"

@pytest.mark.asyncio
async def test_alerts_crud(db: AsyncSession):
    user_id = 1
    alert_in = schemas.AlertCreate(symbol="AAPL", condition="price_above", target_value=150.0)
    
    alert = await crud.create_alert(db, user_id, alert_in)
    assert alert.id is not None
    assert alert.symbol == "AAPL"
    
    alerts = await crud.get_alerts(db, user_id)
    assert len(alerts) == 1
    
    deleted = await crud.delete_alert(db, alert_id=alert.id, user_id=user_id)
    assert deleted is True
    
    alerts_after = await crud.get_alerts(db, user_id)
    assert len(alerts_after) == 0

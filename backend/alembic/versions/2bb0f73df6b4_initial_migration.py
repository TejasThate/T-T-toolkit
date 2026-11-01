"""Initial migration

Revision ID: 2bb0f73df6b4
Revises: 63f039062a2f
Create Date: 2026-10-02 13:02:55.680819

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2bb0f73df6b4'
down_revision: Union[str, Sequence[str], None] = '63f039062a2f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'chat_messages' in tables:
        with op.batch_alter_table('chat_messages', schema=None) as batch_op:
            indexes = [idx['name'] for idx in inspector.get_indexes('chat_messages')]
            if 'idx_chat_msg_session_time' not in indexes:
                batch_op.create_index('idx_chat_msg_session_time', ['session_id', 'created_at'], unique=False)

    if 'news_items' not in tables:
        op.create_table(
            'news_items',
            sa.Column('id', sa.Integer(), primary_key=True, index=True),
            sa.Column('url_hash', sa.String(), unique=True, index=True),
            sa.Column('title', sa.String(), nullable=True),
            sa.Column('source', sa.String(), nullable=True),
            sa.Column('url', sa.String(), nullable=True),
            sa.Column('published_at', sa.DateTime(), nullable=True),
            sa.Column('snippet', sa.Text(), nullable=True),
            sa.Column('symbols', sa.JSON(), nullable=True),
            sa.Column('sentiment', sa.Float(), nullable=True),
            sa.Column('impact', sa.Float(), nullable=True),
            sa.Column('category', sa.String(), nullable=True),
            sa.Column('horizon', sa.String(), nullable=True),
            sa.Column('confidence', sa.Float(), nullable=True),
            sa.Column('reason', sa.String(), nullable=True),
            sa.Column('scored_by', sa.String(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=True)
        )
    
    with op.batch_alter_table('news_items', schema=None) as batch_op:
        indexes = [idx['name'] for idx in sa.inspect(conn).get_indexes('news_items')]
        if 'idx_news_items_time_symbol' not in indexes:
            batch_op.create_index('idx_news_items_time_symbol', ['published_at', 'symbols'], unique=False)

    if 'instruments' not in tables:
        op.create_table(
            'instruments',
            sa.Column('symbol', sa.String(), primary_key=True, index=True),
            sa.Column('token', sa.String(), index=True, nullable=True),
            sa.Column('exchange', sa.String(), default="NSE", nullable=True),
            sa.Column('name', sa.String(), nullable=True),
            sa.Column('isin', sa.String(), nullable=True),
            sa.Column('sector', sa.String(), nullable=True),
            sa.Column('industry', sa.String(), nullable=True),
            sa.Column('indices', sa.JSON(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=True)
        )


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'instruments' in tables:
        op.drop_table('instruments')

    if 'news_items' in tables:
        with op.batch_alter_table('news_items', schema=None) as batch_op:
            batch_op.drop_index('idx_news_items_time_symbol')
        op.drop_table('news_items')

    if 'chat_messages' in tables:
        with op.batch_alter_table('chat_messages', schema=None) as batch_op:
            batch_op.drop_index('idx_chat_msg_session_time')

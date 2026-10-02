import sys

content = open('app/database.py', 'r', encoding='utf-8').read()

part1 = """connect_args = {}
# SQLite requires check_same_thread=False
if "sqlite" in DATABASE_URL:
    connect_args = {"check_same_thread": False}

engine = create_async_engine(SQLALCHEMY_DATABASE_URL, echo=True, connect_args=connect_args)"""

part1_repl = """connect_args = {}
pool_kwargs = {}

# SQLite requires check_same_thread=False
if "sqlite" in DATABASE_URL:
    connect_args = {"check_same_thread": False}
else:
    # Postgres pool settings
    pool_kwargs = {
        "pool_size": 5,
        "max_overflow": 5,
        "pool_pre_ping": True,
        "pool_recycle": 300,
    }

engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL, 
    echo=True, 
    connect_args=connect_args,
    **pool_kwargs
)"""

content = content.replace(part1, part1_repl)
open('app/database.py', 'w', encoding='utf-8').write(content)

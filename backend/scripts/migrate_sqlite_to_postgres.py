import asyncio
import os
import sys
import argparse
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.database import Base

async def main():
    parser = argparse.ArgumentParser(description="Migrate data from SQLite to Postgres")
    parser.add_argument("--sqlite", type=str, default="sqlite+aiosqlite:///./tandt.db", help="SQLite URL")
    parser.add_argument("--postgres", type=str, required=True, help="Postgres URL (postgresql+asyncpg://...)")
    
    args = parser.parse_args()
    
    sqlite_url = args.sqlite
    pg_url = args.postgres
    
    print(f"Connecting to SQLite: {sqlite_url}")
    sqlite_engine = create_async_engine(sqlite_url)
    
    print(f"Connecting to Postgres: {pg_url}")
    pg_engine = create_async_engine(pg_url)
    
    # Introspect tables from metadata
    tables = Base.metadata.sorted_tables
    
    async with sqlite_engine.connect() as sqlite_conn:
        async with pg_engine.begin() as pg_conn: # begin() handles commit automatically
            for table in tables:
                print(f"Migrating table {table.name}...")
                
                # Fetch all rows from sqlite
                result = await sqlite_conn.execute(text(f'SELECT * FROM "{table.name}"'))
                rows = result.fetchall()
                
                if not rows:
                    print(f"  -> Table {table.name} is empty, skipping.")
                    continue
                    
                # Insert rows into postgres
                # Using SQLAlchemy's bulk insert
                keys = result.keys()
                dicts = [dict(zip(keys, row)) for row in rows]
                
                # Delete existing rows to avoid conflicts
                await pg_conn.execute(table.delete())
                
                # Perform insert
                await pg_conn.execute(table.insert(), dicts)
                
                print(f"  -> Migrated {len(rows)} rows to {table.name}.")
                
    print("Migration complete!")
    
if __name__ == "__main__":
    asyncio.run(main())

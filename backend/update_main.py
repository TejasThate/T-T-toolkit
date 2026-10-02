import sys
content = open('app/main.py', 'r', encoding='utf-8').read()

import_part = """import time
import logging
import os
from fastapi import Request"""

import_part_repl = """import time
import logging
import os
import json
from fastapi import Request
from fastapi.middleware.gzip import GZipMiddleware"""

content = content.replace(import_part, import_part_repl)

cors_part = """app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://t-t-toolkit.vercel.app", # Adjust if there's a different primary production domain
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Retry-After", "ETag"],
)"""

cors_part_repl = """app.add_middleware(GZipMiddleware, minimum_size=1000)

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,https://t-t-toolkit.vercel.app").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Retry-After", "ETag"],
)"""

content = content.replace(cors_part, cors_part_repl)
open('app/main.py', 'w', encoding='utf-8').write(content)

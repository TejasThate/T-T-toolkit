import sys
import re

content = open('app/main.py', 'r', encoding='utf-8').read()

new_content = re.sub(
    r'@app\.post\("/api/ai/chat"\).*?raise HTTPException\(status_code=500, detail=str\(e\)\)',
    '',
    content,
    flags=re.DOTALL
)

open('app/main.py', 'w', encoding='utf-8').write(new_content)

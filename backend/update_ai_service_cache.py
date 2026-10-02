import sys
import re

content = open('app/services/ai_service.py', 'r', encoding='utf-8').read()

import_statement = "import hashlib\nimport time\n\n_prompt_cache = {}\n\n"
if "import hashlib" not in content:
    content = content.replace("import os\n", "import os\n" + import_statement)

func_start = "async def generate_chat_stream(\n    messages: list, \n    portfolio_summary: str,\n    db: AsyncSession\n) -> AsyncGenerator[str, None]:"

repl = """async def generate_chat_stream(
    messages: list, 
    portfolio_summary: str,
    db: AsyncSession
) -> AsyncGenerator[str, None]:
    if not os.getenv("GROQ_API_KEY"):
        yield "data: {\\\"text\\\": \\\"GROQ_API_KEY is not configured.\\\"}\\n\\n"
        return

    # Check cache first
    last_query = messages[-1]["content"] if messages else ""
    prompt_hash = hashlib.md5((last_query + portfolio_summary).encode()).hexdigest()
    
    if prompt_hash in _prompt_cache:
        cached_item = _prompt_cache[prompt_hash]
        if time.time() < cached_item["expires_at"]:
            yield f"data: {{ \\\"text\\\": \\\"{cached_item['response']}\\\" }}\\n\\n"
            return
        else:
            del _prompt_cache[prompt_hash]

    model_type = "smart" if "deep analysis" in last_query.lower() or "analyze deeply" in last_query.lower() else "fast"
    
    # 20s hard timeout is handled mostly by httpx/langchain default or we can wrap asyncio.wait_for
    llm = get_llm(model_type=model_type, streaming=True)
    llm_with_tools = llm.bind_tools(TOOLS)
    
    sys_prompt = f\"\"\"You are a helpful, blazing fast Indian stock market AI assistant.
Keep answers concise (max 3 sentences unless asked for deep analysis).
Use the available tools if the user asks for real-time prices or news.
User Portfolio Summary:
{portfolio_summary}
\"\"\"
    
    langchain_msgs = [SystemMessage(content=sys_prompt)]
    recent_messages = messages[-6:]
    for m in recent_messages:
        if m["role"] == "user":
            langchain_msgs.append(HumanMessage(content=m["content"]))
        else:
            langchain_msgs.append(AIMessage(content=m["content"]))
            
    try:
        full_response = ""
        # Adding a 20s hard timeout
        async def fetch_stream():
            nonlocal full_response
            async for chunk in llm_with_tools.astream(langchain_msgs):
                if chunk.content:
                    full_response += chunk.content
                    yield f"data: {json.dumps({'text': chunk.content})}\\n\\n"
                
        import asyncio
        # We can't easily wait_for a whole generator without wrapping it carefully.
        # But we can just use the standard generator.
        async for chunk in fetch_stream():
            yield chunk
            
        if full_response:
            _prompt_cache[prompt_hash] = {
                "response": full_response.replace('"', '\\"'),
                "expires_at": time.time() + 300 # 5 minutes
            }
    except Exception as e:
        logger.error(f"Chat stream error: {e}")
        yield f"data: {json.dumps({'text': f'Error: {e}'})}\\n\\n\"\"\""

new_content = re.sub(
    r'async def generate_chat_stream\(.*?yield f"data: \{json\.dumps\(\{\'text\': f\'Error: \{e\}\'\}\)\}\\n\\n"',
    repl,
    content,
    flags=re.DOTALL
)

open('app/services/ai_service.py', 'w', encoding='utf-8').write(new_content)

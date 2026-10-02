import sys
import re

content = open('app/main.py', 'r', encoding='utf-8').read()

repl = '''@app.post("/auth/google", response_model=schemas.Token)
async def google_login(req: GoogleAuthCodeRequest, db: AsyncSession = Depends(get_db)):
    try:
        import asyncio
        loop = asyncio.get_running_loop()
        try:
            token_info = await loop.run_in_executor(None, auth.exchange_google_code, req.code)
        except Exception as flow_err:
            error_str = str(flow_err).lower()
            if 'invalid_grant' in error_str or 'bad request' in error_str:
                raise HTTPException(status_code=400, detail="invalid_grant: The auth code is invalid or expired.")
            elif 'redirect_uri_mismatch' in error_str:
                raise HTTPException(status_code=400, detail="redirect_uri_mismatch: Ensure frontend and backend use 'postmessage'.")
            else:
                raise HTTPException(status_code=400, detail=f"Google OAuth Error: {str(flow_err)}")

        idinfo = token_info.get("idinfo", {})
        email = idinfo.get("email")
        if not email:
            raise HTTPException(status_code=400, detail="Google token missing email")

        result = await db.execute(select(models.User).where(models.User.email == email))
        user = result.scalars().first()
        
        if not user:
            import secrets
            hashed_password = auth.get_password_hash(secrets.token_urlsafe(16))
            user = models.User(email=email, hashed_password=hashed_password)
            db.add(user)
        
        await db.commit()
        await db.refresh(user)

        # Save tokens
        token_result = await db.execute(select(models.OAuthToken).where(
            models.OAuthToken.user_id == user.id,
            models.OAuthToken.provider == 'google'
        ))
        oauth_token = token_result.scalars().first()
        
        if not oauth_token:
            oauth_token = models.OAuthToken(user_id=user.id, provider='google')
            db.add(oauth_token)
            
        oauth_token.access_token = auth.encrypt_data(token_info["access_token"])
        if token_info.get("refresh_token"):
            oauth_token.refresh_token = auth.encrypt_data(token_info["refresh_token"])
            
        await db.commit()
            
        access_token = auth.create_access_token(data={"sub": user.email})
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        print(f"Server error: {error_msg}")
        raise HTTPException(status_code=400, detail=f"Login Error: {str(e)}")'''

# We will regex replace from `@app.post("/auth/google", response_model=schemas.Token)` 
# down to the end of `google_login_code`.
# But `main.py` might be large, let's build a regex carefully.

new_content = re.sub(
    r'@app\.post\("/auth/google", response_model=schemas\.Token\).*?def google_login_code.*?raise HTTPException\(status_code=400, detail=f"Login Error: \{str\(e\)\}"\)',
    repl,
    content,
    flags=re.DOTALL
)

open('app/main.py', 'w', encoding='utf-8').write(new_content)

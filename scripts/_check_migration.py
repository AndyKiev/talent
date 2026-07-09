"""Quick check: see if the visibility columns exist in app_settings."""
import asyncio, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from backend.database.db_helper import db_helper
from sqlalchemy import text

async def check():
    async with db_helper.session_factory() as s:
        r = await s.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='app_settings' AND column_name IN ('visible_to_all_groups','visible_to_regular')"))
        cols = [row[0] for row in r.fetchall()]
        print("Columns found:", cols)
        r2 = await s.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name='app_setting_user_group_links')"))
        print("Link table exists:", bool(r2.scalar()))
        if cols:
            print("Migration IS applied ✓")
        else:
            print("Migration NOT applied ✗")

asyncio.run(check())

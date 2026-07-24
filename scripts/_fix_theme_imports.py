"""One-shot: rewrite all `useTheme` imports from ThemeContext to useTheme."""
import os
import re

ROOT = "frontend/src"

for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d != "node_modules"]
    for fn in filenames:
        if not fn.endswith((".tsx", ".ts")):
            continue
        fp = os.path.join(dirpath, fn)
        with open(fp, encoding="utf-8") as fh:
            content = fh.read()
        newc = re.sub(
            r"from\s+['\"]\.\.\/theme\/ThemeContext(?:\.tsx)?['\"]",
            "from '../theme/useTheme'",
            content,
        )
        newc = re.sub(
            r"from\s+['\"]\.\/ThemeContext(?:\.tsx)?['\"]",
            "from './useTheme'",
            newc,
        )
        # Also handle `../theme/ThemeContext.tsx` edge case
        newc = re.sub(
            r"from\s+['\"]\.\.\/theme\/ThemeContext\.tsx['\"]",
            "from '../theme/useTheme'",
            newc,
        )
        if newc != content:
            with open(fp, "w", encoding="utf-8") as fh:
                fh.write(newc)
            print(f"OK  {fp}")
# run FastAPI
run-backend:
	backend\.venv\Scripts\uvicorn backend.main:app --host 127.0.0.1 --port 8002 --reload

# run npm
run-frontend:
# 	cd frontend npx run dev -- --host 127.0.0.1 --mode development
	cd frontend && set VITE_BACKEND_API_URL=http://127.0.0.1:8002 && npm run dev -- --host 127.0.0.1 --mode development
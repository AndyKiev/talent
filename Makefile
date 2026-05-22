# run FastAPI
run-backend:
	uvicorn backend.main:app --host 127.0.0.1 --port 8004 --reload

# run npm
run-frontend:
	cd frontend && export VITE_BACKEND_API_URL=http://127.0.0.1:8004 && npm run dev -- --host 127.0.0.1
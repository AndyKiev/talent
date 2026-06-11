# start Postgres container (required for backend)
db-up:
	docker start talent-postgres-fresh

# stop Postgres container
db-down:
	docker stop talent-postgres-fresh

# start RabbitMQ broker container (only when RABBITMQ_ENABLED=true)
rabbit-up:
	docker start talent-rabbitmq

# stop RabbitMQ broker container
rabbit-down:
	docker stop talent-rabbitmq

# run FastAPI
run-backend:
	uvicorn backend.main:app --host 127.0.0.1 --port 8004 --reload

# run npm (VITE_BACKEND_API_URL comes from frontend/.env.development)
run-frontend:
	cd frontend && npm run dev -- --host 127.0.0.1
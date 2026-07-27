# start native Postgres (required for backend) - data in C:\Users\andre\PostgresData\talent
db-up:
	powershell -ExecutionPolicy Bypass -File scripts/db.ps1 start

# stop native Postgres
db-down:
	powershell -ExecutionPolicy Bypass -File scripts/db.ps1 stop

# is the database running?
db-status:
	powershell -ExecutionPolicy Bypass -File scripts/db.ps1 status

# start RabbitMQ broker container (only when RABBITMQ_ENABLED=true)
rabbit-up:
	docker start talent-rabbitmq

# stop RabbitMQ broker container
rabbit-down:
	docker stop talent-rabbitmq

# run FastAPI
run-backend:
	uvicorn backend.main:app --host 127.0.0.1 --port 8004 --reload

# run npm — 0.0.0.0 so phones/tablets on the same wifi can open http://<PC-IP>:4004
# (API calls stay relative and are proxied by vite to the localhost backend)
run-frontend:
	cd frontend && npm run dev -- --host 0.0.0.0
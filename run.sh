#!/bin/bash
set -e

echo "==> Pulling latest code..."
git pull

echo "==> Installing Python dependencies..."
source .venv/bin/activate
pip install -r requirements.txt

echo "==> Running database migrations..."
alembic upgrade head

echo "==> Building frontend..."
cd frontend && npm install && npm run build && cd ..

echo "==> Restarting services..."
sudo systemctl restart gin-rummy-backend
sudo systemctl restart gin-rummy-frontend

echo "==> Done."

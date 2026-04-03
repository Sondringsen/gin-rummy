# Gin Rummy

A web app for playing Gin Rummy with custom house rules. Supports multiplayer across multiple rounds with automatic scoring.

## Tech Stack

**Frontend**
- [Next.js 16](https://nextjs.org/) with TypeScript
- [Tailwind CSS v4](https://tailwindcss.com/)

**Backend**
- [FastAPI](https://fastapi.tiangolo.com/) with Pydantic
- [PostgreSQL](https://www.postgresql.org/) with SQLAlchemy ORM
- [Alembic](https://alembic.sqlalchemy.org/) for database migrations
- [pydantic-settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/) for configuration

## Project Structure

```
gin-rummy/
├── frontend/               # Next.js app
│   ├── app/
│   │   ├── page.tsx        # Home (redirects to /login if unauthenticated)
│   │   ├── login/          # Combined login / register page
│   │   └── game/[gameId]/  # Game page
│   └── lib/
│       ├── api.ts          # Game API calls
│       └── auth.ts         # JWT helpers
├── backend/
│   ├── modules/            # Modules
│   │   ├── models.py       # SQLAlchemy model
│   │   ├── schema.py       # Pydantic schemas
│   │   ├── service.py      # Database operations and business logic
│   │   └── router.py       # Api Routes
│   ├── config.py           # Settings (reads from .env)
│   ├── database.py         # SQLAlchemy engine and session
│   └── main.py             # FastAPI app, mounts both routers
├── alembic/                # Database migrations
│   └── versions/
├── alembic.ini
└── game/                   # Core game logic
```

## Getting Started

### 1. Environment

Copy the example below into a `.env` file in the project root:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gin_rummy
SECRET_KEY=change-this-secret-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
```

### 2. Backend

```bash
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start the server
uvicorn backend.main:app --reload
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Production Deployment

The app runs on AWS EC2 (Amazon Linux) with RDS PostgreSQL. No Docker — the backend is managed by systemd and traffic is routed through nginx.

### 1. Transfer environment file

```bash
# From local machine — renames .env.prod to .env on the server
scp -i ~/.ssh/<key>.pem .env.prod ec2-user@<ec2-ip>:/home/ec2-user/gin-rummy/.env
```

### 2. On the EC2 instance

```bash
# Install Python dependencies
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Install systemd services (backend + frontend)
sudo cp deploy/gin-rummy-backend.service /etc/systemd/system/
sudo cp deploy/gin-rummy-frontend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable gin-rummy-backend gin-rummy-frontend
sudo systemctl start gin-rummy-backend

# Install nginx config
sudo cp deploy/nginx.conf /etc/nginx/conf.d/gin-rummy.conf
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl start nginx

# Run DB migrations
alembic upgrade head

# Build frontend (must be done before starting the frontend service)
cd frontend && npm install && npm run build && cd ..

sudo systemctl start gin-rummy-frontend
```

> **Note:** Node.js is managed via nvm. The frontend service uses the full nvm path
> (`/home/ec2-user/.nvm/versions/node/v24.14.1/bin/npm`). If you upgrade Node, update
> `deploy/gin-rummy-frontend.service` to match.

### 3. HTTPS / SSL (first time only)

**1. Open port 443 in your AWS Security Group**

In the AWS Console → EC2 → Security Groups → your instance's SG → add an inbound rule: HTTPS (443) from 0.0.0.0/0.

**2. Install Certbot on the EC2 instance**

```bash
sudo dnf install -y certbot python3-certbot-nginx   # Amazon Linux 2023
# or for Amazon Linux 2:
# sudo amazon-linux-extras install epel -y && sudo yum install -y certbot python3-certbot-nginx
```

**3. Copy the updated nginx.conf to the server**

```bash
sudo cp nginx.conf /etc/nginx/conf.d/gin-rummy.conf
sudo nginx -t && sudo systemctl reload nginx
```

**4. Obtain the SSL certificate**

```bash
sudo certbot --nginx -d ginrummycards.com -d www.ginrummycards.com
```

Certbot will verify ownership via the `.well-known/acme-challenge/` path and install the cert. Follow the prompts (enter your email for renewal notices).

**5. Set up auto-renewal**

```bash
sudo systemctl enable --now certbot-renew.timer
# Verify it works:
sudo certbot renew --dry-run
```

### Redeploying

```bash
./run.sh
```

This pulls the latest code, installs dependencies, runs database migrations, rebuilds the frontend, and restarts both services.

### Logs

```bash
journalctl -u gin-rummy-backend -f
journalctl -u gin-rummy-frontend -f
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account, returns JWT |
| POST | `/api/auth/login` | Sign in, returns JWT |
| POST | `/api/game/` | Create a new game |
| GET | `/api/game/{id}/state` | Get game state |
| POST | `/api/game/{id}/...` | Game actions (draw, discard, open, ...) |

## Game Rules

See [CLAUDE.md](CLAUDE.md) for a full description of the game rules and round structure.

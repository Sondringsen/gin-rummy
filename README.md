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

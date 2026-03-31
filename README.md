# Gin Rummy

A web app for playing Gin Rummy with custom house rules. Supports multiplayer across multiple rounds with automatic scoring.

## Tech Stack

**Frontend**
- [Next.js 16](https://nextjs.org/) with TypeScript
- [Tailwind CSS v4](https://tailwindcss.com/)

**Backend**
- [FastAPI](https://fastapi.tiangolo.com/) with Pydantic
- [PostgreSQL](https://www.postgresql.org/) for persistence

## Project Structure

```
gin-rummy/
├── frontend/       # Next.js app
├── backend/        # FastAPI app
│   ├── models/     # Pydantic models
│   ├── router/     # API routes
│   └── service/    # Business logic
└── game/           # Core game logic
```

## Getting Started

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Game Rules

See [CLAUDE.md](CLAUDE.md) for a full description of the game rules and round structure.

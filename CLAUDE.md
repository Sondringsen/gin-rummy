# Gin Rummy App

## Tech Stack
- **Backend**: FastAPI with Pydantic, Python
- **Database**: PostgreSQL with SQLAlchemy ORM and Alembic migrations
- **Frontend**: Next.js 16 with TypeScript and Tailwind CSS v4

## Project Structure

```
backend/
  auth/               — Auth microservice
    models.py         — SQLAlchemy User model
    schema.py         — Pydantic schemas (UserCreate, Token, LoginRequest, ...)
    service.py        — Password hashing (pbkdf2_sha256), JWT creation, user CRUD
    router.py         — POST /api/auth/register, POST /api/auth/login
  game_logic/         — Game microservice
    models.py         — SQLAlchemy models (placeholder, game state is in-memory)
    schema.py         — Pydantic schemas (GameState, CardModel, ...)
    service.py        — In-memory game state management
    router.py         — All game API routes under /api/game
  database.py         — SQLAlchemy engine, SessionLocal, Base, get_db dependency
  config.py           — Pydantic Settings class (reads from .env)
  main.py             — FastAPI app, mounts both routers
frontend/
  app/
    page.tsx          — Home page (redirects to /login if not authenticated)
    login/page.tsx    — Combined login/register page
    game/[gameId]/    — Game page
  lib/
    api.ts            — Game API calls
    auth.ts           — JWT helpers (getToken, setToken, getAuthHeaders, ...)
    types.ts          — TypeScript types
game/
  gin_rummy.py        — Core game logic
alembic/
  versions/           — Migration files
  env.py              — Alembic config (uses Settings for DATABASE_URL)
alembic.ini           — Alembic entry point
.env                  — Local environment variables (not committed)
requirements.txt      — Python dependencies
```

## Configuration

All environment variables live in `.env` and are validated at startup via `backend/config.py` (`pydantic-settings`):

| Variable                     | Description                        | Default  |
|------------------------------|------------------------------------|----------|
| `DATABASE_URL`               | PostgreSQL connection string       | required |
| `SECRET_KEY`                 | JWT signing secret                 | required |
| `ALGORITHM`                  | JWT algorithm                      | `HS256`  |
| `ACCESS_TOKEN_EXPIRE_MINUTES`| Token lifetime in minutes          | `10080`  |

## Database Migrations

```bash
# Apply all migrations
alembic upgrade head

# Create a new migration after changing a model
alembic revision --autogenerate -m "description"
```

## Deployment

The app is deployed on AWS with:
- **EC2** (Amazon Linux) — runs the backend (systemd) and frontend (Next.js)
- **RDS** (PostgreSQL) — managed database, same VPC as EC2

### Key files

```
deploy/
  gin-rummy-backend.service  — systemd unit file, runs uvicorn on 127.0.0.1:8000
  nginx.conf                 — nginx reverse proxy: /api/ → :8000, / → :3000
.env.prod                    — production env vars (not committed); transferred to server as .env
frontend/.env.local          — dev: NEXT_PUBLIC_API_URL=http://localhost:8000
frontend/.env.production     — prod: NEXT_PUBLIC_API_URL= (empty, uses relative URLs through nginx)
```

### How traffic flows

```
Browser → nginx :80 → /api/* → uvicorn :8000 (FastAPI)
                     → /     → Next.js  :3000
```

WebSocket connections (`/api/game/{id}/ws`) also go through the `/api/` nginx block, which has `Upgrade` headers set.

### Frontend API URLs

All API base URLs are controlled by `NEXT_PUBLIC_API_URL`. In production this is empty, making all calls relative (e.g. `/api/game/...`) so nginx routes them. The `getWsBase()` helper in `frontend/lib/api.ts` derives the WebSocket URL from either the env var or `window.location`.

## Running the App

```bash
# Backend
uvicorn backend.main:app --reload

# Frontend
cd frontend && npm run dev
```

## Auth Flow

- `POST /api/auth/register` — creates a user and returns a JWT
- `POST /api/auth/login` — verifies credentials and returns a JWT
- JWT is stored in `localStorage` on the frontend and sent as `Authorization: Bearer <token>`

---

This app implements a card game called Gin Rummy. I am not sure the rules we usually play with are the commonly accepted rules found online so here is an overview of the rules and the flow of the game.

## Definitions
- A 'tress' is defined as having three or more cards of the same value, i.e. three 4s.
- A 'flush' is defined as having four or more consecutive cards in the same colour, i.e. 4 of spades through 7 of spades.

## How the Game is Played
The game is played with two decks of cards. The game consist of six rounds and the deck is shuffled between each round. The overall objective is to have as few points as possible after all 6 rounds. 

A player starts each round with 12 cards (the other people cannot see your cards). Of the 12 cards a player is dealt in the beginning the player can discard one of them before the round begins. Each player therefore effectively starts with 11 cards. Within each round each player tries to get rid of the cards on their hand. A player starts their turn by drawing either a card from the top of the fresh deck of cards or from the top of the discarded cards. A player can only draw from the discarded cards if it is the most recent card to have been discarded (this is only relevant when a player draws out of turn). The player can then choose to either discard a card (the discarded cards are visible to everyone) or open. A player can open if it meets the following requirements.

- Round 1: two tress'
- Round 2: one tress one flush
- Round 3: two flushes
- Round 4: three tress'
- Round 5: two tress' one flush
- Round 6: one tress two flushes

The opened tress' and flushes are visible to all players. If multiple players have opened they can build on other players opened cards before discarding a card to get rid of more cards. A player who has not yet opened cannot do this. The round is over when one player get rid of all their cards. 

The winner is the one with the lowest score after all rounds are played.

### Counting Score
The score is calculated as follows:
- Two of spades are worth 50 points.
- Aces are worth 20 points.
- Picture cards are worth 10 points.
- Other cards are worth their face value.

## Other Rules
- Two of spades can be used as any card (essentially a joker).
- Aces can be used as both 1 and 14.
- A player can draw the top card from the discarded deck of cards out of turn. This is penalized by having to draw a card from the deck of fresh cards.
- In the final round a player must open with all the cards (no card can be discarded). This means that in the final round only one player is going to open.
- You cannot draw from the cards that are discarded as the first i.e. when the players discard one of their 12 cards before the round begins.
- If an opened build contains a two of spades (used as a joker), a player who has already opened can replace it with the card it represents and take the two of spades into their hand to use in further building.

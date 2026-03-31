from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.router.game import router as game_router

app = FastAPI(title='Gin Rummy API')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:3000'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(game_router, prefix='/api/game', tags=['game'])

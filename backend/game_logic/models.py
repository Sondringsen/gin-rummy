import uuid
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from backend.database import Base


class GameResult(Base):
    __tablename__ = "game_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    game_id = Column(String, nullable=False, index=True)
    player_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    username = Column(String, nullable=False)
    final_score = Column(Integer, nullable=True)  # null = incomplete/quit
    completed = Column(Boolean, nullable=False, default=True)
    played_at = Column(DateTime(timezone=True), nullable=False)

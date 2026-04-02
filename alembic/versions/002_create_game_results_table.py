"""create game_results table

Revision ID: 002
Revises: 001
Create Date: 2026-04-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'game_results',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('game_id', sa.String(), nullable=False),
        sa.Column('player_id', UUID(as_uuid=True), nullable=False),
        sa.Column('username', sa.String(), nullable=False),
        sa.Column('final_score', sa.Integer(), nullable=True),
        sa.Column('completed', sa.Boolean(), nullable=False),
        sa.Column('played_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['player_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_game_results_id'), 'game_results', ['id'], unique=False)
    op.create_index(op.f('ix_game_results_game_id'), 'game_results', ['game_id'], unique=False)
    op.create_index(op.f('ix_game_results_player_id'), 'game_results', ['player_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_game_results_player_id'), table_name='game_results')
    op.drop_index(op.f('ix_game_results_game_id'), table_name='game_results')
    op.drop_index(op.f('ix_game_results_id'), table_name='game_results')
    op.drop_table('game_results')

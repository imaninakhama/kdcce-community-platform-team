"""add volunteer session tracking

Revision ID: eef2a71c82c4
Revises: b3e7a1c9f402
Create Date: 2026-09-11 11:51:04.522655

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'eef2a71c82c4'
down_revision = 'b3e7a1c9f402'
branch_labels = None
depends_on = None


def upgrade():
    # NOTE: autogenerate also detected unrelated pre-existing drift on
    # follow_ups' indexes and volunteer_invitations' token uniqueness —
    # left untouched here on purpose, out of scope for this migration.
    op.create_table(
        'volunteer_sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('volunteer_id', sa.Integer(), nullable=False),
        sa.Column('login_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('logout_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['volunteer_id'], ['users.id'], name='fk_volunteer_sessions_volunteer_id_users'),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('volunteer_sessions', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_volunteer_sessions_volunteer_id'), ['volunteer_id'], unique=False)


def downgrade():
    with op.batch_alter_table('volunteer_sessions', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_volunteer_sessions_volunteer_id'))
    op.drop_table('volunteer_sessions')

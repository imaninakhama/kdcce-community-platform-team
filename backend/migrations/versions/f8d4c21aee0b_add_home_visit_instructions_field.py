"""add home visit instructions field

Revision ID: f8d4c21aee0b
Revises: ff31649c7157
Create Date: 2026-09-11 00:03:16.094347

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f8d4c21aee0b'
down_revision = 'ff31649c7157'
branch_labels = None
depends_on = None


def upgrade():
    # NOTE: autogenerate also detected unrelated pre-existing drift on
    # follow_ups' indexes and volunteer_invitations' token uniqueness —
    # left untouched here on purpose, out of scope for this migration.
    with op.batch_alter_table('home_visits', schema=None) as batch_op:
        batch_op.add_column(sa.Column('instructions', sa.Text(), nullable=True))


def downgrade():
    with op.batch_alter_table('home_visits', schema=None) as batch_op:
        batch_op.drop_column('instructions')

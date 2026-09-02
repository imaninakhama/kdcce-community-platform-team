"""add mpesa failure reason to donations

Revision ID: 2f4c7a9e1b83
Revises: 0d806130c214
Create Date: 2026-08-31 19:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2f4c7a9e1b83'
down_revision = '0d806130c214'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('donations', schema=None) as batch_op:
        batch_op.add_column(sa.Column('mpesa_failure_reason', sa.String(length=255), nullable=True))


def downgrade():
    with op.batch_alter_table('donations', schema=None) as batch_op:
        batch_op.drop_column('mpesa_failure_reason')

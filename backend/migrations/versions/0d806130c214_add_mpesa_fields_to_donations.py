"""add mpesa fields to donations

Revision ID: 0d806130c214
Revises: f5d575e0403f
Create Date: 2026-08-31 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0d806130c214'
down_revision = 'f5d575e0403f'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('donations', schema=None) as batch_op:
        batch_op.add_column(sa.Column('mpesa_checkout_request_id', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('mpesa_receipt_number', sa.String(length=30), nullable=True))
        batch_op.create_unique_constraint('uq_donations_mpesa_checkout_request_id', ['mpesa_checkout_request_id'])


def downgrade():
    with op.batch_alter_table('donations', schema=None) as batch_op:
        batch_op.drop_constraint('uq_donations_mpesa_checkout_request_id', type_='unique')
        batch_op.drop_column('mpesa_receipt_number')
        batch_op.drop_column('mpesa_checkout_request_id')

"""add revoked_tokens

Revision ID: 4e6e039f08c4
Revises: 0de524bd175b
Create Date: 2026-08-23 09:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4e6e039f08c4'
down_revision = '0de524bd175b'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('revoked_tokens',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('jti', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('jti')
    )
    with op.batch_alter_table('revoked_tokens', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_revoked_tokens_jti'), ['jti'], unique=True)


def downgrade():
    with op.batch_alter_table('revoked_tokens', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_revoked_tokens_jti'))
    op.drop_table('revoked_tokens')

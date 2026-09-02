"""add volunteer_invitations table

Revision ID: 7c1e9f4a2b56
Revises: 2f4c7a9e1b83
Create Date: 2026-09-02 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7c1e9f4a2b56'
down_revision = '2f4c7a9e1b83'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'volunteer_invitations',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('volunteer_profile_id', sa.Integer(), sa.ForeignKey('volunteer_profiles.id'), nullable=False),
        sa.Column('token', sa.String(length=64), nullable=False, unique=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_volunteer_invitations_volunteer_profile_id', 'volunteer_invitations', ['volunteer_profile_id'])
    op.create_index('ix_volunteer_invitations_token', 'volunteer_invitations', ['token'])


def downgrade():
    op.drop_table('volunteer_invitations')

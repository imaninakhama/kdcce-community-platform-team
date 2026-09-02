"""drop blog_posts and crafts tables, add team_members.social_link

Revision ID: 9a3f5c7e1d24
Revises: 7c1e9f4a2b56
Create Date: 2026-09-02 21:45:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9a3f5c7e1d24'
down_revision = '7c1e9f4a2b56'
branch_labels = None
depends_on = None


def upgrade():
    op.drop_table('crafts')
    op.drop_table('blog_posts')
    op.add_column('team_members', sa.Column('social_link', sa.String(length=500), nullable=True))


def downgrade():
    op.drop_column('team_members', 'social_link')
    op.create_table('blog_posts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('excerpt', sa.Text(), nullable=True),
        sa.Column('image', sa.String(length=500), nullable=True),
        sa.Column('type', sa.String(length=40), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table('crafts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('category', sa.String(length=60), nullable=False),
        sa.Column('maker', sa.String(length=120), nullable=False),
        sa.Column('price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('image', sa.String(length=500), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

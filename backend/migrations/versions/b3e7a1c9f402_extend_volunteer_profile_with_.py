"""extend volunteer profile with application fields (dob, county, hours, emergency contact, consents)

Revision ID: b3e7a1c9f402
Revises: 9a3f5c7e1d24
Create Date: 2026-09-03 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b3e7a1c9f402'
down_revision = '9a3f5c7e1d24'
branch_labels = None
depends_on = None


def upgrade():
    # recreate='never': every column below is a simple nullable-or-
    # defaulted ADD COLUMN, which SQLite supports as a plain ALTER TABLE
    # with no table rebuild needed. Without this, Alembic's default batch
    # strategy on SQLite recreates the whole table (create-copy-drop-
    # rename) to apply the batch, and that DROP TABLE fails with a
    # "FOREIGN KEY constraint failed" here because AssignmentReview.
    # volunteer_profile_id (see models.py) holds a live FK into this
    # table — SQLite won't drop a table another table still references.
    with op.batch_alter_table('volunteer_profiles', schema=None, recreate='never') as batch_op:
        batch_op.add_column(sa.Column('date_of_birth', sa.Date(), nullable=True))
        batch_op.add_column(sa.Column('county', sa.String(length=80), nullable=True))
        batch_op.add_column(sa.Column('min_hours_available', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('emergency_contact_name', sa.String(length=120), nullable=True))
        batch_op.add_column(sa.Column('emergency_contact_phone', sa.String(length=40), nullable=True))
        batch_op.add_column(sa.Column('code_of_conduct_agreed', sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.add_column(sa.Column('privacy_consent_agreed', sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.add_column(sa.Column('accuracy_declaration_agreed', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade():
    with op.batch_alter_table('volunteer_profiles', schema=None, recreate='never') as batch_op:
        batch_op.drop_column('accuracy_declaration_agreed')
        batch_op.drop_column('privacy_consent_agreed')
        batch_op.drop_column('code_of_conduct_agreed')
        batch_op.drop_column('emergency_contact_phone')
        batch_op.drop_column('emergency_contact_name')
        batch_op.drop_column('min_hours_available')
        batch_op.drop_column('county')
        batch_op.drop_column('date_of_birth')

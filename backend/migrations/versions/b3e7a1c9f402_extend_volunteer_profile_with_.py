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
    with op.batch_alter_table('volunteer_profiles', schema=None) as batch_op:
        batch_op.add_column(sa.Column('date_of_birth', sa.Date(), nullable=True))
        batch_op.add_column(sa.Column('county', sa.String(length=80), nullable=True))
        batch_op.add_column(sa.Column('min_hours_available', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('emergency_contact_name', sa.String(length=120), nullable=True))
        batch_op.add_column(sa.Column('emergency_contact_phone', sa.String(length=40), nullable=True))
        batch_op.add_column(sa.Column('code_of_conduct_agreed', sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.add_column(sa.Column('privacy_consent_agreed', sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.add_column(sa.Column('accuracy_declaration_agreed', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade():
    with op.batch_alter_table('volunteer_profiles', schema=None) as batch_op:
        batch_op.drop_column('accuracy_declaration_agreed')
        batch_op.drop_column('privacy_consent_agreed')
        batch_op.drop_column('code_of_conduct_agreed')
        batch_op.drop_column('emergency_contact_phone')
        batch_op.drop_column('emergency_contact_name')
        batch_op.drop_column('min_hours_available')
        batch_op.drop_column('county')
        batch_op.drop_column('date_of_birth')

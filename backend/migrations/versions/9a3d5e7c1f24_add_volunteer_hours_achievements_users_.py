"""add volunteer hours, achievements, admin ops (users/sessions/audit/2fa) tables

Revision ID: 9a3d5e7c1f24
Revises: 2f4c7a9e1b83
Create Date: 2026-09-01 18:30:00.000000

"""
from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa

from app.achievements.seed_data import DEFAULT_ACHIEVEMENTS


# revision identifiers, used by Alembic.
revision = '9a3d5e7c1f24'
down_revision = '2f4c7a9e1b83'
branch_labels = None
depends_on = None


def upgrade():
    # Plain add_column (not batch_alter_table) — SQLite supports a bare
    # ADD COLUMN natively for nullable/defaulted columns with no
    # UNIQUE/FK constraint, so there's no need for batch mode's
    # copy-and-recreate strategy. Recreating "users" would otherwise trip
    # SQLite's FK enforcement (see the connect-time PRAGMA in app/__init__.py)
    # against every other table's foreign key into users.id.
    op.add_column('users', sa.Column('active', sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column('users', sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('totp_secret', sa.String(length=64), nullable=True))
    op.add_column('users', sa.Column('totp_enabled', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('users', sa.Column('totp_confirmed_at', sa.DateTime(timezone=True), nullable=True))

    op.create_table(
        'volunteer_hours',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('volunteer_profile_id', sa.Integer(), sa.ForeignKey('volunteer_profiles.id'), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=False),
        sa.Column('category', sa.String(length=30), nullable=False, server_default='Other'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='Pending'),
        sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('approved_by_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint('duration_minutes > 0', name='ck_volunteer_hours_duration_positive'),
    )
    op.create_index('ix_volunteer_hours_volunteer_profile_id', 'volunteer_hours', ['volunteer_profile_id'])

    op.create_table(
        'achievements',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('code', sa.String(length=40), nullable=False, unique=True),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('icon', sa.String(length=40), nullable=True),
        sa.Column('category', sa.String(length=20), nullable=False),
        sa.Column('threshold_type', sa.String(length=30), nullable=False),
        sa.Column('threshold_value', sa.Integer(), nullable=True),
        sa.Column('active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        'volunteer_achievements',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('volunteer_profile_id', sa.Integer(), sa.ForeignKey('volunteer_profiles.id'), nullable=False),
        sa.Column('achievement_id', sa.Integer(), sa.ForeignKey('achievements.id'), nullable=False),
        sa.Column('awarded_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('awarded_by_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('source', sa.String(length=20), nullable=False, server_default='automatic'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.UniqueConstraint('volunteer_profile_id', 'achievement_id', name='uq_volunteer_achievement'),
    )
    op.create_index('ix_volunteer_achievements_volunteer_profile_id', 'volunteer_achievements', ['volunteer_profile_id'])
    op.create_index('ix_volunteer_achievements_achievement_id', 'volunteer_achievements', ['achievement_id'])

    op.create_table(
        'audit_logs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('actor_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('action', sa.String(length=30), nullable=False),
        sa.Column('resource_type', sa.String(length=30), nullable=False),
        sa.Column('resource_id', sa.Integer(), nullable=False),
        sa.Column('before', sa.Text(), nullable=True),
        sa.Column('after', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_audit_logs_created_at', 'audit_logs', ['created_at'])
    op.create_index('ix_audit_logs_resource', 'audit_logs', ['resource_type', 'resource_id'])

    op.create_table(
        'login_history',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('attempted_email', sa.String(length=255), nullable=True),
        sa.Column('success', sa.Boolean(), nullable=False),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=255), nullable=True),
        sa.Column('failure_reason', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_login_history_user_id', 'login_history', ['user_id'])
    op.create_index('ix_login_history_created_at', 'login_history', ['created_at'])

    op.create_table(
        'user_sessions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('refresh_jti', sa.String(length=36), nullable=False, unique=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=255), nullable=True),
    )
    op.create_index('ix_user_sessions_user_id', 'user_sessions', ['user_id'])
    op.create_index('ix_user_sessions_refresh_jti', 'user_sessions', ['refresh_jti'])

    op.create_table(
        'two_factor_challenges',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('token', sa.String(length=64), nullable=False, unique=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('consumed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_two_factor_challenges_user_id', 'two_factor_challenges', ['user_id'])
    op.create_index('ix_two_factor_challenges_token', 'two_factor_challenges', ['token'])

    op.create_table(
        'totp_recovery_codes',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('code_hash', sa.String(length=255), nullable=False),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_totp_recovery_codes_user_id', 'totp_recovery_codes', ['user_id'])

    achievements_table = sa.table(
        'achievements',
        sa.column('code', sa.String),
        sa.column('name', sa.String),
        sa.column('description', sa.Text),
        sa.column('icon', sa.String),
        sa.column('category', sa.String),
        sa.column('threshold_type', sa.String),
        sa.column('threshold_value', sa.Integer),
        sa.column('active', sa.Boolean),
        sa.column('created_at', sa.DateTime),
    )
    now = datetime.now(timezone.utc)
    op.bulk_insert(achievements_table, [
        {
            "code": a["code"], "name": a["name"], "description": a["description"], "icon": a["icon"],
            "category": a["category"], "threshold_type": a["threshold_type"], "threshold_value": a["threshold_value"],
            "active": True, "created_at": now,
        }
        for a in DEFAULT_ACHIEVEMENTS
    ])


def downgrade():
    op.drop_table('totp_recovery_codes')
    op.drop_table('two_factor_challenges')
    op.drop_table('user_sessions')
    op.drop_table('login_history')
    op.drop_table('audit_logs')
    op.drop_table('volunteer_achievements')
    op.drop_table('achievements')
    op.drop_table('volunteer_hours')

    op.drop_column('users', 'totp_confirmed_at')
    op.drop_column('users', 'totp_enabled')
    op.drop_column('users', 'totp_secret')
    op.drop_column('users', 'deleted_at')
    op.drop_column('users', 'last_login_at')
    op.drop_column('users', 'active')

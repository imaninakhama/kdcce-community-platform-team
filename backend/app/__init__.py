import os

from flask import Flask, jsonify
from sqlalchemy import event
from sqlalchemy.engine import Engine

from .config import Config, TestingConfig
from .extensions import cors, db, jwt, limiter, migrate


@event.listens_for(Engine, "connect")
def _enable_sqlite_foreign_keys(dbapi_connection, connection_record):
    # SQLite ignores FK constraints unless explicitly told to enforce them
    # per-connection — without this, deleting a parent row with children
    # (e.g. an Activity with ActivityParticipants) would silently succeed
    # instead of raising IntegrityError.
    if type(dbapi_connection).__module__.startswith("sqlite3"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def create_app(config_name=None, instance_path=None):
    app = Flask(__name__, instance_relative_config=True, instance_path=instance_path)

    config_name = config_name or os.environ.get("FLASK_CONFIG", "default")
    app.config.from_object(TestingConfig if config_name == "testing" else Config)

    os.makedirs(app.instance_path, exist_ok=True)
    if not app.config["SQLALCHEMY_DATABASE_URI"]:
        app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + os.path.join(app.instance_path, "kdcce.db")

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app, origins=app.config["CORS_ORIGINS"])
    limiter.init_app(app)

    from .cli import register_cli

    _register_jwt_callbacks()
    _register_blueprints(app)
    _register_error_handlers(app)
    _register_hooks(app)
    register_cli(app)

    @app.get("/api/health")
    def health_check():
        return jsonify(status="ok"), 200

    return app


def _register_jwt_callbacks():
    from .models import RevokedToken

    @jwt.token_in_blocklist_loader
    def _is_token_revoked(jwt_header, jwt_payload):
        return db.session.query(
            RevokedToken.query.filter_by(jti=jwt_payload["jti"]).exists()
        ).scalar()

    @jwt.unauthorized_loader
    def _missing_token(reason):
        return jsonify(error="Authentication required"), 401

    @jwt.invalid_token_loader
    def _invalid_token(reason):
        return jsonify(error="Invalid or expired token"), 401

    @jwt.expired_token_loader
    def _expired_token(jwt_header, jwt_payload):
        return jsonify(error="Token has expired"), 401

    @jwt.revoked_token_loader
    def _revoked_token(jwt_header, jwt_payload):
        return jsonify(error="Token has been revoked"), 401


def _register_blueprints(app):
    from .activities.routes import bp as activities_bp
    from .analytics.routes import bp as analytics_bp
    from .assistance.routes import bp as assistance_bp
    from .attendance.routes import bp as attendance_bp
    from .auth.routes import bp as auth_bp
    from .calendar.routes import bp as calendar_bp
    from .donations.routes import bp as donations_bp
    from .elderly.routes import bp as elderly_bp
    from .feeding.routes import bp as feeding_bp
    from .followups.routes import bp as followups_bp
    from .gallery.routes import bp as gallery_bp
    from .health.routes import bp as health_bp
    from .homevisits.routes import bp as homevisits_bp
    from .inbox.routes import admin_bp as inbox_admin_bp
    from .inbox.routes import bp as inbox_bp
    from .incidents.routes import bp as incidents_bp
    from .inventory.routes import bp as inventory_bp
    from .medication.routes import bp as medication_bp
    from .mpesa.routes import bp as mpesa_bp
    from .notifications.routes import bp as notifications_bp
    from .reports.routes import bp as reports_bp
    from .search.routes import bp as search_bp
    from .team.routes import bp as team_bp
    from .users.routes import bp as users_bp
    from .volunteers.routes import bp as volunteers_bp

    for bp in (
        activities_bp, analytics_bp, assistance_bp, attendance_bp, auth_bp, calendar_bp,
        donations_bp, elderly_bp, feeding_bp, followups_bp, gallery_bp, health_bp,
        homevisits_bp, inbox_bp, inbox_admin_bp, incidents_bp, inventory_bp, medication_bp, mpesa_bp,
        notifications_bp, reports_bp, search_bp, team_bp, users_bp, volunteers_bp,
    ):
        app.register_blueprint(bp)


def _register_error_handlers(app):
    @app.errorhandler(404)
    def _not_found(err):
        return jsonify(error=err.description or "Not found"), 404

    @app.errorhandler(413)
    def _payload_too_large(err):
        return jsonify(error="Payload too large"), 413


def _register_hooks(app):
    @app.after_request
    def _security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "default-src 'none'"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

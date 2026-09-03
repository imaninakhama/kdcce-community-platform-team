import smtplib
from email.message import EmailMessage

import requests
from flask import current_app

RESEND_API_URL = "https://api.resend.com/emails"


def send_email(to_email, subject, body):
    """Best-effort outgoing email. Every failure mode — no provider
    configured, a network error, a bad key/login, a bad recipient — is
    caught here and turned into a log line, never an exception, so a
    flaky (or unconfigured, in local dev) mail provider can never break
    the registration/rejection action that triggered the send — that
    action has already succeeded and is never rolled back over a mail
    failure. Plain text only. Returns True/False so a caller MAY report
    delivery status back to the user (e.g. "rejected, but the email
    couldn't be sent"), without ever using it to gate or undo the
    triggering action itself.

    Tries Resend's REST API first (RESEND_API_KEY) — the project's
    preferred provider, via `requests`, already a dependency for the
    M-Pesa integration. Falls back to plain SMTP (SMTP_HOST) for any
    other provider, using stdlib smtplib + email only, no new dependency
    (same stdlib-first approach as app/auth/totp_service.py). Falls back
    to logging the email if neither is configured.

    Uses current_app.logger (not a standalone logging.getLogger) so the
    "would-have-sent" line below actually reaches the dev server's own
    console — a bare logging.getLogger has no handler attached unless the
    app configures one, so anything through it would otherwise be
    silently dropped."""
    from_name = current_app.config.get("MAIL_FROM_NAME", "KDCCE")
    from_address = current_app.config.get("MAIL_FROM_ADDRESS", "no-reply@kdcce.org")

    resend_api_key = current_app.config.get("RESEND_API_KEY")
    if resend_api_key:
        return _send_via_resend(resend_api_key, from_name, from_address, to_email, subject, body)

    host = current_app.config.get("SMTP_HOST")
    if host:
        return _send_via_smtp(host, from_name, from_address, to_email, subject, body)

    # warning, not info: Flask's default logger level (WARNING, outside
    # debug mode) would otherwise silently swallow this — and "no email
    # provider configured" is genuinely worth surfacing in a real
    # deployment, not just local dev.
    current_app.logger.warning(
        "No email provider configured (RESEND_API_KEY / SMTP_HOST) — logging instead of sending.\nTo: %s\nSubject: %s\n\n%s",
        to_email, subject, body,
    )
    return False


def _send_via_resend(api_key, from_name, from_address, to_email, subject, body):
    try:
        resp = requests.post(
            RESEND_API_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"from": f"{from_name} <{from_address}>", "to": [to_email], "subject": subject, "text": body},
            timeout=10,
        )
        resp.raise_for_status()
        return True
    except requests.RequestException as err:
        # Resend returns a JSON body describing exactly what's wrong
        # (most commonly: the from-address's domain isn't verified in
        # the Resend account) — logged in full, since that's almost
        # always a one-line configuration fix, not a real outage.
        detail = None
        response = getattr(err, "response", None)
        if response is not None:
            try:
                detail = response.json()
            except ValueError:
                detail = response.text
        current_app.logger.exception(
            "Failed to send email via Resend to %s (subject: %s)%s",
            to_email, subject, f" — {detail}" if detail else "",
        )
        return False


def _send_via_smtp(host, from_name, from_address, to_email, subject, body):
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = f"{from_name} <{from_address}>"
    message["To"] = to_email
    message.set_content(body)

    port = current_app.config.get("SMTP_PORT", 587)
    username = current_app.config.get("SMTP_USERNAME")
    password = current_app.config.get("SMTP_PASSWORD")
    use_tls = current_app.config.get("SMTP_USE_TLS", True)

    try:
        with smtplib.SMTP(host, port, timeout=10) as server:
            if use_tls:
                server.starttls()
            if username and password:
                server.login(username, password)
            server.send_message(message)
        return True
    except Exception:
        current_app.logger.exception("Failed to send email via SMTP to %s (subject: %s)", to_email, subject)
        return False

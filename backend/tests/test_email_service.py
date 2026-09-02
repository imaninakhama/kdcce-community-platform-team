from unittest.mock import Mock, patch

import requests

from app.email.service import send_email


def test_uses_resend_when_configured(app):
    app.config["RESEND_API_KEY"] = "test-key"
    app.config["SMTP_HOST"] = None  # Resend must win even if SMTP is also set
    with app.app_context(), patch("app.email.service.requests.post") as mock_post:
        mock_post.return_value = Mock(status_code=200, raise_for_status=lambda: None)
        result = send_email("volunteer@example.com", "Subject line", "Body text")

    assert result is True
    mock_post.assert_called_once()
    url, kwargs = mock_post.call_args[0][0], mock_post.call_args[1]
    assert url == "https://api.resend.com/emails"
    assert kwargs["headers"]["Authorization"] == "Bearer test-key"
    assert kwargs["json"]["to"] == ["volunteer@example.com"]
    assert kwargs["json"]["subject"] == "Subject line"
    assert kwargs["json"]["text"] == "Body text"


def test_resend_preferred_over_smtp_when_both_configured(app):
    app.config["RESEND_API_KEY"] = "test-key"
    app.config["SMTP_HOST"] = "smtp.example.com"
    with app.app_context(), patch("app.email.service.requests.post") as mock_post, patch("app.email.service.smtplib.SMTP") as mock_smtp:
        mock_post.return_value = Mock(status_code=200, raise_for_status=lambda: None)
        send_email("volunteer@example.com", "Subject", "Body")

    mock_post.assert_called_once()
    mock_smtp.assert_not_called()


def test_resend_failure_is_caught_and_logged_not_raised(app):
    app.config["RESEND_API_KEY"] = "test-key"
    with app.app_context(), patch("app.email.service.requests.post", side_effect=requests.ConnectionError("network down")):
        result = send_email("volunteer@example.com", "Subject", "Body")

    assert result is False


def test_falls_back_to_smtp_when_resend_not_configured(app):
    app.config["RESEND_API_KEY"] = None
    app.config["SMTP_HOST"] = "smtp.example.com"
    with app.app_context(), patch("app.email.service.smtplib.SMTP") as mock_smtp:
        server = mock_smtp.return_value.__enter__.return_value
        result = send_email("volunteer@example.com", "Subject", "Body")

    assert result is True
    server.send_message.assert_called_once()


def test_logs_instead_of_sending_when_nothing_configured(app):
    app.config["RESEND_API_KEY"] = None
    app.config["SMTP_HOST"] = None
    with app.app_context():
        result = send_email("volunteer@example.com", "Subject", "Body")

    assert result is False

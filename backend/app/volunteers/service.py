import secrets
from datetime import timedelta

from flask import current_app

from ..email.service import send_email
from ..extensions import db
from ..models import VolunteerInvitation, utcnow

INVITATION_TTL = timedelta(days=7)


def send_application_received_email(user):
    """Sent once, immediately after a successful registration — never
    re-sent, since registration itself only ever happens once per
    account. Returns whether the send succeeded, so a caller that wants
    to surface delivery status (unlike this one, which is best-effort
    only) can."""
    return send_email(
        user.email,
        "We've received your KDCCE volunteer application",
        (
            f"Hi {user.name},\n\n"
            "Thank you for applying to volunteer with KDCCE. Your application has been "
            "received and is now waiting for our team to review it.\n\n"
            "We'll email you again as soon as a decision has been made — there's nothing "
            "further you need to do right now.\n\n"
            "Thank you for wanting to support our community.\n\n"
            "— The KDCCE Team"
        ),
    )


def create_invitation(profile):
    """One new token per approval — does not commit; the caller's route
    (the same one that just changed the profile's status) commits it all
    together, same convention as notifications.service.notify."""
    invitation = VolunteerInvitation(
        volunteer_profile_id=profile.id,
        token=secrets.token_urlsafe(32),
        expires_at=utcnow() + INVITATION_TTL,
    )
    db.session.add(invitation)
    db.session.flush()  # assigns invitation.id without committing yet
    return invitation


def send_approved_email(user, invitation):
    """Returns whether the send succeeded — the caller (update_volunteer)
    reports this back to the admin, since the approval itself is already
    saved by the time this runs and a failure here must never look like
    it undid that."""
    link = f"{current_app.config['FRONTEND_URL']}/volunteer/invitation/{invitation.token}"
    return send_email(
        user.email,
        "You're approved to volunteer with KDCCE!",
        (
            f"Hi {user.name},\n\n"
            "Good news — your KDCCE volunteer application has been approved.\n\n"
            "To get straight into your volunteer portal, open this link:\n\n"
            f"{link}\n\n"
            "This link is valid for 7 days. If it has expired by the time you open it, "
            "you can still sign in any time with the email and password you registered "
            "with — nothing about your account has changed.\n\n"
            "Welcome to the team!\n\n"
            "— The KDCCE Team"
        ),
    )


def send_rejected_email(user, reason):
    """Covers both an outright rejection and a "we need more information"
    outcome — both are the same VolunteerProfile.status="Rejected" state
    with a free-text reason an admin can phrase either way; there is no
    separate status for the two."""
    body = (
        f"Hi {user.name},\n\n"
        "Thank you for your interest in volunteering with KDCCE and for taking the time "
        "to apply.\n\n"
        "After review, we're not able to move forward with your application at this time."
    )
    if reason:
        body += f"\n\n{reason}"
    body += (
        "\n\nWe appreciate your interest in supporting our community, and you're welcome "
        "to reach out to us with any questions.\n\n"
        "— The KDCCE Team"
    )
    return send_email(user.email, "An update on your KDCCE volunteer application", body)

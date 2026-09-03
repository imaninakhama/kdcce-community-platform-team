import secrets
from datetime import timedelta

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
    """Issues a token-based invitation for a volunteer profile — does not
    commit; a caller commits it together with whatever else it's doing
    in the same request, same convention as notifications.service.notify.

    Not currently called anywhere (the approval flow that used to invoke
    this alongside an approval email was removed — see
    app/volunteers/routes.py::update_volunteer). Kept, along with the
    VolunteerInvitation model and the GET/POST /invitations/<token>[/accept]
    routes, as working invitation infrastructure: still fully functional
    and covered by tests (see test_volunteer_invitations.py), just not
    wired to any trigger right now. Call this directly (then commit) to
    hand a volunteer a working invitation link."""
    invitation = VolunteerInvitation(
        volunteer_profile_id=profile.id,
        token=secrets.token_urlsafe(32),
        expires_at=utcnow() + INVITATION_TTL,
    )
    db.session.add(invitation)
    db.session.flush()  # assigns invitation.id without committing yet
    return invitation


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

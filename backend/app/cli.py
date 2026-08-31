from datetime import date, timedelta

import click

from .extensions import db
from .models import OPA, ElderlyMember, HomeVisit, User, VolunteerProfile
from .notifications.service import notify


def register_cli(app):
    app.cli.add_command(seed_admin)
    app.cli.add_command(seed_demo)


@click.command("seed-admin")
@click.option("--name", required=True)
@click.option("--email", required=True)
@click.option("--password", required=True)
@click.option("--role", default="admin", type=click.Choice(["admin", "staff"]))
def seed_admin(name, email, password, role):
    """Create an admin/staff account — the only way to get a non-volunteer
    role, since public registration always forces `volunteer`."""
    email = email.lower()
    existing = User.query.filter_by(email=email).first()
    if existing:
        click.echo(f"A user with email {email} already exists (id={existing.id}); nothing to do.")
        return

    user = User(name=name, email=email, role=role)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    click.echo(f"Created {role} user {name} <{email}> (id={user.id}).")


VOLUNTEERS = [
    {
        "name": "Grace Mwangi", "email": "grace.mwangi@example.com", "password": "GraceDemo2026!",
        "phone": "0711000001", "skills": "Cooking, first aid, companionship",
        "availability": "Weekday mornings", "areas_of_interest": "Home visits, feeding program",
        "experience": "Two years volunteering at a local shelter",
        "motivation": "I want to give back to my community.",
        "bio": "Retired nurse, lives in Kibera.",
    },
    {
        "name": "Daniel Otieno", "email": "daniel.otieno@example.com", "password": "DanielDemo2026!",
        "phone": "0711000002", "skills": "Transportation, basic health checks",
        "availability": "Weekday afternoons", "areas_of_interest": "Home visits, health & wellness",
        "experience": "One year as a community health volunteer",
        "motivation": "My grandmother benefited from a similar programme.",
        "bio": "Boda boda rider, active in the local OPA.",
    },
    {
        "name": "Faith Wanjiru", "email": "faith.wanjiru@example.com", "password": "FaithDemo2026!",
        "phone": "0711000003", "skills": "Counselling, active listening",
        "availability": "Weekends", "areas_of_interest": "Companionship, assistance requests",
        "experience": "Three years as a peer counsellor",
        "motivation": "Elderly isolation is close to my heart.",
        "bio": "Social worker by training.",
    },
    {
        "name": "Samuel Kiptoo", "email": "samuel.kiptoo@example.com", "password": "SamuelDemo2026!",
        "phone": "0711000004", "skills": "Manual labour, home repairs",
        "availability": "Weekday evenings and weekends", "areas_of_interest": "Home support, feeding program",
        "experience": "Volunteered with a church outreach group for a year",
        "motivation": "I enjoy hands-on community work.",
        "bio": "Carpenter, lives near the centre.",
    },
    {
        "name": "Esther Njeri", "email": "esther.njeri@example.com", "password": "EstherDemo2026!",
        "phone": "0711000005", "skills": "Nutrition planning, cooking",
        "availability": "Weekday mornings and afternoons", "areas_of_interest": "Feeding program, health & wellness",
        "experience": "Runs a small community kitchen",
        "motivation": "Good food is good care.",
        "bio": "Caterer and mother of three.",
    },
]

OPAS = [
    {"name": "Kibera Elders Support Group", "location": "Kibera, Gatwekera", "description": "Community group supporting elderly residents of Gatwekera village."},
    {"name": "Toi Market OPA", "location": "Kibera, Toi", "description": "Older persons association based around Toi Market."},
]

ELDERLY = [
    {"full_name": "Mary Achieng", "gender": "Female", "age": 78, "opa": 0, "allergies": "Penicillin", "dietary_requirements": "Low salt", "health_notes": "Uses a walking stick"},
    {"full_name": "James Otieno", "gender": "Male", "age": 82, "opa": 0, "allergies": None, "dietary_requirements": None, "health_notes": "Hypertension, on medication"},
    {"full_name": "Alice Wambui", "gender": "Female", "age": 75, "opa": 0, "allergies": None, "dietary_requirements": "Diabetic diet", "health_notes": "Diabetic"},
    {"full_name": "Peter Kamau", "gender": "Male", "age": 80, "opa": 0, "allergies": None, "dietary_requirements": None, "health_notes": "Mobility impaired"},
    {"full_name": "Jane Nyambura", "gender": "Female", "age": 88, "opa": 1, "allergies": "Sulfa drugs", "dietary_requirements": None, "health_notes": "Mild dementia"},
    {"full_name": "John Mwangi", "gender": "Male", "age": 73, "opa": 1, "allergies": None, "dietary_requirements": None, "health_notes": None},
    {"full_name": "Elizabeth Adhiambo", "gender": "Female", "age": 79, "opa": 1, "allergies": None, "dietary_requirements": "Soft foods", "health_notes": "Missing most teeth"},
    {"full_name": "Francis Njoroge", "gender": "Male", "age": 84, "opa": 1, "allergies": None, "dietary_requirements": None, "health_notes": "Arthritis"},
    {"full_name": "Agnes Wanjiku", "gender": "Female", "age": 77, "opa": None, "allergies": None, "dietary_requirements": None, "health_notes": None},
    {"full_name": "David Ochieng", "gender": "Male", "age": 81, "opa": None, "allergies": "Aspirin", "dietary_requirements": None, "health_notes": "Heart condition"},
    {"full_name": "Margaret Njeri", "gender": "Female", "age": 90, "opa": 0, "allergies": None, "dietary_requirements": "Pureed foods", "health_notes": "Frail, needs assistance eating"},
    {"full_name": "Joseph Kiplagat", "gender": "Male", "age": 76, "opa": 0, "allergies": None, "dietary_requirements": None, "health_notes": None},
    {"full_name": "Rose Atieno", "gender": "Female", "age": 83, "opa": 0, "allergies": None, "dietary_requirements": None, "health_notes": "Cataracts, poor eyesight"},
    {"full_name": "Stephen Mutua", "gender": "Male", "age": 79, "opa": 0, "allergies": None, "dietary_requirements": None, "health_notes": None},
    {"full_name": "Beatrice Akinyi", "gender": "Female", "age": 85, "opa": 1, "allergies": None, "dietary_requirements": "Low sugar", "health_notes": "Diabetic"},
    {"full_name": "Charles Wafula", "gender": "Male", "age": 74, "opa": 1, "allergies": None, "dietary_requirements": None, "health_notes": None},
    {"full_name": "Lucy Chebet", "gender": "Female", "age": 87, "opa": 1, "allergies": None, "dietary_requirements": None, "health_notes": "Reduced mobility, uses a wheelchair"},
    {"full_name": "Patrick Omondi", "gender": "Male", "age": 72, "opa": 1, "allergies": None, "dietary_requirements": None, "health_notes": None},
    {"full_name": "Grace Wairimu", "gender": "Female", "age": 86, "opa": None, "allergies": "Latex", "dietary_requirements": None, "health_notes": None},
    {"full_name": "Anthony Kiprotich", "gender": "Male", "age": 78, "opa": None, "allergies": None, "dietary_requirements": None, "health_notes": None},
]


@click.command("seed-demo")
def seed_demo():
    """Idempotent demo data: 5 verified volunteers, 20 elderly members
    (2 OPAs), and 20 home-visit assignments (4 per volunteer). Requires an
    admin/staff user to already exist (run seed-admin first)."""
    requester = User.query.filter(User.role.in_(("admin", "staff"))).order_by(User.id.asc()).first()
    if requester is None:
        click.echo("No admin/staff user found — run `flask seed-admin` first.")
        return

    opa_rows = []
    for opa_data in OPAS:
        opa = OPA.query.filter_by(name=opa_data["name"]).first()
        if opa is None:
            opa = OPA(**opa_data)
            db.session.add(opa)
            db.session.flush()
        opa_rows.append(opa)

    volunteer_users = []
    for v in VOLUNTEERS:
        user = User.query.filter_by(email=v["email"]).first()
        if user is None:
            user = User(name=v["name"], email=v["email"], role="volunteer")
            user.set_password(v["password"])
            db.session.add(user)
            db.session.flush()
        profile = VolunteerProfile.query.filter_by(user_id=user.id).first()
        if profile is None:
            profile = VolunteerProfile(
                user_id=user.id, phone=v["phone"], skills=v["skills"], availability=v["availability"],
                areas_of_interest=v["areas_of_interest"], experience=v["experience"],
                motivation=v["motivation"], bio=v["bio"], status="Verified",
                reviewed_by_id=requester.id,
            )
            db.session.add(profile)
        elif profile.status != "Verified":
            profile.status = "Verified"
            profile.reviewed_by_id = requester.id
        volunteer_users.append(user)
    db.session.flush()

    today = date.today()
    elderly_rows = []
    for e in ELDERLY:
        member = ElderlyMember.query.filter_by(full_name=e["full_name"]).first()
        if member is None:
            member = ElderlyMember(
                full_name=e["full_name"], gender=e["gender"],
                date_of_birth=today.replace(year=today.year - e["age"]),
                location="Kibera", opa_id=opa_rows[e["opa"]].id if e["opa"] is not None else None,
                allergies=e["allergies"], dietary_requirements=e["dietary_requirements"],
                health_notes=e["health_notes"], registration_date=today, status="Active",
                member_id="",
            )
            db.session.add(member)
            db.session.flush()
            member.member_id = f"KDCCE-{today.year}-{str(member.id).zfill(4)}"
        elderly_rows.append(member)
    db.session.flush()

    for i, volunteer in enumerate(volunteer_users):
        assigned_members = elderly_rows[i * 4:(i + 1) * 4]
        for member in assigned_members:
            existing_visit = HomeVisit.query.filter_by(elderly_member_id=member.id, assigned_to_id=volunteer.id).first()
            if existing_visit is not None:
                continue
            visit = HomeVisit(
                elderly_member_id=member.id, requested_by_id=requester.id, assigned_to_id=volunteer.id,
                priority="Medium", status="Assigned", reason="Routine wellbeing check-in.",
                scheduled_at=None,
            )
            db.session.add(visit)
            db.session.flush()
            notify(
                volunteer.id, "Home Visit Assignment", "Home visit assigned to you",
                f"You have been assigned a home visit for {member.full_name}.",
                related_resource_type="home_visit", related_resource_id=visit.id,
            )

    db.session.commit()
    click.echo("Demo data seeded: 5 volunteers, 20 elderly members, 20 home-visit assignments.")

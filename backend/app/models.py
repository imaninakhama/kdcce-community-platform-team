from datetime import date, datetime, timezone

from werkzeug.security import check_password_hash, generate_password_hash

from .extensions import db


def utcnow():
    return datetime.now(timezone.utc)


# ---------- Allowed-value constants ----------

USER_ROLES = ("admin", "staff", "volunteer")
ELDERLY_GENDERS = ("Male", "Female", "Other")
ELDERLY_STATUSES = ("Active", "Inactive", "Deceased", "Transferred")
VOLUNTEER_STATUSES = ("Pending", "Verified", "Rejected")
ACTIVITY_TYPES = (
    "Exercise", "Walking", "Games", "Social", "Intergenerational", "Skills Training",
    "Educational", "Community Event", "Other",
)
ACTIVITY_STATUSES = ("Scheduled", "In Progress", "Completed", "Cancelled")
ACTIVITY_PARTICIPANT_STATUSES = ("Registered", "Attended", "No-show", "Cancelled")
FOLLOW_UP_PRIORITIES = ("Low", "Medium", "High", "Urgent")
FOLLOW_UP_STATUSES = ("Pending", "In Progress", "Completed")
INCIDENT_TYPES = (
    "Fall", "Injury", "Medical Concern", "Accident", "Safeguarding Concern", "Welfare Concern",
    "Emergency", "Other",
)
INCIDENT_SEVERITIES = ("Low", "Medium", "High", "Critical")
INCIDENT_STATUSES = ("Open", "Under Review", "Resolved", "Closed")
WELLBEING_LEVELS = ("Good", "Fair", "Poor")
MEDICATION_STATUSES = ("Active", "Completed", "Discontinued")
ADMINISTRATION_STATUSES = ("Given", "Missed", "Refused")
MEAL_TYPES = ("Breakfast", "Lunch", "Snack", "Special")
INVENTORY_CATEGORIES = ("Food", "Medical", "Hygiene", "Equipment", "Other")
STOCK_MOVEMENT_TYPES = ("In", "Out")
DONATION_TYPES = ("Cash", "Food", "Equipment")
DONATION_STATUSES = ("Paid", "Pending", "Received", "Failed")
DONATION_FREQUENCIES = ("one-time", "monthly")
HOME_VISIT_PRIORITIES = ("Low", "Medium", "High", "Urgent")
HOME_VISIT_STATUSES = ("Pending", "Assigned", "Accepted", "Scheduled", "Started", "In Progress", "Completed", "Cancelled")
ASSISTANCE_TYPES = (
    "Hospital Accompaniment", "Transportation", "Food Assistance", "Companionship",
    "Home Support", "Other",
)
ASSISTANCE_PRIORITIES = ("Low", "Medium", "High", "Urgent")
ASSISTANCE_STATUSES = (
    "Requested", "Matching", "Assigned", "Accepted", "Started", "In Progress", "Completed", "Cancelled",
)


def _num(value):
    return float(value) if value is not None else None


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), nullable=False, unique=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="volunteer")
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "created_at": self.created_at.isoformat(),
        }


class RevokedToken(db.Model):
    __tablename__ = "revoked_tokens"

    id = db.Column(db.Integer, primary_key=True)
    jti = db.Column(db.String(36), nullable=False, unique=True, index=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)


class OPA(db.Model):
    __tablename__ = "opas"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False, unique=True)
    location = db.Column(db.String(150))
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "location": self.location,
            "description": self.description,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class ElderlyMember(db.Model):
    __tablename__ = "elderly_members"

    id = db.Column(db.Integer, primary_key=True)
    member_id = db.Column(db.String(30), nullable=False, unique=True)
    full_name = db.Column(db.String(150), nullable=False)
    date_of_birth = db.Column(db.Date)
    gender = db.Column(db.String(10), nullable=False)
    location = db.Column(db.String(150))
    opa_id = db.Column(db.Integer, db.ForeignKey("opas.id", ondelete="SET NULL"))
    emergency_contact_name = db.Column(db.String(120))
    emergency_contact_phone = db.Column(db.String(40))
    emergency_contact_relationship = db.Column(db.String(60))
    vulnerability_notes = db.Column(db.Text)
    health_notes = db.Column(db.Text)
    allergies = db.Column(db.Text)
    dietary_requirements = db.Column(db.Text)
    registration_date = db.Column(db.Date, nullable=False, default=lambda: utcnow().date())
    status = db.Column(db.String(20), nullable=False, default="Active")
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    opa = db.relationship("OPA", foreign_keys=[opa_id])

    def to_dict(self):
        return {
            "id": self.id,
            "member_id": self.member_id,
            "full_name": self.full_name,
            "date_of_birth": self.date_of_birth.isoformat() if self.date_of_birth else None,
            "gender": self.gender,
            "location": self.location,
            "opa_id": self.opa_id,
            "opa_name": self.opa.name if self.opa else None,
            "emergency_contact_name": self.emergency_contact_name,
            "emergency_contact_phone": self.emergency_contact_phone,
            "emergency_contact_relationship": self.emergency_contact_relationship,
            "vulnerability_notes": self.vulnerability_notes,
            "health_notes": self.health_notes,
            "allergies": self.allergies,
            "dietary_requirements": self.dietary_requirements,
            "registration_date": self.registration_date.isoformat() if self.registration_date else None,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class VolunteerProfile(db.Model):
    __tablename__ = "volunteer_profiles"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, unique=True)
    phone = db.Column(db.String(40))
    skills = db.Column(db.Text)
    availability = db.Column(db.Text)
    areas_of_interest = db.Column(db.Text)
    experience = db.Column(db.Text)
    motivation = db.Column(db.Text)
    bio = db.Column(db.Text)
    status = db.Column(db.String(20), nullable=False, default="Pending")
    rejection_reason = db.Column(db.Text)
    reviewed_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    reviewed_at = db.Column(db.DateTime(timezone=True))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    user = db.relationship("User", foreign_keys=[user_id])
    reviewed_by = db.relationship("User", foreign_keys=[reviewed_by_id])

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.user.name if self.user else None,
            "email": self.user.email if self.user else None,
            "phone": self.phone,
            "skills": self.skills,
            "availability": self.availability,
            "areas_of_interest": self.areas_of_interest,
            "experience": self.experience,
            "motivation": self.motivation,
            "bio": self.bio,
            "status": self.status,
            "rejection_reason": self.rejection_reason,
            "reviewed_by": self.reviewed_by.name if self.reviewed_by else None,
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class VolunteerInvitation(db.Model):
    """A single-use, time-limited link sent in the approval email. Not a
    login gate — a volunteer can already sign in with their own password
    the moment their profile is Verified (they set it at registration;
    see auth/routes.py login()). This just lets that same email land them
    straight back in a real session without re-entering credentials, and
    is deliberately never required."""

    __tablename__ = "volunteer_invitations"

    id = db.Column(db.Integer, primary_key=True)
    volunteer_profile_id = db.Column(db.Integer, db.ForeignKey("volunteer_profiles.id"), nullable=False, index=True)
    token = db.Column(db.String(64), nullable=False, unique=True, index=True)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)
    accepted_at = db.Column(db.DateTime(timezone=True))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    volunteer_profile = db.relationship("VolunteerProfile", foreign_keys=[volunteer_profile_id])


class Attendance(db.Model):
    __tablename__ = "attendance_records"

    id = db.Column(db.Integer, primary_key=True)
    elderly_member_id = db.Column(db.Integer, db.ForeignKey("elderly_members.id"), nullable=False, index=True)
    attendance_date = db.Column(db.Date, nullable=False, index=True)
    check_in_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    check_out_at = db.Column(db.DateTime(timezone=True))
    recorded_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    elderly_member = db.relationship("ElderlyMember", foreign_keys=[elderly_member_id])
    recorded_by = db.relationship("User", foreign_keys=[recorded_by_id])

    def to_dict(self):
        return {
            "id": self.id,
            "elderly_member_id": self.elderly_member_id,
            "elderly_member_name": self.elderly_member.full_name if self.elderly_member else None,
            "elderly_member_code": self.elderly_member.member_id if self.elderly_member else None,
            "attendance_date": self.attendance_date.isoformat(),
            "check_in_at": self.check_in_at.isoformat(),
            "check_out_at": self.check_out_at.isoformat() if self.check_out_at else None,
            "recorded_by": self.recorded_by.name if self.recorded_by else None,
            "notes": self.notes,
            "created_at": self.created_at.isoformat(),
        }


class HealthRecord(db.Model):
    __tablename__ = "health_records"

    id = db.Column(db.Integer, primary_key=True)
    elderly_member_id = db.Column(db.Integer, db.ForeignKey("elderly_members.id"), nullable=False, index=True)
    recorded_at = db.Column(db.DateTime(timezone=True), nullable=False, index=True, default=utcnow)
    blood_pressure_systolic = db.Column(db.Integer)
    blood_pressure_diastolic = db.Column(db.Integer)
    temperature_celsius = db.Column(db.Numeric(4, 1))
    pulse_bpm = db.Column(db.Integer)
    weight_kg = db.Column(db.Numeric(5, 1))
    wellbeing = db.Column(db.String(10))
    mood = db.Column(db.String(60))
    physical_activity = db.Column(db.Text)
    observations = db.Column(db.Text)
    follow_up_required = db.Column(db.Boolean, nullable=False, default=False)
    follow_up_notes = db.Column(db.Text)
    recorded_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    elderly_member = db.relationship("ElderlyMember", foreign_keys=[elderly_member_id])
    recorded_by = db.relationship("User", foreign_keys=[recorded_by_id])

    def to_dict(self):
        return {
            "id": self.id,
            "elderly_member_id": self.elderly_member_id,
            "elderly_member_name": self.elderly_member.full_name if self.elderly_member else None,
            "elderly_member_code": self.elderly_member.member_id if self.elderly_member else None,
            "recorded_at": self.recorded_at.isoformat(),
            "blood_pressure_systolic": self.blood_pressure_systolic,
            "blood_pressure_diastolic": self.blood_pressure_diastolic,
            "temperature_celsius": _num(self.temperature_celsius),
            "pulse_bpm": self.pulse_bpm,
            "weight_kg": _num(self.weight_kg),
            "wellbeing": self.wellbeing,
            "mood": self.mood,
            "physical_activity": self.physical_activity,
            "observations": self.observations,
            "follow_up_required": self.follow_up_required,
            "follow_up_notes": self.follow_up_notes,
            "recorded_by": self.recorded_by.name if self.recorded_by else None,
            "created_at": self.created_at.isoformat(),
        }


class Medication(db.Model):
    __tablename__ = "medications"

    id = db.Column(db.Integer, primary_key=True)
    elderly_member_id = db.Column(db.Integer, db.ForeignKey("elderly_members.id"), nullable=False, index=True)
    name = db.Column(db.String(150), nullable=False)
    dosage = db.Column(db.String(100))
    instructions = db.Column(db.Text)
    schedule = db.Column(db.String(100))
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date)
    status = db.Column(db.String(20), nullable=False, default="Active")
    notes = db.Column(db.Text)
    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    elderly_member = db.relationship("ElderlyMember", foreign_keys=[elderly_member_id])
    created_by = db.relationship("User", foreign_keys=[created_by_id])

    def to_dict(self):
        return {
            "id": self.id,
            "elderly_member_id": self.elderly_member_id,
            "elderly_member_name": self.elderly_member.full_name if self.elderly_member else None,
            "elderly_member_code": self.elderly_member.member_id if self.elderly_member else None,
            "name": self.name,
            "dosage": self.dosage,
            "instructions": self.instructions,
            "schedule": self.schedule,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "status": self.status,
            "notes": self.notes,
            "created_by": self.created_by.name if self.created_by else None,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class MedicationAdministration(db.Model):
    __tablename__ = "medication_administrations"

    id = db.Column(db.Integer, primary_key=True)
    medication_id = db.Column(db.Integer, db.ForeignKey("medications.id"), nullable=False, index=True)
    administered_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    status = db.Column(db.String(20), nullable=False, default="Given")
    notes = db.Column(db.Text)
    administered_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    medication = db.relationship("Medication", foreign_keys=[medication_id])
    administered_by = db.relationship("User", foreign_keys=[administered_by_id])

    def to_dict(self):
        return {
            "id": self.id,
            "medication_id": self.medication_id,
            "administered_at": self.administered_at.isoformat(),
            "status": self.status,
            "notes": self.notes,
            "administered_by": self.administered_by.name if self.administered_by else None,
            "created_at": self.created_at.isoformat(),
        }


class HomeVisit(db.Model):
    __tablename__ = "home_visits"

    id = db.Column(db.Integer, primary_key=True)
    elderly_member_id = db.Column(db.Integer, db.ForeignKey("elderly_members.id"), nullable=False, index=True)
    requested_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    assigned_to_id = db.Column(db.Integer, db.ForeignKey("users.id"), index=True)
    priority = db.Column(db.String(10), nullable=False, default="Medium")
    status = db.Column(db.String(20), nullable=False, default="Pending")
    reason = db.Column(db.Text, nullable=False)
    scheduled_at = db.Column(db.DateTime(timezone=True))
    started_at = db.Column(db.DateTime(timezone=True))
    completed_at = db.Column(db.DateTime(timezone=True))
    observations = db.Column(db.Text)
    support_provided = db.Column(db.Text)
    follow_up_required = db.Column(db.Boolean, nullable=False, default=False)
    follow_up_notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    elderly_member = db.relationship("ElderlyMember", foreign_keys=[elderly_member_id])
    requested_by = db.relationship("User", foreign_keys=[requested_by_id])
    assigned_to = db.relationship("User", foreign_keys=[assigned_to_id])

    def to_dict(self):
        return {
            "id": self.id,
            "elderly_member_id": self.elderly_member_id,
            "elderly_member_name": self.elderly_member.full_name if self.elderly_member else None,
            "elderly_member_code": self.elderly_member.member_id if self.elderly_member else None,
            "requested_by": self.requested_by.name if self.requested_by else None,
            "assigned_to_id": self.assigned_to_id,
            "assigned_to": self.assigned_to.name if self.assigned_to else None,
            "priority": self.priority,
            "status": self.status,
            "reason": self.reason,
            "scheduled_at": self.scheduled_at.isoformat() if self.scheduled_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "observations": self.observations,
            "support_provided": self.support_provided,
            "follow_up_required": self.follow_up_required,
            "follow_up_notes": self.follow_up_notes,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class AssistanceRequest(db.Model):
    __tablename__ = "assistance_requests"

    id = db.Column(db.Integer, primary_key=True)
    elderly_member_id = db.Column(db.Integer, db.ForeignKey("elderly_members.id"), nullable=False, index=True)
    requested_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    assigned_to_id = db.Column(db.Integer, db.ForeignKey("users.id"), index=True)
    home_visit_id = db.Column(db.Integer, db.ForeignKey("home_visits.id"))
    request_type = db.Column(db.String(30), nullable=False)
    priority = db.Column(db.String(10), nullable=False, default="Medium")
    status = db.Column(db.String(20), nullable=False, default="Requested")
    description = db.Column(db.Text, nullable=False)
    scheduled_at = db.Column(db.DateTime(timezone=True))
    started_at = db.Column(db.DateTime(timezone=True))
    completed_at = db.Column(db.DateTime(timezone=True))
    outcome_notes = db.Column(db.Text)
    follow_up_required = db.Column(db.Boolean, nullable=False, default=False)
    follow_up_notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    elderly_member = db.relationship("ElderlyMember", foreign_keys=[elderly_member_id])
    requested_by = db.relationship("User", foreign_keys=[requested_by_id])
    assigned_to = db.relationship("User", foreign_keys=[assigned_to_id])
    home_visit = db.relationship("HomeVisit", foreign_keys=[home_visit_id])

    def to_dict(self):
        return {
            "id": self.id,
            "elderly_member_id": self.elderly_member_id,
            "elderly_member_name": self.elderly_member.full_name if self.elderly_member else None,
            "elderly_member_code": self.elderly_member.member_id if self.elderly_member else None,
            "requested_by": self.requested_by.name if self.requested_by else None,
            "assigned_to_id": self.assigned_to_id,
            "assigned_to": self.assigned_to.name if self.assigned_to else None,
            "home_visit_id": self.home_visit_id,
            "request_type": self.request_type,
            "priority": self.priority,
            "status": self.status,
            "description": self.description,
            "scheduled_at": self.scheduled_at.isoformat() if self.scheduled_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "outcome_notes": self.outcome_notes,
            "follow_up_required": self.follow_up_required,
            "follow_up_notes": self.follow_up_notes,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class Incident(db.Model):
    __tablename__ = "incidents"

    id = db.Column(db.Integer, primary_key=True)
    elderly_member_id = db.Column(db.Integer, db.ForeignKey("elderly_members.id"), index=True)
    reported_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    incident_type = db.Column(db.String(30), nullable=False)
    severity = db.Column(db.String(10), nullable=False, default="Medium")
    occurred_at = db.Column(db.DateTime(timezone=True), nullable=False, index=True)
    location = db.Column(db.String(150))
    description = db.Column(db.Text, nullable=False)
    immediate_action_taken = db.Column(db.Text)
    emergency_contact_notified = db.Column(db.Boolean, nullable=False, default=False)
    emergency_contact_notified_at = db.Column(db.DateTime(timezone=True))
    follow_up_required = db.Column(db.Boolean, nullable=False, default=False)
    follow_up_notes = db.Column(db.Text)
    status = db.Column(db.String(20), nullable=False, default="Open")
    resolution_notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    elderly_member = db.relationship("ElderlyMember", foreign_keys=[elderly_member_id])
    reported_by = db.relationship("User", foreign_keys=[reported_by_id])

    def to_dict(self):
        return {
            "id": self.id,
            "elderly_member_id": self.elderly_member_id,
            "elderly_member_name": self.elderly_member.full_name if self.elderly_member else None,
            "elderly_member_code": self.elderly_member.member_id if self.elderly_member else None,
            "reported_by": self.reported_by.name if self.reported_by else None,
            "incident_type": self.incident_type,
            "severity": self.severity,
            "occurred_at": self.occurred_at.isoformat(),
            "location": self.location,
            "description": self.description,
            "immediate_action_taken": self.immediate_action_taken,
            "emergency_contact_notified": self.emergency_contact_notified,
            "emergency_contact_notified_at": self.emergency_contact_notified_at.isoformat() if self.emergency_contact_notified_at else None,
            "follow_up_required": self.follow_up_required,
            "follow_up_notes": self.follow_up_notes,
            "status": self.status,
            "resolution_notes": self.resolution_notes,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class FollowUp(db.Model):
    __tablename__ = "follow_ups"

    id = db.Column(db.Integer, primary_key=True)
    elderly_member_id = db.Column(db.Integer, db.ForeignKey("elderly_members.id"), nullable=False, index=True)
    source_type = db.Column(db.String(20), nullable=False)
    source_id = db.Column(db.Integer, nullable=False)
    reason = db.Column(db.Text, nullable=False)
    priority = db.Column(db.String(10), nullable=False, default="Medium")
    assigned_to_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    due_date = db.Column(db.Date)
    status = db.Column(db.String(20), nullable=False, default="Pending")
    notes = db.Column(db.Text)
    completed_at = db.Column(db.DateTime(timezone=True))
    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, index=True)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    elderly_member = db.relationship("ElderlyMember", foreign_keys=[elderly_member_id])
    assigned_to = db.relationship("User", foreign_keys=[assigned_to_id])
    created_by = db.relationship("User", foreign_keys=[created_by_id])

    def to_dict(self):
        today = date.today()
        return {
            "id": self.id,
            "elderly_member_id": self.elderly_member_id,
            "elderly_member_name": self.elderly_member.full_name if self.elderly_member else None,
            "elderly_member_code": self.elderly_member.member_id if self.elderly_member else None,
            "source_type": self.source_type,
            "source_id": self.source_id,
            "reason": self.reason,
            "priority": self.priority,
            "assigned_to_id": self.assigned_to_id,
            "assigned_to": self.assigned_to.name if self.assigned_to else None,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "status": self.status,
            "is_overdue": bool(self.status != "Completed" and self.due_date is not None and self.due_date < today),
            "notes": self.notes,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "created_by": self.created_by.name if self.created_by else None,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class Activity(db.Model):
    __tablename__ = "activities"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    activity_type = db.Column(db.String(30), nullable=False)
    description = db.Column(db.Text)
    location = db.Column(db.String(150))
    scheduled_at = db.Column(db.DateTime(timezone=True), nullable=False, index=True)
    facilitator_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    status = db.Column(db.String(20), nullable=False, default="Scheduled")
    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    facilitator = db.relationship("User", foreign_keys=[facilitator_id])
    created_by = db.relationship("User", foreign_keys=[created_by_id])

    def to_dict(self, participant_count=None):
        return {
            "id": self.id,
            "title": self.title,
            "activity_type": self.activity_type,
            "description": self.description,
            "location": self.location,
            "scheduled_at": self.scheduled_at.isoformat(),
            "facilitator_id": self.facilitator_id,
            "facilitator": self.facilitator.name if self.facilitator else None,
            "status": self.status,
            "participant_count": participant_count,
            "created_by": self.created_by.name if self.created_by else None,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class ActivityParticipant(db.Model):
    __tablename__ = "activity_participants"
    __table_args__ = (db.UniqueConstraint("activity_id", "elderly_member_id", name="uq_activity_participant_activity_member"),)

    id = db.Column(db.Integer, primary_key=True)
    activity_id = db.Column(db.Integer, db.ForeignKey("activities.id"), nullable=False, index=True)
    elderly_member_id = db.Column(db.Integer, db.ForeignKey("elderly_members.id"), nullable=False, index=True)
    status = db.Column(db.String(20), nullable=False, default="Registered")
    notes = db.Column(db.Text)
    recorded_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    activity = db.relationship("Activity", foreign_keys=[activity_id])
    elderly_member = db.relationship("ElderlyMember", foreign_keys=[elderly_member_id])
    recorded_by = db.relationship("User", foreign_keys=[recorded_by_id])

    def to_dict(self):
        return {
            "id": self.id,
            "activity_id": self.activity_id,
            "elderly_member_id": self.elderly_member_id,
            "elderly_member_name": self.elderly_member.full_name if self.elderly_member else None,
            "elderly_member_code": self.elderly_member.member_id if self.elderly_member else None,
            "status": self.status,
            "notes": self.notes,
            "recorded_by": self.recorded_by.name if self.recorded_by else None,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class Meal(db.Model):
    __tablename__ = "meals"

    id = db.Column(db.Integer, primary_key=True)
    meal_date = db.Column(db.Date, nullable=False, index=True, default=lambda: utcnow().date())
    meal_type = db.Column(db.String(20), nullable=False)
    description = db.Column(db.Text)
    planned_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    planned_by = db.relationship("User", foreign_keys=[planned_by_id])

    def to_dict(self, attendee_count=None):
        return {
            "id": self.id,
            "meal_date": self.meal_date.isoformat(),
            "meal_type": self.meal_type,
            "description": self.description,
            "planned_by": self.planned_by.name if self.planned_by else None,
            "attendee_count": attendee_count,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class MealAttendance(db.Model):
    __tablename__ = "meal_attendance"
    __table_args__ = (db.UniqueConstraint("meal_id", "elderly_member_id", name="uq_meal_attendance_meal_member"),)

    id = db.Column(db.Integer, primary_key=True)
    meal_id = db.Column(db.Integer, db.ForeignKey("meals.id"), nullable=False, index=True)
    elderly_member_id = db.Column(db.Integer, db.ForeignKey("elderly_members.id"), nullable=False, index=True)
    notes = db.Column(db.Text)
    recorded_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    meal = db.relationship("Meal", foreign_keys=[meal_id])
    elderly_member = db.relationship("ElderlyMember", foreign_keys=[elderly_member_id])
    recorded_by = db.relationship("User", foreign_keys=[recorded_by_id])

    def to_dict(self):
        return {
            "id": self.id,
            "meal_id": self.meal_id,
            "elderly_member_id": self.elderly_member_id,
            "elderly_member_name": self.elderly_member.full_name if self.elderly_member else None,
            "elderly_member_code": self.elderly_member.member_id if self.elderly_member else None,
            "notes": self.notes,
            "recorded_by": self.recorded_by.name if self.recorded_by else None,
            "created_at": self.created_at.isoformat(),
        }


class InventoryItem(db.Model):
    __tablename__ = "inventory_items"
    __table_args__ = (db.CheckConstraint("current_stock >= 0", name="ck_inventory_current_stock_non_negative"),)

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False, unique=True)
    category = db.Column(db.String(30), nullable=False, default="Other")
    unit = db.Column(db.String(30), nullable=False)
    current_stock = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    minimum_stock = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "unit": self.unit,
            "current_stock": _num(self.current_stock),
            "minimum_stock": _num(self.minimum_stock),
            "low_stock": bool(self.current_stock <= self.minimum_stock),
            "notes": self.notes,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class StockMovement(db.Model):
    __tablename__ = "stock_movements"
    __table_args__ = (db.CheckConstraint("quantity > 0", name="ck_stock_movement_quantity_positive"),)

    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey("inventory_items.id"), nullable=False, index=True)
    movement_type = db.Column(db.String(3), nullable=False)
    quantity = db.Column(db.Numeric(10, 2), nullable=False)
    reason = db.Column(db.Text)
    expiry_date = db.Column(db.Date)
    donation_id = db.Column(db.Integer, db.ForeignKey("donations.id"))
    recorded_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, index=True)

    item = db.relationship("InventoryItem", foreign_keys=[item_id])
    donation = db.relationship("Donation", foreign_keys=[donation_id])
    recorded_by = db.relationship("User", foreign_keys=[recorded_by_id])

    def to_dict(self):
        return {
            "id": self.id,
            "item_id": self.item_id,
            "movement_type": self.movement_type,
            "quantity": _num(self.quantity),
            "reason": self.reason,
            "expiry_date": self.expiry_date.isoformat() if self.expiry_date else None,
            "donation_id": self.donation_id,
            "recorded_by": self.recorded_by.name if self.recorded_by else None,
            "created_at": self.created_at.isoformat(),
        }


class Donation(db.Model):
    __tablename__ = "donations"

    id = db.Column(db.Integer, primary_key=True)
    donation_type = db.Column(db.String(20), nullable=False, default="Cash")
    donor_name = db.Column(db.String(120), nullable=False)
    donor_email = db.Column(db.String(255))
    donor_phone = db.Column(db.String(40))
    amount = db.Column(db.Numeric(10, 2))
    currency = db.Column(db.String(8), nullable=False, default="KES")
    frequency = db.Column(db.String(20), nullable=False, default="one-time")
    campaign = db.Column(db.String(120))
    payment_method = db.Column(db.String(40))
    item_description = db.Column(db.Text)
    quantity = db.Column(db.Numeric(10, 2))
    unit = db.Column(db.String(30))
    status = db.Column(db.String(20), nullable=False, default="Pending")
    txn_id = db.Column(db.String(60), nullable=False, unique=True)
    receipt_id = db.Column(db.String(60), nullable=False, unique=True)
    message = db.Column(db.Text)
    # Set only for an M-Pesa donation while its STK push is outstanding —
    # the one thing Safaricom's async callback gives us to find the right
    # row again. mpesa_receipt_number is Safaricom's own receipt code,
    # filled in once the callback confirms payment; kept separate from our
    # own server-generated txn_id/receipt_id rather than overwriting them.
    mpesa_checkout_request_id = db.Column(db.String(50), unique=True)
    mpesa_receipt_number = db.Column(db.String(30))
    # A user-friendly explanation of why an M-Pesa push resolved to Failed
    # (cancelled, insufficient funds, timed out, ...) — see
    # app/mpesa/service.py's FAILURE_REASONS. Null for anything that never
    # failed via M-Pesa.
    mpesa_failure_reason = db.Column(db.String(255))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, index=True)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "donation_type": self.donation_type,
            "donor_name": self.donor_name,
            "donor_email": self.donor_email,
            "donor_phone": self.donor_phone,
            "amount": _num(self.amount),
            "currency": self.currency,
            "frequency": self.frequency,
            "campaign": self.campaign,
            "payment_method": self.payment_method,
            "item_description": self.item_description,
            "quantity": _num(self.quantity),
            "unit": self.unit,
            "status": self.status,
            "txn_id": self.txn_id,
            "receipt_id": self.receipt_id,
            "mpesa_receipt_number": self.mpesa_receipt_number,
            "mpesa_failure_reason": self.mpesa_failure_reason,
            "message": self.message,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class Notification(db.Model):
    __tablename__ = "notifications"
    __table_args__ = (db.Index("ix_notifications_recipient_read", "recipient_id", "is_read"),)

    id = db.Column(db.Integer, primary_key=True)
    recipient_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    notification_type = db.Column(db.String(40), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    related_resource_type = db.Column(db.String(30))
    related_resource_id = db.Column(db.Integer)
    is_read = db.Column(db.Boolean, nullable=False, default=False)
    read_at = db.Column(db.DateTime(timezone=True))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "notification_type": self.notification_type,
            "title": self.title,
            "message": self.message,
            "related_resource_type": self.related_resource_type,
            "related_resource_id": self.related_resource_id,
            "is_read": self.is_read,
            "read_at": self.read_at.isoformat() if self.read_at else None,
            "created_at": self.created_at.isoformat(),
        }


class InboxMessage(db.Model):
    __tablename__ = "inbox_messages"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    subject = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "subject": self.subject,
            "message": self.message,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat(),
        }


class GalleryImage(db.Model):
    __tablename__ = "gallery_images"

    id = db.Column(db.Integer, primary_key=True)
    url = db.Column(db.String(500), nullable=False)
    caption = db.Column(db.String(200))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "url": self.url,
            "caption": self.caption,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class TeamMember(db.Model):
    __tablename__ = "team_members"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(120), nullable=False)
    image = db.Column(db.String(500), nullable=False)
    social_link = db.Column(db.String(500))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "role": self.role,
            "image": self.image,
            "social_link": self.social_link,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class AssignmentAttachment(db.Model):
    __tablename__ = "assignment_attachments"
    __table_args__ = (db.UniqueConstraint("assignment_type", "assignment_id", name="uq_assignment_attachment"),)

    id = db.Column(db.Integer, primary_key=True)
    assignment_type = db.Column(db.String(20), nullable=False)
    assignment_id = db.Column(db.Integer, nullable=False)
    uploaded_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    storage_key = db.Column(db.String(64), nullable=False, unique=True)
    original_filename = db.Column(db.String(255), nullable=False)
    mime_type = db.Column(db.String(50), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    uploaded_by = db.relationship("User", foreign_keys=[uploaded_by_id])

    def to_dict(self):
        return {
            "id": self.id,
            "original_filename": self.original_filename,
            "mime_type": self.mime_type,
            "file_size": self.file_size,
            "uploaded_by": self.uploaded_by.name if self.uploaded_by else None,
            "created_at": self.created_at.isoformat(),
        }


class AssignmentMessage(db.Model):
    __tablename__ = "assignment_messages"
    __table_args__ = (db.Index("ix_assignment_messages_assignment", "assignment_type", "assignment_id"),)

    id = db.Column(db.Integer, primary_key=True)
    assignment_type = db.Column(db.String(20), nullable=False)
    assignment_id = db.Column(db.Integer, nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    body = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, index=True)

    sender = db.relationship("User", foreign_keys=[sender_id])

    def to_dict(self):
        return {
            "id": self.id,
            "sender_id": self.sender_id,
            "sender_name": self.sender.name if self.sender else None,
            "body": self.body,
            "created_at": self.created_at.isoformat(),
        }


class AssignmentReview(db.Model):
    __tablename__ = "assignment_reviews"
    __table_args__ = (db.UniqueConstraint("assignment_type", "assignment_id", name="uq_assignment_review"),)

    id = db.Column(db.Integer, primary_key=True)
    assignment_type = db.Column(db.String(20), nullable=False)
    assignment_id = db.Column(db.Integer, nullable=False)
    reviewed_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    reviewed_by = db.relationship("User", foreign_keys=[reviewed_by_id])

    def to_dict(self):
        return {
            "id": self.id,
            "rating": self.rating,
            "comment": self.comment,
            "reviewed_by": self.reviewed_by.name if self.reviewed_by else None,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class AssignmentChecklistItem(db.Model):
    __tablename__ = "assignment_checklist_items"
    __table_args__ = (
        db.UniqueConstraint("assignment_type", "assignment_id", "item_key", name="uq_assignment_checklist_item"),
    )

    id = db.Column(db.Integer, primary_key=True)
    assignment_type = db.Column(db.String(20), nullable=False)
    assignment_id = db.Column(db.Integer, nullable=False)
    item_key = db.Column(db.String(40), nullable=False)
    checked = db.Column(db.Boolean, nullable=False, default=False)
    checked_at = db.Column(db.DateTime(timezone=True))
    checked_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    checked_by = db.relationship("User", foreign_keys=[checked_by_id])

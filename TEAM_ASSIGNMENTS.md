# Team Assignments

Scaffold generated from the original repository: https://github.com/ayiekoderrick-8068/kdcce-community-platform

This file is the authoritative allocation of every application source file to one of the five team members. Each member works on two branches (`frontend-<name>` and `backend-<name>`), copying the real implementation from the original repository into their assigned blank files here.

## Master allocation table

| Member | Branches | Frontend Files | Backend Files | Estimated Commits |
| ------ | -------- | --------------: | -------------: | -----------------: |
| Imani | `frontend-imani`, `backend-imani` | 7 | 18 | 12 |
| John | `frontend-john`, `backend-john` | 9 | 20 | 19 |
| Ayieko | `frontend-ayieko`, `backend-ayieko` | 7 | 21 | 14 |
| Allan | `frontend-allan`, `backend-allan` | 13 | 21 | 18 |
| Jeremy | `frontend-jeremy`, `backend-jeremy` | 23 | 16 | 18 |

==================================================
## IMANI'S FILES
Branches: `frontend-imani`, `backend-imani`
==================================================

**FRONTEND:**

```text
frontend/src/components/admin/AssignmentConversation.jsx
frontend/src/components/admin/AssignmentPhoto.jsx
frontend/src/components/admin/AssignmentReview.jsx
frontend/src/components/volunteer/AssignmentWorkflow.jsx
frontend/src/pages/AdminLogin.jsx
frontend/src/pages/admin/HomeVisitManager.jsx
frontend/src/pages/volunteer/MyAssignments.jsx
```

**BACKEND:**

```text
backend/app/assignments/schemas.py
backend/app/assignments/service.py
backend/app/auth/decorators.py
backend/app/auth/routes.py
backend/app/auth/schemas.py
backend/app/homevisits/routes.py
backend/app/homevisits/schemas.py
backend/migrations/versions/28ed9d8c5a00_add_home_visits.py
backend/migrations/versions/4e6e039f08c4_add_revoked_tokens.py
backend/migrations/versions/75169e53eb90_add_assignment_reviews.py
backend/migrations/versions/c012c08a7211_create_users_table.py
backend/migrations/versions/f40cbcf08509_add_assignment_attachments_and_messages.py
backend/migrations/versions/f5d575e0403f_add_assignment_started_at_volunteer_.py
backend/tests/test_assignment_collaboration.py
backend/tests/test_assignment_review.py
backend/tests/test_auth.py
backend/tests/test_home_visits.py
backend/tests/test_security_hardening.py
```

**Estimated commits: 12**

### Imani — commit plan

1. Backend: auth module (decorators, routes, schemas)
2. Backend: auth migrations (users table, revoked tokens)
3. Backend: auth tests
4. Backend: home visits routes & schemas
5. Backend: assignment service & schemas
6. Backend: home visit / assignment migrations
7. Backend: home visit / assignment tests
8. Frontend: admin login page
9. Frontend: home visit manager page
10. Frontend: assignment review & photo components
11. Frontend: assignment conversation component
12. Frontend: volunteer assignment workflow + My Assignments page

==================================================
## JOHN'S FILES
Branches: `frontend-john`, `backend-john`
==================================================

**FRONTEND:**

```text
frontend/src/pages/admin/ActivityManager.jsx
frontend/src/pages/admin/AssignmentCalendar.jsx
frontend/src/pages/admin/AttendanceManager.jsx
frontend/src/pages/admin/ElderlyManager.jsx
frontend/src/pages/admin/ElderlyProfile.jsx
frontend/src/pages/admin/HealthManager.jsx
frontend/src/pages/admin/MedicationManager.jsx
frontend/src/pages/volunteer/MyActivity.jsx
frontend/src/pages/volunteer/MyElderlyMembers.jsx
```

**BACKEND:**

```text
backend/app/activities/routes.py
backend/app/activities/schemas.py
backend/app/attendance/routes.py
backend/app/attendance/schemas.py
backend/app/calendar/routes.py
backend/app/elderly/routes.py
backend/app/elderly/schemas.py
backend/app/health/routes.py
backend/app/health/schemas.py
backend/app/medication/routes.py
backend/app/medication/schemas.py
backend/migrations/versions/09f4a06bf040_add_health_records_medications_.py
backend/migrations/versions/3912fe0a239e_add_opas_elderly_members_attendance_.py
backend/migrations/versions/51334549bb51_add_activities_activity_participants.py
backend/tests/test_activities.py
backend/tests/test_attendance.py
backend/tests/test_calendar.py
backend/tests/test_elderly.py
backend/tests/test_health.py
backend/tests/test_medication.py
```

**Estimated commits: 19**

### John — commit plan

1. Backend: elderly members routes & schemas
2. Backend: attendance routes & schemas
3. Backend: elderly/attendance migration
4. Backend: elderly/attendance tests
5. Backend: health routes & schemas
6. Backend: medication routes & schemas
7. Backend: health/medication migration
8. Backend: health/medication tests
9. Backend: activities routes & schemas
10. Backend: calendar routes
11. Backend: activities/calendar migration
12. Backend: activities/calendar tests
13. Frontend: elderly manager + profile pages
14. Frontend: attendance manager page
15. Frontend: volunteer's My Elderly Members page
16. Frontend: health manager page
17. Frontend: medication manager page
18. Frontend: assignment calendar + volunteer My Activity page
19. Frontend: activity manager page

==================================================
## AYIEKO'S FILES
Branches: `frontend-ayieko`, `backend-ayieko`
==================================================

**FRONTEND:**

```text
frontend/src/pages/admin/AssistanceManager.jsx
frontend/src/pages/admin/FeedingManager.jsx
frontend/src/pages/admin/FollowUpsManager.jsx
frontend/src/pages/admin/IncidentManager.jsx
frontend/src/pages/admin/InventoryManager.jsx
frontend/src/pages/volunteer/MyAssistanceRequests.jsx
frontend/src/pages/volunteer/ReportConcern.jsx
```

**BACKEND:**

```text
backend/app/assistance/routes.py
backend/app/assistance/schemas.py
backend/app/feeding/routes.py
backend/app/feeding/schemas.py
backend/app/followups/routes.py
backend/app/followups/schemas.py
backend/app/followups/service.py
backend/app/incidents/routes.py
backend/app/incidents/schemas.py
backend/app/inventory/routes.py
backend/app/inventory/schemas.py
backend/migrations/versions/66fee7ca6af2_add_meals_meal_attendance.py
backend/migrations/versions/92d7a3981fc7_add_assistance_requests.py
backend/migrations/versions/994bb3668888_add_inventory_items_stock_movements.py
backend/migrations/versions/a00119f7aac7_add_incidents.py
backend/migrations/versions/f79f61809d9c_add_follow_ups_incident_severity_.py
backend/tests/test_assistance.py
backend/tests/test_feeding.py
backend/tests/test_followups.py
backend/tests/test_incidents.py
backend/tests/test_inventory.py
```

**Estimated commits: 14**

### Ayieko — commit plan

1. Backend: assistance requests routes & schemas
2. Backend: incidents routes & schemas
3. Backend: follow-ups routes, schemas & service
4. Backend: assistance/incidents/follow-up migrations
5. Backend: assistance/incidents/follow-up tests
6. Backend: feeding routes & schemas
7. Backend: inventory routes & schemas
8. Backend: feeding/inventory migrations
9. Backend: feeding/inventory tests
10. Frontend: assistance requests manager page
11. Frontend: incidents + follow-ups manager pages
12. Frontend: volunteer assistance request + report concern pages
13. Frontend: feeding manager page
14. Frontend: inventory manager page

==================================================
## ALLAN'S FILES
Branches: `frontend-allan`, `backend-allan`
==================================================

**FRONTEND:**

```text
frontend/src/components/volunteer/VolunteerShell.jsx
frontend/src/lib/VolunteerDataContext.jsx
frontend/src/pages/Blog.jsx
frontend/src/pages/BlogPost.jsx
frontend/src/pages/Crafts.jsx
frontend/src/pages/Donate.jsx
frontend/src/pages/Gallery.jsx
frontend/src/pages/Sponsor.jsx
frontend/src/pages/VolunteerPortal.jsx
frontend/src/pages/admin/DonationsManager.jsx
frontend/src/pages/admin/VolunteerManager.jsx
frontend/src/pages/volunteer/MyVolunteerProfile.jsx
frontend/src/pages/volunteer/VolunteerDashboard.jsx
```

**BACKEND:**

```text
backend/app/blog/routes.py
backend/app/blog/schemas.py
backend/app/crafts/routes.py
backend/app/crafts/schemas.py
backend/app/donations/routes.py
backend/app/donations/schemas.py
backend/app/gallery/routes.py
backend/app/gallery/schemas.py
backend/app/team/routes.py
backend/app/team/schemas.py
backend/app/volunteers/routes.py
backend/app/volunteers/schemas.py
backend/migrations/versions/186b45421053_index_donations_and_stock_movements_.py
backend/migrations/versions/71c6cb8163c2_add_volunteer_profiles.py
backend/migrations/versions/cd2b0420e5e6_extend_donations_for_food_equipment_.py
backend/migrations/versions/d0e26ba03790_extend_volunteer_profile_with_.py
backend/migrations/versions/df4ba1350a6e_add_donations_blog_posts_gallery_images_.py
backend/tests/test_content.py
backend/tests/test_donations.py
backend/tests/test_volunteer_field_work.py
backend/tests/test_volunteers.py
```

**Estimated commits: 18**

### Allan — commit plan

1. Backend: volunteers routes & schemas
2. Backend: volunteer profile migrations
3. Backend: volunteer tests
4. Backend: donations routes & schemas
5. Backend: blog routes & schemas
6. Backend: gallery routes & schemas
7. Backend: crafts routes & schemas
8. Backend: team routes & schemas
9. Backend: donations/content migrations
10. Backend: donations/content tests
11. Frontend: volunteer manager page
12. Frontend: volunteer portal shell + dashboard
13. Frontend: volunteer profile page
14. Frontend: volunteer shell + data context
15. Frontend: donations manager + public donate page
16. Frontend: blog + blog post pages
17. Frontend: crafts + gallery pages
18. Frontend: sponsor page

==================================================
## JEREMY'S FILES
Branches: `frontend-jeremy`, `backend-jeremy`
==================================================

**FRONTEND:**

```text
frontend/src/components/Button.jsx
frontend/src/components/CtaBanner.jsx
frontend/src/components/Footer.jsx
frontend/src/components/GalleryPreview.jsx
frontend/src/components/Header.jsx
frontend/src/components/PageHero.jsx
frontend/src/components/ProgramCard.jsx
frontend/src/components/Stats.jsx
frontend/src/components/VideoShowcase.jsx
frontend/src/data/siteData.js
frontend/src/lib/csv.js
frontend/src/pages/About.jsx
frontend/src/pages/BecomeAVolunteer.jsx
frontend/src/pages/Contact.jsx
frontend/src/pages/Home.jsx
frontend/src/pages/ProgramDetail.jsx
frontend/src/pages/Programs.jsx
frontend/src/pages/admin/AnalyticsManager.jsx
frontend/src/pages/admin/InboxManager.jsx
frontend/src/pages/admin/ReportsManager.jsx
frontend/src/pages/volunteer/MyPerformance.jsx
frontend/src/pages/volunteer/VolunteerMessages.jsx
frontend/src/pages/volunteer/VolunteerNotifications.jsx
```

**BACKEND:**

```text
backend/app/analytics/routes.py
backend/app/inbox/routes.py
backend/app/inbox/schemas.py
backend/app/notifications/routes.py
backend/app/notifications/schemas.py
backend/app/notifications/service.py
backend/app/reports/routes.py
backend/app/search/routes.py
backend/migrations/versions/0de524bd175b_add_inbox_messages.py
backend/migrations/versions/e1229c95aca8_add_notifications.py
backend/tests/test_analytics.py
backend/tests/test_inbox.py
backend/tests/test_notifications.py
backend/tests/test_reports.py
backend/tests/test_search.py
backend/tests/test_timeline.py
```

**Estimated commits: 18**

### Jeremy — commit plan

1. Backend: notifications routes, schemas & service
2. Backend: inbox routes & schemas
3. Backend: search routes
4. Backend: reports routes
5. Backend: analytics routes
6. Backend: notifications/inbox migrations
7. Backend: notifications/inbox tests
8. Backend: search/reports/analytics/timeline tests
9. Frontend: inbox manager page + CSV export helper
10. Frontend: reports + analytics manager pages
11. Frontend: volunteer notifications + messages pages
12. Frontend: volunteer performance page
13. Frontend: shared site components (Header, Footer, PageHero)
14. Frontend: shared site components (Stats, CtaBanner, Button)
15. Frontend: shared site components (GalleryPreview, VideoShowcase, ProgramCard) + site data
16. Frontend: Home + About pages
17. Frontend: Programs + Program Detail pages
18. Frontend: Contact + Become a Volunteer pages

## Shared files

See [docs/team/SHARED_FILES.md](docs/team/SHARED_FILES.md) — these are not assigned to any single member and require coordination before editing.

# Placement management

The client dashboard workspace is `/dashboard/placement-management`. Existing `/dashboard/college` links redirect there. The account name comes from its assigned database workspace. Names use sentence case for display; stored names, emails, academic codes and identifiers are preserved.

The student roster supports server-side program, department, batch, graduation year, status, CGPA range, readable resume and text filters. Pagination counts use the same predicates. Each student row includes started and completed placement interview attempt counts.

Drive eligibility selections come from the workspace academic catalog and roster graduation years. Departments depend on selected programs. Academic setup remains the place to add programs and departments; adding students makes their batch and year available as filters. No institution-specific program or year list is embedded in the drive form.

Analytics includes unique participants, total attempts, completed attempts, repeat participants, students who have not attended, participation and completion percentages, average completed-attempt duration, roster placement status, per-drive and per-program counts, and a 30-day attendance trend. Attendance requires a recorded start timestamp. Archived attempts are included. Self-practice is excluded. Trend dates use UTC. Missing duration is shown as unavailable, not zero.

## AI coach audit

Backend endpoints exist for daily guidance, learning-plan creation and retrieval, chat messages, plan PDF export/deletion and Deepgram voice sessions. Student identity and plan ownership are checked for plan reads, chat and voice. OpenAI and Deepgram are configured on the deployed backend.

The React student dashboard now exposes `/coach`: job-description and placement-based plan creation, a daily roadmap, saved text conversations, PDF export, deletion, and 10/20-minute Deepgram voice lessons. Browser tests exercise plan/chat persistence, PCM playback acknowledgments and microphone cleanup; a human microphone conversation is still the final acceptance check for perceived voice quality.

## Roster import and student resumes

The roster uses TanStack Table and Query with server-side sorting/filtering/pagination. CSV and Excel (.xlsx) imports accept up to 10 MB and 10,000 rows. Downloadable templates have matching headers; the workbook includes the workspace's academic catalog and instructions. Existing roll numbers update records; blank status preserves existing status. Import results distinguish created, updated, rejected and warning rows.

Student Profile stores projects, topics, skills and other experience in the database. Students can generate an evidence-grounded JD-specific resume, edit it, export PDF and save it to their resume library. A saved resume can be selected as main and is reused by Practice. New practice uploads are saved automatically. Resume bytes use private Supabase storage when configured, otherwise private PostgreSQL storage introduced by migration 0037. File access still requires ownership of the resume-library row. Provider keys remain backend-only.

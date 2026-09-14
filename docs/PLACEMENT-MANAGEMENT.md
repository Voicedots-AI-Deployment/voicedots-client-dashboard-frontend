# Placement management

The client dashboard workspace is `/dashboard/placement-management`. Existing `/dashboard/college` links redirect there. The account name comes from its assigned database workspace. Names use sentence case for display; stored names, emails, academic codes and identifiers are preserved.

The student roster supports server-side program, department, batch, graduation year, status, CGPA range, readable resume and text filters. Pagination counts use the same predicates. Each student row includes started and completed placement interview attempt counts.

Drive eligibility selections come from the workspace academic catalog and roster graduation years. Departments depend on selected programs. Academic setup remains the place to add programs and departments; adding students makes their batch and year available as filters. No institution-specific program or year list is embedded in the drive form.

Analytics includes unique participants, total attempts, completed attempts, repeat participants, students who have not attended, participation and completion percentages, average completed-attempt duration, roster placement status, per-drive and per-program counts, and a 30-day attendance trend. Attendance requires a recorded start timestamp. Archived attempts are included. Self-practice is excluded. Trend dates use UTC. Missing duration is shown as unavailable, not zero.

## AI coach audit

Backend endpoints exist for daily guidance, learning-plan creation and retrieval, chat messages, plan PDF export/deletion and Deepgram voice sessions. Student identity and plan ownership are checked for plan reads, chat and voice. OpenAI and Deepgram are configured on the deployed backend.

The current React student dashboard does not include an AI coach page, route or navigation entry. It therefore does not expose plan creation, teaching chat, PDF download or voice coaching to students. The backend implementation must not be described as a fully integrated student feature. This change checks the coach implementation; it does not add the missing coach frontend or claim a full coaching-session test.

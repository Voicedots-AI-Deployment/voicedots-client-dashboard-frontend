import { test, expect } from '@playwright/test';

test('teacher edits attendance, review, and contacts through fields while preserving saved details', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('access_token', 'test-session'));
  const extended = {
    registration_number: 'REG-01', guardian_name: 'Guardian', academic_year: '2025-26', current_semester: 3,
    fee_breakdown: {}, semester_summaries: {},
    attendance_snapshot: {
      as_of_date: '2026-09-01', eligibility_status: 'Eligible',
      today: { date: '2026-09-01', hours_conducted: 1, hours_present: 1, hours_absent: 0,
        hours: [{ hour: 1, time: '09:00', subject: 'Mathematics', status: 'present', legacy_note: 'Retain' }] },
      week: { week_start: '2026-08-31', days: [{ day: 'Monday', hours_conducted: 1, hours_present: 1, hours_absent: 0 }] },
      month: { month: 'September 2026', days_conducted: 1 }, semester: { semester: '3', days_conducted: 1 },
    },
    academic_review: {
      review_date: '2026-09-01', reviewed_by: 'Advisor', reviewer_role: 'Teacher',
      parent_visible_summary: 'Doing well', recorded_factors: ['Good attendance'],
      student_concerns: 'None', agreed_actions: [{ action: 'Keep studying', owner: 'Student', due_date: '2026-10-01', status: 'open' }],
      next_review_date: '2026-10-01', parent_meeting_recommended: false,
    },
    academic_contacts: {
      class_advisor: { name: 'Old Advisor', official_email: 'advisor@example.edu', extension: '101' },
      subject_faculty: { Mathematics: { name: 'Old Faculty', official_email: 'math@example.edu', extension: '102', legacy_note: 'Retain' } },
    },
  };
  const saves: Record<string, any>[] = [];
  await page.route(/\/v[13]\//, route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/v1/users/me') return route.fulfill({ json: { user_id: 'staff-1', name: 'Teacher', email: 'teacher@example.edu', portal_role: 'placement_staff' } });
    if (path === '/v3/college/teacher-records/catalog') return route.fulfill({ json: { departments: ['CSE'], programs: [] } });
    if (path === '/v3/college/teacher-records/students') return route.fulfill({ json: { items: [{ id: 'student-1', full_name: 'Test Student', roll_number: 'CSE-01', email: 'student@example.edu', phone: null, program: 'B.Tech', department_code: 'CSE', graduation_year: 2027, cgpa: 8, status: 'active' }], total: 1 } });
    if (path === '/v3/college/teacher-records/students/student-1/records') return route.fulfill({ json: { total_fee: 0, amount_paid: 0, balance: 0, currency: 'INR', imported_paid_amount: 0, payments: [], marks: [], fee_history: [] } });
    if (path === '/v3/college/teacher-records/students/student-1/extended') {
      if (route.request().method() === 'PUT') {
        const body = route.request().postDataJSON();
        saves.push(body);
        Object.assign(extended, body);
      }
      return route.fulfill({ json: extended });
    }
    return route.fulfill({ json: {} });
  });
  await page.goto('/dashboard/attendance/teacher');
  await page.getByRole('button', { name: 'Edit student' }).click();
  await page.getByRole('tab', { name: 'Attendance & support' }).click();
  await expect(page.getByLabel('As of date')).toHaveValue('2026-09-01');
  await expect(page.getByLabel('Subject', { exact: true }).first()).toHaveValue('Mathematics');
  await page.getByLabel('As of date').fill('2026-09-02');
  await page.getByRole('button', { name: 'Save attendance' }).click();
  await expect.poll(() => saves.length).toBe(1);
  expect(saves[0].attendance_snapshot.today.hours[0]).toEqual({ hour: 1, time: '09:00', subject: 'Mathematics', status: 'present', legacy_note: 'Retain' });
  expect(saves[0].attendance_snapshot.as_of_date).toBe('2026-09-02');

  await page.getByLabel('Summary for parent or student').fill('New review');
  await page.getByRole('button', { name: 'Save academic review' }).click();
  await expect.poll(() => saves.length).toBe(2);
  expect(saves[1].academic_review.parent_visible_summary).toBe('New review');
  expect(saves[1].academic_review.agreed_actions[0].action).toBe('Keep studying');

  await page.getByLabel('Name', { exact: true }).last().fill('New Faculty');
  await page.getByRole('button', { name: 'Save academic contacts' }).click();
  await expect.poll(() => saves.length).toBe(3);
  expect(saves[2].academic_contacts.subject_faculty.Mathematics).toEqual({ name: 'New Faculty', official_email: 'math@example.edu', extension: '102', legacy_note: 'Retain' });
});

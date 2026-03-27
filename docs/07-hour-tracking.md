# Module 7 — Hour Tracking & Timesheets

## Overview

Students clock in and out themselves via the web app on their phone. GPS coordinates are captured at clock-in and clock-out and verified against the job's location. Hours go through a two-step approval: employer first, then admin final confirmation.

---

## Clock-In Flow

### Student side

1. Student opens their schedule on their phone (mobile browser — no native app needed)
2. Student sees their current/upcoming shift with a **"Clock In"** button
3. On clicking: browser requests GPS location (Geolocation API)
   - If denied: student cannot clock in (shown an error)
   - If granted: coordinates captured
4. GPS check runs:
   - Job has a stored lat/lng (from geocoding at job creation)
   - Student's current lat/lng vs job lat/lng → calculate distance
   - If within **300 meters** → clock-in allowed ✅
   - If outside 300m → show warning with distance, **block clock-in** ❌
5. On successful clock-in:
   - `clockInTime`, `clockInLat`, `clockInLng` stored
   - Shift status → `IN_PROGRESS`
   - Admin can see who has clocked in in real-time

### Clock-Out

1. Student opens app, sees active shift with **"Clock Out"** button
2. GPS captured again
3. Clock-out stored: `clockOutTime`, `clockOutLat`, `clockOutLng`
4. Shift status → `PENDING_APPROVAL`
5. Employer is notified: "Student X has clocked out from [Job]"

---

## GPS Verification

**Radius:** 300 meters (configurable per job if needed later)

**Distance calculation:** Haversine formula (great-circle distance between two lat/lng points)

```typescript
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
```

**Edge cases:**
- Student's GPS is inaccurate (common indoors): admin can manually override clock-in
- Job spans a large outdoor area: admin can set a wider radius for that job
- Student forgot to clock out: admin or employer can manually set clock-out time

---

## Manual Override (Admin)

Admin can edit any clock-in/clock-out time directly with a note explaining the override.
All manual edits are logged with: who changed it, when, old value, new value.

---

## Approval Flow

After student clocks out (status: `PENDING_APPROVAL`):

1. Admin sees all pending shifts in their approval queue
2. Admin reviews: student name, shift date, clock-in/out times, GPS distance, calculated hours
3. Admin **approves** → status: `APPROVED`
4. Worked week counter on student's contract is updated
5. Fase A alert logic runs (check if new alert thresholds crossed)

⚠️ Only `APPROVED` shifts count toward payroll and worked weeks.

---

## Timesheet View

### Admin View (`/admin/timesheets`)
- Filter by: date range, employer, student, status
- Bulk approve (select multiple → approve all)
- Export to CSV (for Nmbrs import)
- See GPS coordinates and distance from job for each clock-in
- View clock-in GPS map (student pin vs job location)

### Student View (`/student/hours`)
- Their own clock-in/out history
- Status of each shift
- Cannot edit times

---

## No-Show Handling

If a student accepted a shift but never clocked in:
- **1 hour after scheduled start**: admin receives alert "Student X may be a no-show at [Job]"
- Admin can manually mark as `NO_SHOW`
- No-show does not count as a worked week
- Employer notified so they can make alternative arrangements

---

## Data Stored Per Clock Event

| Field | Description |
|---|---|
| `clockInTime` | UTC datetime of clock-in |
| `clockInLat` / `clockInLng` | GPS coordinates at clock-in |
| `clockInDistanceM` | Distance from job location in meters (calculated, stored) |
| `clockOutTime` | UTC datetime of clock-out |
| `clockOutLat` / `clockOutLng` | GPS coordinates at clock-out |
| `manualOverride` | Boolean — was time manually adjusted? |
| `overrideNote` | Reason for manual adjustment |
| `overrideBy` | Admin user ID who made the override |

---

## Hours Calculation

```
actualHours = (clockOutTime − clockInTime) in decimal hours − (breakMinutes / 60)

Example:
  clockIn  = 09:00
  clockOut = 17:30
  break    = 30 min
  hours    = 8.5 − 0.5 = 8.0 hours
```

This is what gets pushed to Nmbrs for payroll.

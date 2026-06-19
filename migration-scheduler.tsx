import { useState, useMemo } from "react";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  cream: "#F7F4EF",
  ink: "#1A1A1A",
  slate: "#4A5568",
  slateLight: "#718096",
  rule: "#D4CFC8",
  indigo: "#3730A3",
  indigoLight: "#EEF2FF",
  indigoMid: "#6366F1",
  amber: "#B45309",
  amberLight: "#FEF3C7",
  red: "#991B1B",
  redLight: "#FEE2E2",
  green: "#166534",
  greenLight: "#DCFCE7",
  greenMid: "#16A34A",
  white: "#FFFFFF",
};

// ─── Sample data scenarios ────────────────────────────────────────────────────
const today = new Date();
today.setHours(0, 0, 0, 0);

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function dateStr(d) {
  if (typeof d === "string") return d.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDate(s) {
  const [y, mo, day] = s.split("-").map(Number);
  return new Date(y, mo - 1, day);
}

const SCENARIOS = {
  "Clean User": {
    description: "All constraints align – broad availability across the window.",
    user: {
      name: "Sarah Chen",
      location: "Washington D.C.",
      calendar: "US Calendar",
      cohort: "Default Cohort",
      applications: ["HR Portal"],
    },
    calendars: {
      "US Calendar": {
        timezone: "America/New_York",
        blackouts: [
          { start: dateStr(addDays(today, 18)), end: dateStr(addDays(today, 21)), reason: "Thanksgiving freeze" },
        ],
      },
    },
    applications: {
      "HR Portal": {
        windows: [
          {
            id: "W1",
            label: "Q1 Window",
            start: dateStr(addDays(today, 2)),
            end: dateStr(addDays(today, 60)),
          },
        ],
        userWindow: "W1",
      },
    },
    cohorts: {
      "Default Cohort": {
        slotHours: [8, 9, 10, 11, 12, 13, 14],
        capacityPerDay: null, // unlimited
        bookedDays: {},
      },
    },
  },

  "App Window Collision": {
    description: "Two applications with non-overlapping windows – user is fully blocked.",
    user: {
      name: "Alice Mbeki",
      location: "Nairobi",
      calendar: "Global Calendar",
      cohort: "Default Cohort",
      applications: ["Finance App", "Procurement App"],
    },
    calendars: {
      "Global Calendar": {
        timezone: "UTC",
        blackouts: [],
      },
    },
    applications: {
      "Finance App": {
        windows: [
          { id: "W-FIN", label: "Feb Window", start: dateStr(addDays(today, 5)), end: dateStr(addDays(today, 20)) },
        ],
        userWindow: "W-FIN",
      },
      "Procurement App": {
        windows: [
          { id: "W-PROC", label: "Late Window", start: dateStr(addDays(today, 35)), end: dateStr(addDays(today, 55)) },
        ],
        userWindow: "W-PROC",
      },
    },
    cohorts: {
      "Default Cohort": {
        slotHours: [8, 9, 10, 11, 12, 13, 14],
        capacityPerDay: null,
        bookedDays: {},
      },
    },
  },

  "Calendar Blackout": {
    description: "Calendar freeze period consumes most of the only valid application window.",
    user: {
      name: "Marco Rossi",
      location: "Rome",
      calendar: "EU Calendar",
      cohort: "EMEA Cohort",
      applications: ["ERP System"],
    },
    calendars: {
      "EU Calendar": {
        timezone: "Europe/Rome",
        blackouts: [
          {
            start: dateStr(addDays(today, 8)),
            end: dateStr(addDays(today, 25)),
            reason: "Year-end financial freeze",
          },
        ],
      },
    },
    applications: {
      "ERP System": {
        windows: [
          { id: "W-ERP", label: "Transition Window", start: dateStr(addDays(today, 5)), end: dateStr(addDays(today, 28)) },
        ],
        userWindow: "W-ERP",
      },
    },
    cohorts: {
      "EMEA Cohort": {
        slotHours: [9, 10, 11, 12, 13],
        capacityPerDay: 8,
        bookedDays: {},
      },
    },
  },

  "Cohort Full": {
    description: "Cohort is fully booked on all valid dates – support team needs to open capacity.",
    user: {
      name: "Wei Zhang",
      location: "Beijing",
      calendar: "China Calendar",
      cohort: "APAC Wave 1",
      applications: ["Directory Services"],
    },
    calendars: {
      "China Calendar": {
        timezone: "Asia/Shanghai",
        blackouts: [
          { start: dateStr(addDays(today, 12)), end: dateStr(addDays(today, 14)), reason: "National holiday" },
        ],
      },
    },
    applications: {
      "Directory Services": {
        windows: [
          { id: "W-DIR", label: "APAC Window", start: dateStr(addDays(today, 3)), end: dateStr(addDays(today, 30)) },
        ],
        userWindow: "W-DIR",
      },
    },
    cohorts: {
      "APAC Wave 1": {
        slotHours: [8, 9, 10, 11],
        capacityPerDay: 5,
        bookedDays: (() => {
          const booked = {};
          for (let i = 3; i <= 30; i++) {
            if (i !== 12 && i !== 13 && i !== 14) {
              booked[dateStr(addDays(today, i))] = 5;
            }
          }
          return booked;
        })(),
      },
    },
  },

  "Unassigned App User": {
    description: "User appears on an application roster but has no migration window assigned.",
    user: {
      name: "Priya Nair",
      location: "Chennai",
      calendar: "India Calendar",
      cohort: "Default Cohort",
      applications: ["Payroll System"],
    },
    calendars: {
      "India Calendar": {
        timezone: "Asia/Kolkata",
        blackouts: [],
      },
    },
    applications: {
      "Payroll System": {
        windows: [
          { id: "W-PAY", label: "Payroll Window", start: dateStr(addDays(today, 10)), end: dateStr(addDays(today, 40)) },
        ],
        userWindow: null, // assigned to app but no window
      },
    },
    cohorts: {
      "Default Cohort": {
        slotHours: [8, 9, 10, 11, 12, 13, 14],
        capacityPerDay: null,
        bookedDays: {},
      },
    },
  },
};

// ─── Constraint engine ────────────────────────────────────────────────────────
function computeAvailability(scenario) {
  const { user, calendars, applications, cohorts } = scenario;
  const results = [];
  const diagnostics = {
    calendarBlackouts: [],
    appWindowDates: null, // null = no restriction, [] = fully blocked
    appBlockReasons: [],
    cohortFullDays: [],
  };

  // Check for unassigned app user
  let appFullyBlocked = false;
  let appIntersection = null; // null = no app constraint yet

  for (const appName of user.applications) {
    const app = applications[appName];
    if (!app) continue;

    if (app.userWindow === null) {
      diagnostics.appBlockReasons.push(`${appName}: user is on roster but has no migration window assigned`);
      appFullyBlocked = true;
      break;
    }

    const win = app.windows.find((w) => w.id === app.userWindow);
    if (!win) {
      diagnostics.appBlockReasons.push(`${appName}: assigned window not found`);
      appFullyBlocked = true;
      break;
    }

    const winStart = parseDate(win.start);
    const winEnd = parseDate(win.end);

    diagnostics.appBlockReasons.push(`${appName}: window "${win.label}" (${win.start} → ${win.end})`);

    if (appIntersection === null) {
      appIntersection = { start: winStart, end: winEnd };
    } else {
      // intersect
      appIntersection = {
        start: appIntersection.start > winStart ? appIntersection.start : winStart,
        end: appIntersection.end < winEnd ? appIntersection.end : winEnd,
      };
    }
  }

  if (appFullyBlocked) {
    diagnostics.appWindowDates = [];
    return { dates: [], diagnostics };
  }

  const cal = calendars[user.calendar];
  const cohort = cohorts[user.cohort];

  for (let i = 0; i < 90; i++) {
    const d = addDays(today, i);
    const ds = dateStr(d);
    const record = { date: d, dateStr: ds, available: true, blocks: [] };

    // Weekends – skip
    const dow = d.getDay();
    if (dow === 0 || dow === 6) {
      record.available = false;
      record.blocks.push("Weekend");
      results.push(record);
      continue;
    }

    // Calendar blackouts
    if (cal) {
      for (const bo of cal.blackouts) {
        if (ds >= bo.start && ds <= bo.end) {
          record.available = false;
          record.blocks.push(`Calendar blackout: ${bo.reason}`);
          if (!diagnostics.calendarBlackouts.find((x) => x.reason === bo.reason)) {
            diagnostics.calendarBlackouts.push(bo);
          }
        }
      }
    }

    // Application window intersection
    if (user.applications.length > 0) {
      if (appIntersection === null || d < appIntersection.start || d > appIntersection.end) {
        record.available = false;
        record.blocks.push("Outside application migration window");
      }
    }

    // Cohort capacity
    if (cohort) {
      const booked = cohort.bookedDays[ds] || 0;
      const cap = cohort.capacityPerDay;
      if (cap !== null && booked >= cap) {
        record.available = false;
        record.blocks.push(`Cohort fully booked (${booked}/${cap} slots)`);
        diagnostics.cohortFullDays.push(ds);
      }
    }

    results.push(record);
  }

  diagnostics.appWindowDates = appIntersection;
  return { dates: results, diagnostics };
}

// ─── Components ───────────────────────────────────────────────────────────────

function Badge({ color, bg, children }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 2,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color,
        background: bg,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {children}
    </span>
  );
}

function ConstraintRow({ label, status, detail }) {
  const isOk = status === "ok";
  const isWarn = status === "warn";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "10px 0",
        borderBottom: `1px solid ${T.rule}`,
      }}
    >
      <div style={{ marginTop: 1 }}>
        {isOk ? (
          <span style={{ color: T.greenMid, fontSize: 16 }}>✓</span>
        ) : isWarn ? (
          <span style={{ color: T.amber, fontSize: 16 }}>⚠</span>
        ) : (
          <span style={{ color: T.red, fontSize: 16 }}>✕</span>
        )}
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13, color: T.ink, fontFamily: "'Inter', sans-serif" }}>{label}</div>
        <div style={{ fontSize: 12, color: T.slate, marginTop: 2, fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>{detail}</div>
      </div>
    </div>
  );
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function CalendarGrid({ dates, onSelectDate, selectedDate }) {
  const availableCount = dates.filter((d) => d.available).length;

  // Index every in-range day by its date string for quick lookup
  const dayMap = useMemo(() => {
    const m = {};
    for (const d of dates) m[d.dateStr] = d;
    return m;
  }, [dates]);

  // The month the user is currently viewing – default to today's month
  const [viewMonth, setViewMonth] = useState(() => {
    const t = new Date();
    return { year: t.getFullYear(), month: t.getMonth() };
  });

  // Range bounds (first and last day we have data for)
  const rangeStart = dates.length ? dates[0].date : new Date();
  const rangeEnd = dates.length ? dates[dates.length - 1].date : new Date();

  const firstAvailable = useMemo(() => dates.find((d) => d.available), [dates]);

  // Build the calendar matrix for the viewed month
  const monthCells = useMemo(() => {
    const { year, month } = viewMonth;
    const first = new Date(year, month, 1);
    const startDow = first.getDay(); // 0 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startDow; i++) cells.push(null); // leading blanks
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const ds = dateStr(d);
      cells.push({ day, ds, record: dayMap[ds] || null });
    }
    while (cells.length % 7 !== 0) cells.push(null); // trailing blanks
    return cells;
  }, [viewMonth, dayMap]);

  const monthLabel = new Date(viewMonth.year, viewMonth.month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const canGoBack =
    new Date(viewMonth.year, viewMonth.month, 1) >
    new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
  const canGoFwd =
    new Date(viewMonth.year, viewMonth.month, 1) <
    new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1);

  const step = (delta) => {
    setViewMonth((vm) => {
      const d = new Date(vm.year, vm.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const jumpToFirstAvailable = () => {
    if (!firstAvailable) return;
    setViewMonth({ year: firstAvailable.date.getFullYear(), month: firstAvailable.date.getMonth() });
  };

  // Does the currently-viewed month contain any available date?
  const monthHasAvailable = monthCells.some((c) => c && c.record && c.record.available);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 12,
          marginBottom: 16,
          paddingBottom: 12,
          borderBottom: `1px solid ${T.rule}`,
        }}
      >
        <span style={{ fontFamily: "Georgia, serif", fontSize: 20, color: T.ink, fontWeight: 700 }}>
          Choose a migration date
        </span>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.slateLight }}>
          {availableCount} available in the next 90 days
        </span>
      </div>

      {availableCount === 0 && (
        <div
          style={{
            background: T.redLight,
            border: `1px solid #FCA5A5`,
            borderRadius: 2,
            padding: "14px 18px",
            marginBottom: 20,
          }}
        >
          <div style={{ fontWeight: 700, color: T.red, fontSize: 13, fontFamily: "'Inter', sans-serif" }}>
            No dates available right now
          </div>
          <div style={{ color: T.red, fontSize: 12, marginTop: 4, fontFamily: "'Inter', sans-serif" }}>
            Something is blocking every date in the next 90 days. The checks on the right show what it is and who can help.
          </div>
        </div>
      )}

      {/* Month navigation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button
          onClick={() => step(-1)}
          disabled={!canGoBack}
          aria-label="Previous month"
          style={{
            width: 32,
            height: 32,
            border: `1px solid ${T.rule}`,
            borderRadius: 2,
            background: T.white,
            color: canGoBack ? T.ink : "#C4BDB5",
            fontSize: 16,
            cursor: canGoBack ? "pointer" : "default",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          ‹
        </button>
        <span style={{ fontFamily: "Georgia, serif", fontSize: 17, fontWeight: 700, color: T.ink }}>
          {monthLabel}
        </span>
        <button
          onClick={() => step(1)}
          disabled={!canGoFwd}
          aria-label="Next month"
          style={{
            width: 32,
            height: 32,
            border: `1px solid ${T.rule}`,
            borderRadius: 2,
            background: T.white,
            color: canGoFwd ? T.ink : "#C4BDB5",
            fontSize: 16,
            cursor: canGoFwd ? "pointer" : "default",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          ›
        </button>
      </div>

      {/* Weekday header */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            style={{
              textAlign: "center",
              fontFamily: "'Inter', sans-serif",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: T.slateLight,
              padding: "4px 0",
            }}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {monthCells.map((cell, i) => {
          if (!cell) return <div key={`b${i}`} />;
          const rec = cell.record;
          const isAvail = rec && rec.available;
          const isSelected = selectedDate && selectedDate.dateStr === cell.ds;
          const inRange = !!rec;
          // Quiet by default: every unavailable day (in range or out) reads as one muted tone.
          // Only available days get the white tappable card; only the selected day gets colour.
          const bg = isSelected ? T.indigoLight : isAvail ? T.white : T.cream;
          const fg = isSelected ? T.indigo : isAvail ? T.ink : "#C4BDB5";
          return (
            <button
              key={cell.ds}
              onClick={() => isAvail && onSelectDate(rec)}
              disabled={!isAvail}
              title={rec && !isAvail ? rec.blocks.join("; ") : isAvail ? "Available" : ""}
              style={{
                aspectRatio: "1 / 1",
                minHeight: 40,
                border: isSelected
                  ? `2px solid ${T.indigo}`
                  : isAvail
                  ? `1px solid ${T.slateLight}`
                  : "1px solid transparent",
                borderRadius: 2,
                background: bg,
                color: fg,
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                fontWeight: isAvail ? 600 : 400,
                cursor: isAvail ? "pointer" : "default",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                position: "relative",
                transition: "all 0.1s",
              }}
            >
              <span>{cell.day}</span>
              {isAvail && !isSelected && (
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: T.greenMid }} />
              )}
            </button>
          );
        })}
      </div>

      {/* No-availability-this-month nudge */}
      {availableCount > 0 && !monthHasAvailable && firstAvailable && (
        <div
          style={{
            marginTop: 14,
            padding: "10px 14px",
            background: T.indigoLight,
            border: `1px solid #C7D2FE`,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.indigo }}>
            No open dates this month. Next available:{" "}
            {firstAvailable.date.toLocaleDateString("en-US", { month: "long", day: "numeric" })}.
          </span>
          <button
            onClick={jumpToFirstAvailable}
            style={{
              border: `1px solid ${T.indigo}`,
              borderRadius: 2,
              background: T.white,
              color: T.indigo,
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              fontWeight: 600,
              padding: "5px 12px",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Jump to it
          </button>
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          marginTop: 16,
          display: "flex",
          alignItems: "center",
          gap: 18,
          fontFamily: "'Inter', sans-serif",
          fontSize: 11,
          color: T.slateLight,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 14, height: 14, border: `1px solid ${T.slateLight}`, background: T.white, borderRadius: 2, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: T.greenMid }} />
          </span>
          Available – tap to book
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 14, height: 14, background: T.cream, border: `1px solid ${T.rule}`, borderRadius: 2, display: "inline-block" }} />
          Unavailable
        </span>
      </div>
    </div>
  );
}

function SlotPanel({ date, scenario, onClose }) {
  const cohort = scenario.cohorts[scenario.user.cohort];
  const slots = cohort?.slotHours || [8, 9, 10, 11, 12, 13, 14];
  const ds = dateStr(date.date);
  const booked = cohort?.bookedDays?.[ds] || 0;
  const cap = cohort?.capacityPerDay;

  const [selected, setSelected] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  const formatHour = (h) => {
    const suffix = h >= 12 ? "PM" : "AM";
    const display = h > 12 ? h - 12 : h;
    return `${display}:00 ${suffix}`;
  };

  return (
    <div
      style={{
        background: T.white,
        border: `1px solid ${T.rule}`,
        borderRadius: 2,
        padding: 20,
        marginTop: 20,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 700, color: T.ink }}>
            {date.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.slateLight, marginTop: 2 }}>
            Select a migration start time · migration takes 2–8 hours after start
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: T.slateLight,
            fontSize: 18,
            cursor: "pointer",
            padding: "0 4px",
          }}
        >
          ×
        </button>
      </div>

      {cap !== null && (
        <div
          style={{
            background: T.amberLight,
            border: `1px solid #FCD34D`,
            borderRadius: 2,
            padding: "8px 12px",
            marginBottom: 14,
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            color: T.amber,
          }}
        >
          Cohort capacity: {booked} of {cap} slots booked
        </div>
      )}

      {confirmed ? (
        <div
          style={{
            background: T.greenLight,
            border: `1px solid #86EFAC`,
            borderRadius: 2,
            padding: "14px 18px",
            textAlign: "center",
          }}
        >
          <div style={{ fontWeight: 700, color: T.green, fontFamily: "'Inter', sans-serif", fontSize: 14 }}>
            Migration scheduled
          </div>
          <div style={{ color: T.green, fontSize: 12, marginTop: 4, fontFamily: "'Inter', sans-serif" }}>
            {date.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at{" "}
            {formatHour(selected)}
          </div>
          <button
            onClick={() => { setConfirmed(false); setSelected(null); }}
            style={{
              marginTop: 10,
              background: "none",
              border: `1px solid ${T.green}`,
              borderRadius: 2,
              color: T.green,
              fontSize: 11,
              padding: "4px 10px",
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Change
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {slots.map((h) => (
              <button
                key={h}
                onClick={() => setSelected(h)}
                style={{
                  padding: "8px 14px",
                  border: selected === h ? `2px solid ${T.indigo}` : `1px solid ${T.rule}`,
                  borderRadius: 2,
                  background: selected === h ? T.indigoLight : T.white,
                  color: selected === h ? T.indigo : T.ink,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                  fontWeight: selected === h ? 700 : 400,
                  cursor: "pointer",
                }}
              >
                {formatHour(h)}
              </button>
            ))}
          </div>
          <button
            onClick={() => selected && setConfirmed(true)}
            disabled={!selected}
            style={{
              padding: "10px 20px",
              background: selected ? T.indigo : T.rule,
              color: selected ? T.white : T.slateLight,
              border: "none",
              borderRadius: 2,
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              cursor: selected ? "pointer" : "default",
              transition: "background 0.15s",
            }}
          >
            Confirm migration slot
          </button>
        </>
      )}
    </div>
  );
}

function CheckBlock({ index, title, status, summary, list, detail, fix }) {
  // status: "clear" | "limited" | "blocked"
  // Quiet by default: clear states are neutral grey; only exceptions get colour.
  const map = {
    clear: { accent: T.rule, label: T.slateLight, word: "Clear", strong: false },
    limited: { accent: "#FCD34D", label: T.amber, word: "Some dates blocked", strong: true },
    blocked: { accent: "#FCA5A5", label: T.red, word: "Blocks you", strong: true },
  };
  const s = map[status];
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 5 }}>
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            color: T.ink,
            flex: 1,
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 11,
            fontWeight: s.strong ? 700 : 500,
            color: s.label,
            whiteSpace: "nowrap",
          }}
        >
          {s.word}
        </span>
      </div>
      <div style={{ paddingLeft: 12, borderLeft: `2px solid ${s.accent}` }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.slate, lineHeight: 1.5 }}>
          {summary}
        </div>
        {list && list.length > 0 && (
          <div style={{ marginTop: 5, display: "flex", flexDirection: "column", gap: 2 }}>
            {list.map((item, i) => (
              <div
                key={i}
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12,
                  color: T.ink,
                  lineHeight: 1.5,
                }}
              >
                {item}
              </div>
            ))}
          </div>
        )}
        {detail && (
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.slateLight, lineHeight: 1.5, marginTop: 5 }}>
            {detail}
          </div>
        )}
        {fix && (
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              color: s.strong ? s.label : T.slateLight,
              lineHeight: 1.5,
              marginTop: 5,
            }}
          >
            {fix}
          </div>
        )}
      </div>
    </div>
  );
}

function fmtDate(d) {
  const dt = typeof d === "string" ? parseDate(d) : d;
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function DiagnosticsPanel({ diagnostics, scenario }) {
  const { user, calendars, applications, cohorts } = scenario;
  const cal = calendars[user.calendar];
  const cohort = cohorts[user.cohort];

  const appIntersection = diagnostics.appWindowDates;
  const hasAppBlock = Array.isArray(appIntersection) && appIntersection.length === 0;
  const noIntersection =
    appIntersection !== null &&
    !Array.isArray(appIntersection) &&
    appIntersection.start > appIntersection.end;

  // ── Calendar check ──
  const calBlackouts = cal?.blackouts || [];
  const calCheck =
    calBlackouts.length > 0
      ? {
          status: "limited",
          summary: `On the ${user.calendar}, the following dates are blocked and can't be chosen:`,
          list: calBlackouts.map((bo) => `${fmtDate(bo.start)} – ${fmtDate(bo.end)}  (${bo.reason})`),
          fix: "Any date outside these periods is fine.",
        }
      : {
          status: "clear",
          summary: `No blocked dates on the ${user.calendar} in the next 90 days.`,
        };

  // ── Applications check ──
  // Build a per-application breakdown so the user sees exactly which window each app put them in.
  const appWindowLines = user.applications.map((appName) => {
    const app = applications[appName];
    if (!app) return { appName, text: "not configured" };
    if (app.userWindow === null) {
      return { appName, text: "has not assigned you a migration window", blocked: true };
    }
    const win = app.windows.find((w) => w.id === app.userWindow);
    if (!win) return { appName, text: "assigned window not found", blocked: true };
    return {
      appName,
      text: `has assigned you to migrate between ${fmtDate(win.start)} and ${fmtDate(win.end)}`,
    };
  });

  let appCheck;
  if (user.applications.length === 0) {
    appCheck = { status: "clear", summary: "None of your applications restrict when you can migrate." };
  } else if (hasAppBlock) {
    const blockedApp = appWindowLines.find((l) => l.blocked);
    const appName = blockedApp ? blockedApp.appName : "An application";
    appCheck = {
      status: "blocked",
      summary: `The ${appName} application has not assigned you a migration window, so no dates can be offered yet.`,
      list: appWindowLines.map((l) => `${l.appName} ${l.text}`),
      fix: `Contact your migration coordinator to have ${appName} schedule a window for you.`,
    };
  } else if (noIntersection) {
    appCheck = {
      status: "blocked",
      summary: "Your applications have windows that don't overlap, so there's no single date that works for all of them:",
      list: appWindowLines.map((l) => `${l.appName} ${l.text}`),
      fix: "Contact your migration coordinator – the windows need to be realigned.",
    };
  } else if (appIntersection && !Array.isArray(appIntersection)) {
    appCheck = {
      status: "limited",
      summary:
        user.applications.length === 1
          ? `${user.applications[0]} ${appWindowLines[0].text}.`
          : "Each of your applications has assigned you a window:",
      list: user.applications.length > 1 ? appWindowLines.map((l) => `${l.appName} ${l.text}`) : null,
      detail:
        user.applications.length > 1
          ? `You can migrate on dates that work for all of them: ${fmtDate(appIntersection.start)} – ${fmtDate(appIntersection.end)}.`
          : null,
    };
  } else {
    appCheck = { status: "clear", summary: "Your applications don't restrict your dates." };
  }

  // ── Support capacity check ──
  let supportCheck;
  if (!cohort || cohort.capacityPerDay === null) {
    supportCheck = {
      status: "clear",
      summary: "Your support team has room on every otherwise-available date.",
    };
  } else if (diagnostics.cohortFullDays.length > 0) {
    supportCheck = {
      status: "limited",
      summary: `Your support team handles up to ${cohort.capacityPerDay} migrations a day, and ${diagnostics.cohortFullDays.length} otherwise-available date(s) are already full.`,
      fix: "If no remaining date works for you, your support team can open more capacity.",
    };
  } else {
    supportCheck = {
      status: "clear",
      summary: `Your support team has room on every available date (up to ${cohort.capacityPerDay} migrations a day).`,
    };
  }

  return (
    <div style={{ marginTop: 32 }}>
      <div
        style={{
          fontFamily: "Georgia, serif",
          fontSize: 20,
          fontWeight: 700,
          color: T.ink,
          paddingBottom: 12,
          borderBottom: `1px solid ${T.rule}`,
          marginBottom: 8,
        }}
      >
        Why these dates?
      </div>
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 12,
          color: T.slateLight,
          marginBottom: 18,
          lineHeight: 1.5,
        }}
      >
        We start with the next 90 days and check three things. Each one can close off some dates.
      </div>

      <CheckBlock index="1" title="Your calendar" {...calCheck} />
      <CheckBlock index="2" title="Your applications" {...appCheck} />
      <CheckBlock index="3" title="Your support team" {...supportCheck} />

      {/* Your details */}
      <div style={{ marginTop: 18, paddingTop: 12, borderTop: `1px solid ${T.rule}` }}>
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 11,
            color: T.slateLight,
            lineHeight: 1.6,
          }}
        >
          {user.name} · {user.location} · {user.calendar} · {user.cohort}
          {user.applications.length > 0 ? ` · ${user.applications.join(", ")}` : ""}
        </div>
      </div>
    </div>
  );
}

// ─── Main app ─────────────────────────────────────────────────────────────────
export default function MigrationScheduler() {
  const [scenarioKey, setScenarioKey] = useState("Clean User");
  const [selectedDate, setSelectedDate] = useState(null);

  const scenario = SCENARIOS[scenarioKey];
  const { dates, diagnostics } = useMemo(() => computeAvailability(scenario), [scenario]);

  const handleScenarioChange = (key) => {
    setScenarioKey(key);
    setSelectedDate(null);
  };

  const availableCount = dates.filter((d) => d.available).length;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.cream,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: `1px solid ${T.rule}`,
          padding: "18px 32px 14px",
          background: T.white,
          display: "flex",
          alignItems: "baseline",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 700, color: T.ink, letterSpacing: "-0.01em" }}>
          Migration Scheduler
        </span>
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: T.indigoMid,
            borderLeft: `2px solid ${T.rule}`,
            paddingLeft: 16,
          }}
        >
          Availability Simulator
        </span>
      </div>

      {/* Scenario selector */}
      <div style={{ borderBottom: `1px solid ${T.rule}`, background: T.white, padding: "0 32px", display: "flex", gap: 0 }}>
        {Object.keys(SCENARIOS).map((key) => (
          <button
            key={key}
            onClick={() => handleScenarioChange(key)}
            style={{
              padding: "10px 18px",
              border: "none",
              borderBottom: scenarioKey === key ? `3px solid ${T.indigo}` : "3px solid transparent",
              background: "none",
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              fontWeight: scenarioKey === key ? 700 : 400,
              color: scenarioKey === key ? T.indigo : T.slate,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {key}
          </button>
        ))}
      </div>

      {/* Scenario description (demo control strip) */}
      <div
        style={{
          background: T.cream,
          borderBottom: `1px solid ${T.rule}`,
          padding: "9px 32px",
          fontFamily: "'Inter', sans-serif",
          fontSize: 12,
          color: T.slate,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ fontWeight: 600, color: T.ink }}>{scenario.user.name}</span>
        <span style={{ color: T.rule }}>·</span>
        <span style={{ color: T.slateLight }}>{scenario.description}</span>
        <span style={{ marginLeft: "auto", fontWeight: 600, color: availableCount > 0 ? T.slate : T.red }}>
          {availableCount} {availableCount === 1 ? "date" : "dates"} available
        </span>
      </div>

      {/* Main layout */}
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "28px 32px",
          display: "grid",
          gridTemplateColumns: "1fr 380px",
          gap: 40,
          alignItems: "start",
        }}
      >
        {/* Left: calendar + slot panel */}
        <div>
          <CalendarGrid dates={dates} onSelectDate={setSelectedDate} selectedDate={selectedDate} />
          {selectedDate && (
            <SlotPanel
              date={selectedDate}
              scenario={scenario}
              onClose={() => setSelectedDate(null)}
            />
          )}
        </div>

        {/* Right: diagnostics */}
        <div style={{ position: "sticky", top: 20 }}>
          <DiagnosticsPanel diagnostics={diagnostics} scenario={scenario} />
        </div>
      </div>
    </div>
  );
}

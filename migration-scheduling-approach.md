# Migration Self-Service Scheduling — Approach

## Bottom line

Users pick their own migration date from a calendar that only ever shows dates that work for them. Because the user does the choosing, the system never has to *optimise* an assignment — it only has to *filter* a date range down to valid choices. This keeps the engine simple: start with the next 90 days, subtract everything that doesn't apply to this user, and show what's left.

A companion view explains, in plain language, why some dates are unavailable and who can fix a blocked date.

## The question the system answers

> For this specific user, which migration dates are available — and if none are, why?

Availability is not universal. What's open for one user is closed for another depending on their location, the applications they use, and the support team handling them. The system resolves this per user by overlaying a small number of independent constraints.

## The four constraints

A date is offered to a user only if it survives all four checks below. Each is evaluated independently; a date must clear all of them.

**1. Calendar**
Every user is assigned to one calendar appropriate to their location (e.g. a US, EU, or China calendar). Each calendar carries its own blocked periods — public holidays, business freezes, and critical operational windows. Assigning a user to a local calendar handles local holidays naturally: a Beijing user on the China calendar sees Chinese holidays blocked, a Rome user on the EU calendar sees European ones.

**2. Applications**
An application keeps its own roster of users and defines one or more migration windows (date ranges in which that application permits migrations). If a user is on an application's roster, they must be assigned to one of that application's windows. A user can be on several applications' rosters and therefore carry several windows — one per application. The user's valid range is the *intersection* of all their assigned windows: a date works only if every one of their applications permits it.

If a user is on an application's roster but has not been assigned a window, they are blocked until someone assigns one. If a user is not on an application's roster at all, that application simply doesn't constrain them.

**3. Support team capacity**
Users are grouped so support teams can control daily migration volume. A group has a fixed number of slots per day; once a day is full, it drops out of availability. Users not placed in a capacity-limited group fall into a default group with no daily cap, so every otherwise-valid date stays open.

**4. The combination**
A date is available only if the calendar allows it, every assigned application window allows it, and the support group still has a slot. All four must agree.

## How availability is calculated

No optimisation engine is needed. The model is a straightforward subtraction:

1. Start with the next 90 days — assume every day is available.
2. Remove days blocked by the user's calendar.
3. Keep only days that fall inside the intersection of the user's application windows.
4. Remove days where the user's support group is already full.
5. Show what remains.

Illustratively: 90 days → remove holidays and freezes → apply application windows → remove full days → a handful of valid dates the user can choose from.

## Time and time zones

All dates and times are stored in UTC and displayed to each user in their own local time zone (defaulting to the browser setting). This is the standard store-UTC / display-local pattern. When a calendar maintainer enters a blocked date in local terms, the interface converts it to UTC for storage and converts back for display, so each user sees blocked periods correctly framed in their own time.

## Choosing a start time

A migration "slot" is a *start time*, not a fixed block. The user picks when the migration begins; the migration itself then runs for roughly two to eight hours, so the start time does not need to be precise. The available start times on a given day come from the support group's slot configuration (for example, starts permitted hourly from 08:00 to 14:00).

## Why dates may be unavailable — and who fixes it

When a user has few or no available dates, the cause is always one of the four constraints, and each has a different owner. Surfacing the specific cause is what keeps support load down: the user (or an administrator) can see exactly what to do rather than filing a ticket that says only "no dates."

| Cause | What the user sees | Who resolves it |
|---|---|---|
| Calendar blackout | The specific blocked date ranges, with reasons | Calendar owner / migration coordinator |
| No application window assigned | "Application X has not assigned you a migration window" | Application owner |
| Application windows don't overlap | Each application's window listed, so the conflict is visible | Migration coordinator (realign windows) |
| Support group full | The daily limit and how many valid dates are already taken | Local support team (open capacity) |

## Support / troubleshooting view

An administrator can look up any user and see the same per-constraint breakdown the user sees: which calendar dates are blocked, which window each application has assigned, and whether the support group has room. Because the explanation names the responsible owner for each blocking condition, the right person can act without escalation.

## Design principles applied to the interface

- **Standard month calendar.** Dates are laid out in a familiar weekday-column grid with month navigation, not a flat list, so scanning is immediate. Available days read as raised white cards; everything unavailable recedes quietly into the background.
- **Quiet by default, colour only on exceptions.** Normal and clear states are neutral. Amber and red are reserved for the one thing that needs attention — a blocked or limited condition — so the eye goes straight to it.
- **Plain language.** The explanation panel avoids internal vocabulary (no "constraint layers" or "cohorts"). It states, in the user's terms, what is blocking them and what to do.

## What this approach deliberately avoids

- **No optimisation/assignment algorithm.** Users self-select, so the system only computes valid choices.
- **No precise slot blocks.** Start times are coarse because migration duration is variable and forgiving.
- **No special-casing of users without constraints.** A user with no capacity group and no application restrictions simply sees broad availability — the same subtraction logic with nothing to subtract.

## Open items for the build

- **Capacity is the one mutable, concurrent constraint.** Two users can see the same last slot at once. Booking needs an atomic reservation (optimistic locking or a short hold), not just a display filter, or it will overbook.
- **Reschedule must release the old slot atomically.** A reschedule is a release-and-rebook; if it fails midway it must not strand the user or double-book.
- **Late / non-booking users** are handled by a separate process, out of scope here.

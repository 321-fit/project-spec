# Dashboard

> Last updated: 2026-04-02

## Overview
Role-specific home screen showing key metrics: next session, pending requests, and financial data. Coaches also see revenue charts.

## Current State
Implemented in iOS and backend.

## Components

### Backend
- Athlete dashboard: `GET /athlete/dashboard`
- Coach dashboard: `GET /coach/dashboard`
- Response includes: next event, pending request count, payment report (coach)

### iOS
- Dashboard tab: `TabBar/Tabs/DashboardTab/`
- Athlete: `DashboardTab/Athlete/AthleteDashboardViewModel.swift`
- Coach: `DashboardTab/Coach/CoachDashboardViewModel.swift`
- Charts: `DashboardTab/UI/Charts/`
- API: `DashboardTab/API/DashboardNetworkService.swift`

### Voice Assistant
- `get_balance()` tool provides balance data
- `get_my_training_events()` provides upcoming events

### Android (Planned)
- Same dashboard layout per role
- Same API calls
- Chart library equivalent for revenue donut chart

## Athlete Dashboard

### Data Displayed
| Element | Source | Description |
|---|---|---|
| Next Session | `nextEvent` | Upcoming training event card |
| Pending Requests | `requestsCount` | Number of pending coach requests |
| Balance | `balanceInfo` | Account balance (available, blocked, currency) |

### API
```
GET /athlete/dashboard → DashboardRequestsObject
  - nextEvent: EventModel?
  - pendingRequestsCount: Int
```

Balance fetched separately via `GET /athlete/balance`.

## Coach Dashboard

### Data Displayed
| Element | Source | Description |
|---|---|---|
| Next Session | `nextEvent` | Upcoming training event card |
| Pending Requests | `requestsCount` | Number of pending athlete requests |
| Revenue Chart | `revenueInfo` | Donut chart with financial breakdown |

### Revenue Chart (Coach Only)
Donut chart with 3 segments:

| Segment | Color | Description |
|---|---|---|
| **Paid** | Gradient start (blue) | Completed and paid sessions |
| **Upcoming** | Gray | Scheduled future sessions |
| **Unpaid** | Gradient finish | Completed but not yet paid out |

**Data model:**
```swift
struct RevenueChartData {
    let type: RevenueChartType  // .paid, .upcoming, .unpaid
    let percent: Double
    let value: Double
}
```

**Financial model:**
```swift
struct DashboardPaymentStatusObject {
    let currency: String
    let totalPaid: Double
    let totalUpcoming: Double
    let totalUnpaid: Double
    let total: Double
}
```

### Sessions Chart
Designed but **currently commented out** in both athlete and coach dashboards. Not yet active.

### API
```
GET /coach/dashboard → DashboardRequestsObject
  - nextEvent: EventModel?
  - pendingRequestsCount: Int
  - paymentReport: DashboardPaymentStatusObject
```

## Navigation from Dashboard
- Tap next session card → Schedule tab, specific date
- Tap pending requests → Clients/Coaches tab, Requests segment
- Tap balance → Balance settings

## Known Issues / Tech Debt
- Sessions chart designed but commented out — not active yet
- Athlete dashboard has no charts — only text metrics
- Coach revenue chart doesn't break down per-athlete

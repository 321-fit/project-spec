# Clients & Coaches (Users List)

> Last updated: 2026-04-02

## Overview
Tab for discovering and managing user connections. Athletes browse and search coaches; coaches manage their client athletes. Both roles can view pending training requests in the Requests segment.

## Current State
Fully implemented in iOS and backend. Voice assistant can list connected users.

## Components

### Backend
- Athlete: `GET /athlete/coaches` (search/filter), `GET /athlete/my-coaches`, `POST /athlete/coaches/{id}/invite`
- Coach: `GET /coach/athletes`, `GET /coach/clients`, `POST /coach/clients/{athlete_id}`
- Pending requests: `GET /{role}/pending-requests`, `POST /{role}/pending-requests/{id}/approve|decline`
- Favorites: `GET/POST/DELETE /{role}/favorites`

### iOS
- Clients tab: `TabBar/Tabs/ClientsTab/`
- Coaches list (athlete view): `ClientsTab/CoachesList/`
- Clients list (coach view): `ClientsTab/AthletesList/`
- Requests: `ClientsTab/Requests/`
- Invite: `ClientsTab/Invite/`

### Voice Assistant
- `get_connected_athletes()` — coach's client list
- `get_sport_coaches()` — available coaches
- `resolve_entity("athlete", query)` — find athlete by name

### Android (Planned)
- Same list views with search and filters
- Same request management UI
- Same invite flow

## Athlete View: Coaches List

### Search & Filter
Paginated, searchable, filterable directory of coaches.

**Screens:**
- `CoachesListView` — main list with search bar
- `CoachesSearchAndFilterView` — search + filter UI
- `CoachesFilterView` — advanced filters panel
- `CoachesFilterSportView` — filter by sport type
- `CoachesListSortView` — sort order selection
- `SelectCoachProfileView` — coach detail/profile

**Filter Parameters:**
| Filter | Query Param | Description |
|---|---|---|
| Sport | `sport_ids` | Sport type IDs |
| Price min | `price_min` | Minimum session price |
| Price max | `price_max` | Maximum session price |
| Time availability | `time_availability` | Time of day preference |
| Day availability | `weekday_availability` | Days of week |
| Languages | `languages` | Language codes |
| Country | `country` | Country code |
| Sort | `ordering` | Sort field |

**Pagination:** `page` (1-indexed) + `page_size` query params. Uses `PaginatedResponse<T>`.

### My Coaches
- `GET /athlete/my-coaches` — list of connected coaches
- `DELETE /athlete/my-coaches/{coach_id}` — remove connection

## Coach View: Clients List

### Client Directory
- `ClientsListView` — list of connected athletes
- Each athlete shows: upcoming events count, past events count, payment stats
- `GET /coach/clients` — active clients
- `GET /coach/athletes` — all athletes

## Requests Segment

Both roles share `RequestsSegmentView` to toggle between "List" and "Requests" tabs.

### Pending Requests
Shows `PendingRequestObject` items with accept/reject actions.

```swift
struct PendingRequestObject {
    let id: Int
    let status: String
    let event: PendingRequestEvent
    let updatedFields: PendingRequestUpdatedFieldsObject?  // old → new if rescheduled
}
```

### Actions
- **Approve:** `POST /{role}/pending-requests/{id}/approve`
- **Decline:** `POST /{role}/pending-requests/{id}/decline`

Approval/decline triggers push notifications (see [Event Statuses spec](event-statuses.md)).

## Favorites

Both roles can favorite users:
- `GET /{role}/favorites` — list favorites
- `POST /{role}/favorites` — add favorite (body: user ID)
- `DELETE /{role}/favorites/{user_id}` — remove favorite

Favorites are managed via `AppFlowManager` subjects:
- `onAddFavoriteUpdate`
- `onRemoveFavoriteUpdate`

## Invite System

Coaches can invite athletes to the platform:
- `POST /athlete/coaches/{coach_id}/invite` — send training invite
- Deep link generation via `ShareLinksService`
- Invite preview: `ClientsTab/Invite/InvitePreviewView.swift`

See [Deep Linking & Referrals spec](deep-linking-referrals.md) for full invite flow.

## Coach-Athlete Connection

### How connections are established
1. **Athlete finds coach** via search → books a session → connection created
2. **Coach invites athlete** via deep link → athlete onboards → connection created
3. **Coach adds athlete** manually: `POST /coach/clients/{athlete_id}`

### Connection management
- Athletes can remove coaches: `DELETE /athlete/my-coaches/{coach_id}`
- Coaches view all connected athletes with stats
- User exclusion (block) system exists in backend (`user_exclusion` table)

## Known Issues / Tech Debt
- Athlete can't "discover" coaches without filters — no recommendation engine
- Coach can't remove athletes from client list (only athlete can disconnect)
- User blocking (`user_exclusion`) exists in DB but no UI for it

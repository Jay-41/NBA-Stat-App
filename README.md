# NBA Stat App

Full-stack web app to explore **NBA player per-game averages** for the current season. The **React** frontend talks to a small **Express** backend that fetches and normalizes data from the official **NBA Stats** API (`stats.nba.com`), so the browser never hits that API directly (avoiding CORS issues).

## Stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Frontend | React 19, TypeScript, Vite, Recharts |
| Backend  | Node.js, Express, TypeScript        |

## Prerequisites

- [Node.js](https://nodejs.org/) 20+ recommended (matches current tooling)

## Setup

From the repository root:

```bash
npm install
```

## Run in development

Start **both** the API and the Vite dev server:

```bash
npm run dev
```

- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **API:** [http://localhost:5174](http://localhost:5174)

During development, Vite proxies requests under `/api` to the backend on port `5174`.

Run only the client or only the server if you prefer:

```bash
npm run dev -w client
npm run dev -w server
```

If you open the UI without the API running, `/api` calls will fail until the server is up.

## Production build

```bash
npm run build
```

- Compiles the server to `server/dist/`.
- Builds static assets to `client/dist/`.

Run the compiled API:

```bash
npm start
```

Serve `client/dist/` with any static file host and point API requests to wherever `npm start` is listening (default port `5174`, or set `PORT`).

## API (summary)

| Method | Path                 | Description |
| ------ | -------------------- | ----------- |
| GET    | `/api/health`        | Health check |
| GET    | `/api/season/current` | Current NBA season string (e.g. `2025-26`) |
| GET    | `/api/players`       | Paginated, filterable player list |

### `/api/players` query parameters

| Parameter   | Description |
| ----------- | ----------- |
| `season`    | Optional. Defaults to inferred current season. |
| `search`    | Substring match on player name (case-insensitive). |
| `team`      | Team abbreviation (e.g. `LAL`). |
| `sortBy`    | One of: `pts`, `reb`, `ast`, `stl`, `blk`, `min`, `gp`, etc. |
| `sortDir`   | `asc` or `desc` (default `desc`). |
| `limit`     | Page size (capped server-side). |
| `offset`    | Pagination offset (non-negative). |
| `seasonType`| e.g. `Regular Season` |
| `perMode`   | e.g. `PerGame` |

Responses are cached briefly on the server to reduce repeated calls to the upstream API.

## Project layout

```
NBA-Stat-App/
├── client/          # Vite + React UI
├── server/          # Express API + NBA stats fetching
├── package.json     # Workspace root; `npm run dev` runs both apps
└── README.md
```

## Data & reliability

The backend calls **stats.nba.com**. Availability can depend on network, IP reputation, or upstream changes. If requests fail, check the JSON error from `/api/players` or the server console.

## License

Use and modify for your own projects; respect NBA/third-party terms for the underlying statistics data.

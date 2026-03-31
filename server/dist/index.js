"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
function getCurrentSeasonString(now = new Date()) {
    // NBA season starts around October.
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-12
    const startYear = month >= 10 ? year : year - 1;
    const endYY = String(startYear + 1).slice(-2);
    return `${startYear}-${endYY}`;
}
function buildStatsNbaHeaders() {
    return {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        Connection: "keep-alive",
        Origin: "https://www.nba.com",
        Referer: "https://www.nba.com/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    };
}
async function fetchLeagueDashPlayerStats(opts) {
    const url = new URL("https://stats.nba.com/stats/leaguedashplayerstats");
    url.searchParams.set("College", "");
    url.searchParams.set("Conference", "");
    url.searchParams.set("Country", "");
    url.searchParams.set("DateFrom", "");
    url.searchParams.set("DateTo", "");
    url.searchParams.set("Division", "");
    url.searchParams.set("DraftPick", "");
    url.searchParams.set("DraftYear", "");
    url.searchParams.set("GameScope", "");
    url.searchParams.set("GameSegment", "");
    url.searchParams.set("Height", "");
    url.searchParams.set("LastNGames", "0");
    url.searchParams.set("LeagueID", "00");
    url.searchParams.set("Location", "");
    url.searchParams.set("MeasureType", "Base");
    url.searchParams.set("Month", "0");
    url.searchParams.set("OpponentTeamID", "0");
    url.searchParams.set("Outcome", "");
    url.searchParams.set("PORound", "0");
    url.searchParams.set("PaceAdjust", "N");
    url.searchParams.set("PerMode", opts.perMode);
    url.searchParams.set("Period", "0");
    url.searchParams.set("PlayerExperience", "");
    url.searchParams.set("PlayerPosition", "");
    url.searchParams.set("PlusMinus", "N");
    url.searchParams.set("Rank", "N");
    url.searchParams.set("Season", opts.season);
    url.searchParams.set("SeasonSegment", "");
    url.searchParams.set("SeasonType", opts.seasonType);
    url.searchParams.set("ShotClockRange", "");
    url.searchParams.set("StarterBench", "");
    url.searchParams.set("TeamID", "0");
    url.searchParams.set("TwoWay", "0");
    url.searchParams.set("VsConference", "");
    url.searchParams.set("VsDivision", "");
    url.searchParams.set("Weight", "");
    const res = await fetch(url.toString(), {
        headers: buildStatsNbaHeaders(),
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`stats.nba.com error ${res.status} ${res.statusText}${text ? `: ${text.slice(0, 200)}` : ""}`);
    }
    return (await res.json());
}
function rowsFromResult(json) {
    const rs = (Array.isArray(json?.resultSets) && json.resultSets[0]) || json?.resultSet;
    const headers = rs?.headers;
    const rowSet = rs?.rowSet;
    if (!headers || !rowSet)
        return [];
    return rowSet.map((row) => {
        const obj = {};
        headers.forEach((h, i) => {
            obj[h] = row[i] ?? null;
        });
        return obj;
    });
}
function toNumber(v) {
    if (typeof v === "number")
        return Number.isFinite(v) ? v : null;
    if (typeof v === "string") {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}
function normalizePlayers(rows) {
    return rows.map((r) => ({
        playerId: toNumber(r.PLAYER_ID) ?? 0,
        playerName: String(r.PLAYER_NAME ?? ""),
        teamId: toNumber(r.TEAM_ID) ?? 0,
        teamAbbr: String(r.TEAM_ABBREVIATION ?? ""),
        gp: toNumber(r.GP) ?? 0,
        min: toNumber(r.MIN) ?? 0,
        pts: toNumber(r.PTS) ?? 0,
        reb: toNumber(r.REB) ?? 0,
        ast: toNumber(r.AST) ?? 0,
        stl: toNumber(r.STL) ?? 0,
        blk: toNumber(r.BLK) ?? 0,
        tov: toNumber(r.TOV) ?? 0,
        fgPct: toNumber(r.FG_PCT),
        fg3Pct: toNumber(r.FG3_PCT),
        ftPct: toNumber(r.FT_PCT),
    }));
}
function includesInsensitive(haystack, needle) {
    return haystack.toLowerCase().includes(needle.toLowerCase());
}
const cache = new Map();
async function getCachedLeagueDash(opts) {
    const key = `${opts.season}|${opts.seasonType}|${opts.perMode}`;
    const now = Date.now();
    const hit = cache.get(key);
    if (hit && hit.expiresAt > now)
        return hit.data;
    const json = await fetchLeagueDashPlayerStats(opts);
    const rows = rowsFromResult(json);
    const data = normalizePlayers(rows).filter((p) => p.playerId && p.playerName);
    cache.set(key, { expiresAt: now + 10 * 60 * 1000, data });
    return data;
}
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
});
app.get("/api/season/current", (_req, res) => {
    res.json({ season: getCurrentSeasonString() });
});
app.get("/api/players", async (req, res) => {
    try {
        const season = typeof req.query.season === "string" && req.query.season.trim()
            ? req.query.season.trim()
            : getCurrentSeasonString();
        const seasonType = typeof req.query.seasonType === "string" && req.query.seasonType.trim()
            ? req.query.seasonType.trim()
            : "Regular Season";
        const perMode = typeof req.query.perMode === "string" && req.query.perMode.trim()
            ? req.query.perMode.trim()
            : "PerGame";
        const search = typeof req.query.search === "string" ? req.query.search : "";
        const team = typeof req.query.team === "string" ? req.query.team : "";
        const sortBy = typeof req.query.sortBy === "string" ? req.query.sortBy : "pts";
        const sortDir = typeof req.query.sortDir === "string" ? req.query.sortDir : "desc";
        const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : 100;
        const offset = typeof req.query.offset === "string" ? Number(req.query.offset) : 0;
        const all = await getCachedLeagueDash({ season, seasonType, perMode });
        let filtered = all;
        if (search.trim()) {
            filtered = filtered.filter((p) => includesInsensitive(p.playerName, search));
        }
        if (team.trim()) {
            filtered = filtered.filter((p) => p.teamAbbr === team.trim().toUpperCase());
        }
        const sortKey = sortBy;
        const dir = sortDir === "asc" ? 1 : -1;
        filtered = [...filtered].sort((a, b) => {
            const av = a[sortKey];
            const bv = b[sortKey];
            if (typeof av === "number" && typeof bv === "number")
                return (av - bv) * dir;
            return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
        });
        const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;
        const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 250) : 100;
        res.json({
            season,
            seasonType,
            perMode,
            total: filtered.length,
            offset: safeOffset,
            limit: safeLimit,
            players: filtered.slice(safeOffset, safeOffset + safeLimit),
            teams: Array.from(new Set(all.map((p) => p.teamAbbr))).sort(),
        });
    }
    catch (e) {
        res.status(500).json({ error: e?.message ?? "Unknown error" });
    }
});
const port = Number(process.env.PORT ?? 5174);
app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on http://localhost:${port}`);
});

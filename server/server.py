#!/usr/bin/env python3
"""Bert The Bird same-origin PWA + durable leaderboard/challenge API.

Managed hosting uses DATABASE_URL (MySQL). Local automated tests set BERT_DB_PATH
to a throwaway SQLite file; neither mode reads the older sandbox score database.
"""
from __future__ import annotations

import argparse
import json
import mimetypes
import os
import re
import sqlite3
import sys
import time
import uuid
from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import pymysql

PROJECT = Path(__file__).resolve().parents[1]
if str(PROJECT) not in sys.path:
    sys.path.insert(0, str(PROJECT))
from server.db import MySQLConnection, connect_mysql, migrate

WEBAPP = PROJECT / "webapp"
DB_PATH = Path(os.environ.get("BERT_DB_PATH") or PROJECT / "server" / "bert.sqlite3")
VALID_MODES = {"classic", "flappy", "tunnel"}
VALID_METRICS = {"score", "streak", "time"}
VALID_PERIODS = {"day", "week", "month", "all"}
MAX_BODY = 256_000


def connect() -> sqlite3.Connection | MySQLConnection:
    if not os.environ.get('BERT_DB_PATH'):
        if os.environ.get('DATABASE_URL'):
            return connect_mysql()
        raise RuntimeError('BERT_DB_PATH for local tests or DATABASE_URL for hosting is required')
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA journal_mode=WAL")
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id TEXT NOT NULL UNIQUE,
            player_id TEXT NOT NULL,
            player_name TEXT NOT NULL,
            mode TEXT NOT NULL,
            level_id INTEGER NOT NULL,
            score INTEGER NOT NULL,
            streak INTEGER NOT NULL,
            time_seconds REAL NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS scores_board_idx
            ON scores(mode, created_at, score, streak, time_seconds);
        CREATE TABLE IF NOT EXISTS challenges (
            id TEXT PRIMARY KEY,
            creator_id TEXT NOT NULL,
            creator_name TEXT NOT NULL,
            holder_id TEXT NOT NULL,
            holder_name TEXT NOT NULL,
            level_id INTEGER NOT NULL,
            mode TEXT NOT NULL,
            seed INTEGER NOT NULL,
            target_score INTEGER NOT NULL,
            target_streak INTEGER NOT NULL,
            target_time REAL NOT NULL,
            ghost_json TEXT NOT NULL,
            win_streak INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS challenge_attempts (
            challenge_id TEXT NOT NULL,
            player_id TEXT NOT NULL,
            attempt INTEGER NOT NULL,
            score INTEGER NOT NULL,
            streak INTEGER NOT NULL,
            time_seconds REAL NOT NULL,
            created_at TEXT NOT NULL,
            PRIMARY KEY(challenge_id, player_id, attempt)
        );
        """
    )
    return connection


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def clean_name(value) -> str:
    return re.sub(r"\s+", " ", str(value or "Pilot")).strip()[:24] or "Pilot"


def number(value, minimum=0, maximum=10_000_000, integer=False):
    parsed = int(value) if integer else float(value)
    if parsed < minimum or parsed > maximum:
        raise ValueError("number outside allowed range")
    return parsed


def period_cutoff(period: str) -> str | None:
    now = datetime.now(timezone.utc)
    if period == "day": start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week": start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "month": start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    else: return None
    return start.isoformat()


class Handler(SimpleHTTPRequestHandler):
    server_version = "BertTheBird/1.0"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEBAPP), **kwargs)

    def log_message(self, format, *args):
        print(f"[{self.log_date_time_string()}] {format % args}")

    def json_response(self, payload, status=HTTPStatus.OK):
        body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0 or length > MAX_BODY:
            raise ValueError("invalid body size")
        return json.loads(self.rfile.read(length))

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Allow", "GET, POST, OPTIONS")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            try:
                with connect() as database:
                    database.execute('SELECT 1 AS ready')
            except (sqlite3.Error, pymysql.MySQLError, OSError, RuntimeError):
                return self.json_response({"ok": False, "service": "bert-scoreboard"}, HTTPStatus.SERVICE_UNAVAILABLE)
            return self.json_response({"ok": True, "service": "bert-scoreboard"})
        if parsed.path == "/api/leaderboards":
            return self.get_leaderboard(parse_qs(parsed.query))
        if parsed.path.startswith("/api/challenges/"):
            return self.get_challenge(parsed.path.rsplit("/", 1)[-1])
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        try:
            payload = self.read_json()
            if parsed.path == "/api/scores": return self.post_score(payload)
            if parsed.path == "/api/challenges": return self.post_challenge(payload)
            match = re.fullmatch(r"/api/challenges/([A-Za-z0-9_-]+)/attempts", parsed.path)
            if match: return self.post_attempt(match.group(1), payload)
            self.json_response({"error": "not found"}, HTTPStatus.NOT_FOUND)
        except (ValueError, TypeError, json.JSONDecodeError) as error:
            self.json_response({"error": str(error)}, HTTPStatus.UNPROCESSABLE_ENTITY)

    def post_score(self, payload):
        mode = str(payload.get("mode", ""))
        if mode not in VALID_MODES: raise ValueError("invalid mode")
        row = (
            str(payload.get("runId") or uuid.uuid4()), str(payload.get("playerId") or "guest")[:80],
            clean_name(payload.get("playerName")), mode, number(payload.get("levelId"), 1, 99, True),
            number(payload.get("score"), 0, 10_000_000, True), number(payload.get("streak"), 0, 1_000_000, True),
            number(payload.get("time"), 0, 86_400), utc_now(),
        )
        with connect() as database:
            database.execute(
                "INSERT OR IGNORE INTO scores(run_id,player_id,player_name,mode,level_id,score,streak,time_seconds,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
                row,
            )
        self.json_response({"ok": True, "runId": row[0]}, HTTPStatus.CREATED)

    def get_leaderboard(self, query):
        period = query.get("period", ["day"])[0]
        metric = query.get("metric", ["score"])[0]
        mode = query.get("mode", ["all"])[0]
        level = query.get("level", ["all"])[0]
        scope = query.get("scope", ["global"])[0]
        player_id = query.get("playerId", [""])[0]
        if period not in VALID_PERIODS or metric not in VALID_METRICS or mode not in VALID_MODES | {"all"}:
            return self.json_response({"error": "invalid filter"}, HTTPStatus.UNPROCESSABLE_ENTITY)
        if scope not in {"global", "friends"} or (scope == "friends" and not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", player_id)):
            return self.json_response({"error": "invalid scope or player"}, HTTPStatus.UNPROCESSABLE_ENTITY)
        if level != "all":
            try: level = number(level, 1, 99, True)
            except (ValueError, TypeError):
                return self.json_response({"error": "invalid level"}, HTTPStatus.UNPROCESSABLE_ENTITY)
        where, params = [], []
        cutoff = period_cutoff(period)
        if cutoff: where.append("created_at >= ?"); params.append(cutoff)
        if mode != "all": where.append("mode = ?"); params.append(mode)
        if level != "all": where.append("level_id = ?"); params.append(level)
        column = {"score": "score", "streak": "streak", "time": "time_seconds"}[metric]
        rivals_count = 0
        with connect() as database:
            if scope == "friends":
                # A rival is a player who directly attempted one of your challenges,
                # or whose challenge you attempted. Merely opening a link is not enough.
                peers = database.execute(
                    """SELECT DISTINCT CASE WHEN c.creator_id=? THEN a.player_id ELSE c.creator_id END AS peer
                       FROM challenges c JOIN challenge_attempts a ON a.challenge_id=c.id
                       WHERE c.creator_id=? OR a.player_id=?""",
                    (player_id, player_id, player_id),
                ).fetchall()
                members = {player_id}
                members.update(row["peer"] for row in peers if row["peer"])
                rivals_count = len(members) - 1
                where.append("player_id IN (" + ",".join("?" for _ in members) + ")")
                params.extend(sorted(members))
            clause = f"WHERE {' AND '.join(where)}" if where else ""
            rows = database.execute(
                f"""SELECT player_name,mode,level_id,score,streak,time_seconds,created_at
                     FROM (SELECT player_id,player_name,mode,level_id,score,streak,time_seconds,created_at,
                                  ROW_NUMBER() OVER (PARTITION BY player_id
                                      ORDER BY {column} DESC,score DESC,created_at ASC) AS best
                           FROM scores {clause}) ranked
                     WHERE best=1 ORDER BY {column} DESC,score DESC,created_at ASC LIMIT 50""",
                params,
            ).fetchall()
        self.json_response({"offline": False, "scope": scope, "rivalsCount": rivals_count, "period": period, "metric": metric, "mode": mode, "level": level, "rows": [dict(row) | {"rank": index + 1} for index, row in enumerate(rows)]})

    def post_challenge(self, payload):
        ghost = payload.get("ghost")
        if not isinstance(ghost, list) or len(ghost) > 1800: raise ValueError("invalid ghost")
        challenge_id = uuid.uuid4().hex[:12]
        now = utc_now()
        values = (
            challenge_id, str(payload.get("playerId") or "guest")[:80], clean_name(payload.get("playerName")),
            str(payload.get("playerId") or "guest")[:80], clean_name(payload.get("playerName")),
            number(payload.get("levelId"), 1, 99, True), str(payload.get("mode")), number(payload.get("seed"), 1, 2**32 - 1, True),
            number(payload.get("score"), 0, 10_000_000, True), number(payload.get("streak"), 0, 1_000_000, True),
            number(payload.get("time"), 0, 86_400), json.dumps(ghost, separators=(",", ":")), 0, now, now,
        )
        if values[6] not in VALID_MODES: raise ValueError("invalid mode")
        with connect() as database:
            database.execute("INSERT INTO challenges VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", values)
        self.json_response({"ok": True, "id": challenge_id}, HTTPStatus.CREATED)

    def get_challenge(self, challenge_id):
        with connect() as database:
            row = database.execute("SELECT * FROM challenges WHERE id = ?", (challenge_id,)).fetchone()
        if not row: return self.json_response({"error": "not found"}, HTTPStatus.NOT_FOUND)
        result = dict(row); result["ghost"] = json.loads(result.pop("ghost_json"))
        self.json_response(result)

    def post_attempt(self, challenge_id, payload):
        player_id = str(payload.get("playerId") or "guest")[:80]
        with connect() as database:
            locking = ' FOR UPDATE' if isinstance(database, MySQLConnection) else ''
            challenge = database.execute("SELECT * FROM challenges WHERE id = ?" + locking, (challenge_id,)).fetchone()
            if not challenge: return self.json_response({"error": "not found"}, HTTPStatus.NOT_FOUND)
            used = database.execute("SELECT COUNT(*) AS used FROM challenge_attempts WHERE challenge_id=? AND player_id=?", (challenge_id, player_id)).fetchone()
            if used is None: raise RuntimeError('Challenge attempt count unavailable')
            attempt = used['used'] + 1
            if attempt > 3: return self.json_response({"error": "three attempts used"}, HTTPStatus.CONFLICT)
            score = number(payload.get("score"), 0, 10_000_000, True)
            streak = number(payload.get("streak"), 0, 1_000_000, True)
            seconds = number(payload.get("time"), 0, 86_400)
            database.execute("INSERT INTO challenge_attempts VALUES(?,?,?,?,?,?,?)", (challenge_id, player_id, attempt, score, streak, seconds, utc_now()))
            won = (score, streak, seconds) > (challenge["target_score"], challenge["target_streak"], challenge["target_time"])
            if won:
                database.execute(
                    "UPDATE challenges SET holder_id=?,holder_name=?,target_score=?,target_streak=?,target_time=?,win_streak=win_streak+1,updated_at=? WHERE id=?",
                    (player_id, clean_name(payload.get("playerName")), score, streak, seconds, utc_now(), challenge_id),
                )
        self.json_response({"ok": True, "attempt": attempt, "attemptsLeft": 3 - attempt, "won": won})


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=int(os.environ.get('PORT', '3000')))
    args = parser.parse_args()
    if os.environ.get('BERT_DB_PATH'):
        connect().close()
    else:
        migrate()
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"Bert The Bird available on http://{args.host}:{args.port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()

"""Durable MySQL transport for Bert's existing score/challenge API.

The SQLite test path remains separate in server.py. Never write DATABASE_URL to logs,
public assets, checkpoints or temporary files.
"""
from __future__ import annotations

import os
import re
import ssl
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

import pymysql
from pymysql.cursors import DictCursor


class QueryResult:
    def __init__(self, rows):
        self.rows = rows

    def fetchone(self):
        return self.rows[0] if self.rows else None

    def fetchall(self):
        return self.rows


class MySQLConnection:
    """Small compatibility layer for the existing sqlite3.Connection.execute API."""

    def __init__(self, connection):
        self.connection = connection

    def execute(self, statement, parameters=()):
        # SQL statements are authored in our existing API and use bound ? values.
        # Only the harmless SQLite insert modifier differs for MySQL.
        sql = re.sub(r'\bINSERT\s+OR\s+IGNORE\b', 'INSERT IGNORE', statement,
                     flags=re.IGNORECASE).replace('?', '%s')
        with self.connection.cursor() as cursor:
            cursor.execute(sql, parameters)
            return QueryResult(cursor.fetchall() if cursor.description else [])

    def commit(self):
        self.connection.commit()

    def rollback(self):
        self.connection.rollback()

    def close(self):
        self.connection.close()

    def __enter__(self):
        return self

    def __exit__(self, error_type, error, traceback):
        try:
            if error_type is None:
                self.commit()
            else:
                self.rollback()
        finally:
            self.close()
        return False


def connect_mysql():
    value = os.environ.get('DATABASE_URL')
    if not value:
        raise RuntimeError('Managed database is not configured')
    parsed = urlparse(value)
    if parsed.scheme not in ('mysql', 'mysql+pymysql') or not parsed.hostname:
        raise RuntimeError('Unsupported managed database URL')
    query = parse_qs(parsed.query)
    ssl_value = query.get('ssl', ['true'])[0].lower()
    # Respect the DSN's TLS flag; production never publishes this secret URL.
    tls_context = ssl.create_default_context() if ssl_value not in ('false', '0', 'off') else None
    connection = pymysql.connect(
        host=parsed.hostname, port=parsed.port or 3306,
        user=unquote(parsed.username or ''),
        password=unquote(parsed.password or ''),
        database=unquote(parsed.path.lstrip('/')),
        charset='utf8mb4', cursorclass=DictCursor,
        autocommit=False, connect_timeout=10, read_timeout=15,
        write_timeout=15, ssl=tls_context,
    )
    return MySQLConnection(connection)


def migrate():
    """Create only missing managed tables; historical SQLite rows are never copied."""
    schema_path = Path(__file__).with_name('schema_mysql.sql')
    statements = [sql.strip() for sql in schema_path.read_text().split(';')
                  if sql.strip()]
    with connect_mysql() as database:
        for statement in statements:
            database.execute(statement)
        database.execute(
            'INSERT IGNORE INTO schema_migrations(version,applied_at) VALUES(?,?)',
            ('bert-scoreboard-v1', datetime.now(timezone.utc).isoformat()),
        )
    print('Bert managed database schema is ready.', flush=True)

"""SQLite database connection and initialization"""

import os
import sqlite3

from config import DB_PATH


class Database:
    def __init__(self, db_path: str = DB_PATH):
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA journal_mode=WAL")
        self.conn.execute("PRAGMA foreign_keys=ON")
        self._init_schema()

    def _init_schema(self):
        schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
        with open(schema_path, "r", encoding="utf-8") as f:
            self.conn.executescript(f.read())

    def init_schema(self):
        """Public method for test fixtures"""
        self._init_schema()

    def execute(self, sql: str, params=None):
        cursor = self.conn.execute(sql, params or [])
        self.conn.commit()
        return cursor

    def executemany(self, sql: str, params_list):
        cursor = self.conn.executemany(sql, params_list)
        self.conn.commit()
        return cursor

    def fetchone(self, sql: str, params=None):
        return self.conn.execute(sql, params or []).fetchone()

    def fetchall(self, sql: str, params=None):
        return self.conn.execute(sql, params or []).fetchall()

    def close(self):
        self.conn.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()

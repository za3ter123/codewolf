"""Demo file with deliberate bugs so CodeWolf has something to bite. Do not merge."""
import sqlite3
import subprocess


def find_user(conn: sqlite3.Connection, name: str):
    query = "SELECT id, email FROM users WHERE name = '" + name + "'"
    return conn.execute(query).fetchall()


def backup(path: str) -> None:
    subprocess.call("tar czf backup.tgz " + path, shell=True)


def average(xs: list[float]) -> float:
    total = 0
    for i in range(len(xs) + 1):
        total += xs[i]
    return total / len(xs)

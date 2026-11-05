"""Local Biguli portal server and shared assessment storage."""

from __future__ import annotations

import json
import math
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
from uuid import uuid4


ROOT = Path(__file__).resolve().parent
DATA_FILE = ROOT / "biguli_data.json"
TERMS = {f"Term {number}" for number in range(1, 4)}
DATA_LOCK = threading.Lock()
MAX_REQUEST_BYTES = 1_000_000


def read_assessments() -> list[dict]:
	if not DATA_FILE.exists():
		return []
	try:
		stored = json.loads(DATA_FILE.read_text(encoding="utf-8"))
	except (OSError, json.JSONDecodeError):
		return []
	if not isinstance(stored, dict) or not isinstance(stored.get("assessments"), list):
		return []
	return [row for row in stored["assessments"] if isinstance(row, dict)]


def write_assessments(rows: list[dict]) -> None:
	temporary = DATA_FILE.with_suffix(".tmp")
	temporary.write_text(
		json.dumps({"assessments": rows}, ensure_ascii=False, indent=2),
		encoding="utf-8",
	)
	temporary.replace(DATA_FILE)


class BiguliHandler(SimpleHTTPRequestHandler):
	"""Serve the portal and its same-origin assessment API."""

	def __init__(self, *args, **kwargs):
		super().__init__(*args, directory=str(ROOT), **kwargs)

	def send_json(self, status: int, payload: dict) -> None:
		body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
		self.send_response(status)
		self.send_header("Content-Type", "application/json; charset=utf-8")
		self.send_header("Content-Length", str(len(body)))
		self.send_header("Cache-Control", "no-store")
		self.end_headers()
		self.wfile.write(body)

	def do_GET(self) -> None:
		path = urlparse(self.path).path
		if path == "/api/health":
			self.send_json(200, {"ok": True})
			return
		if path == "/api/assessments":
			with DATA_LOCK:
				rows = read_assessments()
			self.send_json(200, {"assessments": rows})
			return
		if path == "/biguli_data.json":
			self.send_error(404)
			return
		super().do_GET()

	def do_POST(self) -> None:
		if urlparse(self.path).path != "/api/assessments":
			self.send_error(404)
			return
		try:
			length = int(self.headers.get("Content-Length", "0"))
			if length < 1 or length > MAX_REQUEST_BYTES:
				self.send_json(413, {"error": "Invalid request size."})
				return
			payload = json.loads(self.rfile.read(length))
		except (ValueError, json.JSONDecodeError):
			self.send_json(400, {"error": "Request body must be valid JSON."})
			return

		if not isinstance(payload, dict) or not isinstance(payload.get("records"), list):
			self.send_json(400, {"error": "Expected a records array."})
			return
		if len(payload["records"]) > 500:
			self.send_json(413, {"error": "Too many mark records."})
			return

		records = payload["records"]
		if any(not self.valid_record(record) for record in records):
			self.send_json(400, {"error": "One or more mark records are invalid."})
			return

		with DATA_LOCK:
			rows = read_assessments()
			for record in records:
				key = self.record_key(record)
				index = next((i for i, row in enumerate(rows) if self.record_key(row) == key), -1)
				if record["mark"] == "":
					if index >= 0:
						rows.pop(index)
					continue

				saved = {
					"id": rows[index]["id"] if index >= 0 else f"id_{uuid4().hex}",
					"learnerId": record["learnerId"],
					"admission": record["admission"],
					"subject": record["subject"],
					"term": record["term"],
					"assessment": record["assessment"],
					"mark": float(record["mark"]),
					"comment": "",
					"teacherId": record["teacherId"],
					"date": record["date"],
				}
				if index >= 0:
					rows[index] = saved
				else:
					rows.append(saved)
			write_assessments(rows)

		self.send_json(200, {"assessments": rows})

	@staticmethod
	def record_key(record: dict) -> tuple[str, str, str, str]:
		return (
			record.get("admission") or record["learnerId"],
			record["subject"],
			record["term"],
			record["assessment"],
		)

	@staticmethod
	def valid_record(record: object) -> bool:
		if not isinstance(record, dict):
			return False
		text_fields = ("learnerId", "admission", "subject", "term", "assessment", "teacherId", "date")
		if any(not isinstance(record.get(field), str) or not record[field].strip() for field in text_fields):
			return False
		if record["term"] not in TERMS or len(record["assessment"]) > 120:
			return False
		mark = record.get("mark")
		if mark == "":
			return True
		try:
			value = float(mark)
		except (TypeError, ValueError):
			return False
		return math.isfinite(value) and 0 <= value <= 100

	def log_message(self, format: str, *args) -> None:
		print(f"{self.log_date_time_string()} - {format % args}")


if __name__ == "__main__":
	host = "127.0.0.1"
	port = 8000
	server = ThreadingHTTPServer((host, port), BiguliHandler)
	print(f"Biguli portal running at http://{host}:{port}")
	print("Press Ctrl+C to stop the server.")
	try:
		server.serve_forever()
	except KeyboardInterrupt:
		print("\nStopping Biguli portal server.")
	finally:
		server.server_close()

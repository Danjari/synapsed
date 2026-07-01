"""Rate-limit aware retries for Gemini and Anthropic API calls."""

from __future__ import annotations

import os
import random
import re
import time
from typing import Any

from dotenv import load_dotenv
from pathlib import Path

STUDY_ROOT = Path(__file__).resolve().parent.parent


def _load_env() -> None:
    load_dotenv(STUDY_ROOT / ".env")
    root_env = STUDY_ROOT.parent / ".env"
    if root_env.exists():
        load_dotenv(root_env, override=False)


def api_delay_sec() -> float:
    _load_env()
    return float(os.getenv("API_DELAY_SEC", "2.0"))


def max_api_retries() -> int:
    _load_env()
    return int(os.getenv("API_MAX_RETRIES", "8"))


def is_rate_limit_error(exc: BaseException) -> bool:
    """Detect 429 / quota / rate-limit errors from either provider."""
    text = f"{type(exc).__name__}: {exc}".lower()
    markers = (
        "429",
        "rate limit",
        "rate_limit",
        "too many requests",
        "quota",
        "resource exhausted",
        "overloaded",
        "capacity",
        "throttl",
    )
    if any(m in text for m in markers):
        return True

    status = getattr(exc, "status_code", None) or getattr(exc, "status", None)
    if status == 429:
        return True

    response = getattr(exc, "response", None)
    if response is not None:
        resp_status = getattr(response, "status_code", None)
        if resp_status == 429:
            return True

    return False


def _parse_retry_after_sec(exc: BaseException) -> float | None:
    for attr in ("retry_after", "retry_after_ms"):
        val = getattr(exc, attr, None)
        if val is not None:
            sec = float(val)
            return sec / 1000.0 if attr == "retry_after_ms" else sec

    headers = getattr(getattr(exc, "response", None), "headers", None)
    if headers:
        retry_after = headers.get("retry-after") or headers.get("Retry-After")
        if retry_after is not None:
            try:
                return float(retry_after)
            except ValueError:
                pass

    match = re.search(r"retry (?:in|after) ([0-9.]+)s", str(exc), re.I)
    if match:
        return float(match.group(1))

    return None


def backoff_delay_sec(attempt: int, exc: BaseException | None = None) -> float:
    """Exponential backoff with jitter; honors Retry-After when present."""
    retry_after = _parse_retry_after_sec(exc) if exc else None
    if retry_after is not None:
        return retry_after + random.uniform(0.5, 2.0)

    base = float(os.getenv("API_BACKOFF_BASE_SEC", "5.0"))
    delay = base * (2**attempt)
    cap = float(os.getenv("API_BACKOFF_MAX_SEC", "120.0"))
    delay = min(delay, cap)
    return delay + random.uniform(0.0, 1.5)


def call_with_rate_limit_retry(
    fn: Any,
    *,
    label: str = "api call",
    max_retries: int | None = None,
) -> Any:
    """Call fn(); retry on rate limits and transient errors with backoff."""
    retries = max_retries if max_retries is not None else max_api_retries()
    last_error: BaseException | None = None

    for attempt in range(retries + 1):
        try:
            return fn()
        except Exception as exc:
            last_error = exc
            if attempt >= retries:
                break

            if is_rate_limit_error(exc):
                wait = backoff_delay_sec(attempt, exc)
                print(f"  [rate limit] {label}: waiting {wait:.1f}s (attempt {attempt + 1}/{retries})...")
                time.sleep(wait)
                continue

            # Gemini sometimes replies with text instead of a tool call — retry
            transient_markers = (
                "timeout",
                "timed out",
                "connection",
                "503",
                "502",
                "500",
                "unavailable",
                "function call",
                "tool use",
                "did not return",
            )
            if any(m in str(exc).lower() for m in transient_markers):
                wait = min(10.0, 2.0 * (attempt + 1))
                print(f"  [transient] {label}: retry in {wait:.1f}s...")
                time.sleep(wait)
                continue

            raise

    raise last_error or RuntimeError(f"{label} failed after {retries} retries")

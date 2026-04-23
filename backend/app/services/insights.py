import json
import urllib.error
import urllib.request
from typing import Iterable

from app.config import get_settings


SYSTEM_PROMPT = (
    "You are a health and wellness coach reviewing an activity-recognition "
    "report from a wearable sensor. Given a breakdown of how a person spent "
    "their time (walking, sitting, standing, etc.), infer what it suggests "
    "about their activity level, posture balance, and cardiovascular load, "
    "then give concrete, friendly recommendations. "
    "Respond in plain markdown with three short sections: "
    "**Observations**, **What it suggests**, **Recommendations**. "
    "Keep each section to 2-4 bullet points. Be specific with numbers from "
    "the data. Avoid medical disclaimers longer than one short line."
)


def _format_summary(summary: dict, timeline: Iterable[dict]) -> str:
    total_seconds = sum(float(v) for v in summary.values()) or 1.0
    lines = [f"Total tracked duration: {total_seconds:.1f}s"]
    lines.append("Activity breakdown:")
    for activity, seconds in sorted(summary.items(), key=lambda kv: -kv[1]):
        pct = (seconds / total_seconds) * 100
        lines.append(f"- {activity}: {seconds:.1f}s ({pct:.1f}%)")

    entries = list(timeline)
    if entries:
        transitions = sum(
            1
            for a, b in zip(entries, entries[1:])
            if a["activity"] != b["activity"]
        )
        lines.append(f"Windows: {len(entries)}")
        lines.append(f"Activity transitions: {transitions}")
        avg_conf = sum(e["confidence"] for e in entries) / len(entries)
        lines.append(f"Average model confidence: {avg_conf * 100:.1f}%")

    return "\n".join(lines)


def generate_insights(summary: dict, timeline: list[dict]) -> str:
    settings = get_settings()
    if not settings.groq_api_key:
        raise RuntimeError("GROQ_API_KEY is not configured")

    user_prompt = _format_summary(summary, timeline)

    payload = {
        "model": settings.groq_model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.4,
        "max_tokens": 700,
    }

    req = urllib.request.Request(
        f"{settings.groq_base_url}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.groq_api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "actitrace/1.0 (+groq-client)",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Groq API error {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Groq request failed: {exc.reason}") from exc

    try:
        return body["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError) as exc:
        raise RuntimeError(f"Unexpected Groq response: {body}") from exc

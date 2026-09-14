#!/usr/bin/env python3
"""
8x assignment - automatic prompt/response capture for Claude Code.

Wired to two Claude Code lifecycle events in .claude/settings.json:

    UserPromptSubmit -> append a PROMPT entry   (fires when a prompt is submitted)
    Stop             -> append a RESPONSE entry (fires at the end of the turn)

Both hooks receive a JSON payload on stdin. The field names below were confirmed
empirically by dumping real payloads from this Claude Code build (2.1.270), not
from memory:

    UserPromptSubmit: session_id, transcript_path, cwd, scratchpad_dir,
                      prompt_id, permission_mode, hook_event_name, prompt
    Stop:             ... plus effort, stop_hook_active, last_assistant_message,
                      background_tasks, session_crons

`last_assistant_message` is the final assistant message for the turn. It excludes
text emitted between tool calls, which is exactly what the assignment asks for
("the prompt and the final response, nothing in between").

Output: one Markdown file per session in <repo>/.agent-logs/, named
YYYY-MM-DD_HH-MM-SS_<session-id>.md

Entries are strictly append-only. The only thing ever rewritten is the YAML
frontmatter counter block (total_exchanges / last_prompt_time / model), which is
metadata about the log rather than a logged entry.

This hook must never break a session: every failure path exits 0 and records the
traceback in .agent-logs/.capture-errors.log.
"""

import datetime
import glob
import json
import os
import re
import sys
import time
import traceback

# Script lives at <repo>/.claude/hooks/capture.py, so the repo root is two
# levels up. Deriving the path from __file__ (not from cwd) means logs land in
# the right place no matter which directory the session was started from.
HOOKS_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(os.path.dirname(HOOKS_DIR))
LOG_DIR = os.path.join(REPO_ROOT, ".agent-logs")
ERROR_LOG = os.path.join(LOG_DIR, ".capture-errors.log")

AUTHOR = os.environ.get("AGENT_LOG_AUTHOR", "nishant42")
PROJECT = os.environ.get("AGENT_LOG_PROJECT", os.path.basename(REPO_ROOT))
TOOL = "claude-code"

# Model is not present in either hook payload, so it is read back from the
# session transcript. On the very first prompt of a session no assistant message
# exists yet, so the model genuinely is not knowable at that instant.
MODEL_UNKNOWN_AT_PROMPT = "unknown-at-prompt-time"
MODEL_UNKNOWN = "unknown"

# The Stop hook can fire before Claude Code has flushed the assistant message to
# the transcript file - observed on a fast turn, where the hook read the file
# ~94ms after the message timestamp and still did not see the line. Poll briefly
# rather than recording the model as unknown.
MODEL_WAIT_SECONDS = 3.0
MODEL_POLL_INTERVAL = 0.1

ENTRY_RE = re.compile(r"^\[LOG_ENTRY type=(PROMPT|RESPONSE) num=(\d+) ", re.MULTILINE)


def utc_now():
    """UTC timestamp in the format the assignment specifies: ...T09:14:02.118Z"""
    now = datetime.datetime.utcnow()
    return now.strftime("%Y-%m-%dT%H:%M:%S.") + "%03dZ" % (now.microsecond // 1000)


def log_error(message):
    try:
        if not os.path.isdir(LOG_DIR):
            os.makedirs(LOG_DIR)
        with open(ERROR_LOG, "a") as handle:
            handle.write("[%s] %s\n" % (utc_now(), message))
    except Exception:
        pass


def read_transcript(path):
    """Return the transcript's parsed JSONL lines, skipping unparseable ones."""
    entries = []
    if not path or not os.path.exists(path):
        return entries
    try:
        with open(path, "r") as handle:
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                try:
                    entries.append(json.loads(line))
                except ValueError:
                    continue
    except IOError:
        pass
    return entries


def _main_agent_assistant_entries(entries):
    """Assistant turns from the main agent only.

    Subagents write into the same transcript with isSidechain=True. Their
    output is an intermediate step, so it must not be mistaken for the turn's
    final response.
    """
    out = []
    for entry in entries:
        if entry.get("type") != "assistant":
            continue
        if entry.get("isSidechain"):
            continue
        message = entry.get("message")
        if isinstance(message, dict):
            out.append(message)
    return out


def _read_model(path):
    messages = _main_agent_assistant_entries(read_transcript(path))
    for message in reversed(messages):
        model = message.get("model")
        if model:
            return model
    return None


def model_from_transcript(path, wait_seconds=0.0):
    """Most recent model the main agent actually ran on, or None.

    `wait_seconds` polls for the transcript line to be flushed. Used by the Stop
    hook, where the assistant message is guaranteed to exist logically but may
    not have reached disk yet. The prompt hook passes 0 so it never delays a turn.
    """
    model = _read_model(path)
    if model or wait_seconds <= 0:
        return model
    deadline = time.time() + wait_seconds
    while time.time() < deadline:
        time.sleep(MODEL_POLL_INTERVAL)
        model = _read_model(path)
        if model:
            return model
    return None


def final_text_from_transcript(path):
    """Fallback extraction of the final assistant text if the payload lacks it."""
    messages = _main_agent_assistant_entries(read_transcript(path))
    for message in reversed(messages):
        content = message.get("content")
        if not isinstance(content, list):
            continue
        chunks = [
            block.get("text", "")
            for block in content
            if isinstance(block, dict) and block.get("type") == "text"
        ]
        chunks = [chunk for chunk in chunks if chunk.strip()]
        if chunks:
            return "\n".join(chunks)
    return ""


def session_log_path(session_id):
    """Find this session's log file, or build the name for a new one."""
    if not os.path.isdir(LOG_DIR):
        os.makedirs(LOG_DIR)
    existing = sorted(glob.glob(os.path.join(LOG_DIR, "*_%s.md" % session_id)))
    if existing:
        return existing[0]
    stamp = datetime.datetime.utcnow().strftime("%Y-%m-%d_%H-%M-%S")
    return os.path.join(LOG_DIR, "%s_%s.md" % (stamp, session_id))


def split_document(text):
    """Split an existing log into (frontmatter_dict, ordered_keys, body).

    Leading blank lines are tolerated. An editor or formatter touching a log
    file can prepend one, and a strict startswith() check would then treat the
    whole file as bodyless - observed in practice on a committed log.
    """
    text = text.lstrip("\n")
    if not text.startswith("---\n"):
        return {}, [], text
    end = text.find("\n---\n", 4)
    if end == -1:
        return {}, [], text
    raw = text[4:end]
    body = text[end + len("\n---\n") :]
    data = {}
    order = []
    for line in raw.split("\n"):
        if not line.strip():
            continue
        key, sep, value = line.partition(":")
        if not sep:
            continue
        key = key.strip()
        data[key] = value.strip()
        order.append(key)
    return data, order, body


def render_document(front, order, body):
    lines = ["---"]
    for key in order:
        lines.append("%s: %s" % (key, front[key]))
    lines.append("---")
    return "\n".join(lines) + "\n" + body


def new_document(session_id, timestamp, model):
    short = session_id[:8]
    date = timestamp[:10]
    front = {
        "session_id": session_id,
        "date": date,
        "author": AUTHOR,
        "model": model,
        "tool": TOOL,
        "project": PROJECT,
        "total_exchanges": "0",
        "first_prompt_time": timestamp,
        "last_prompt_time": timestamp,
    }
    order = [
        "session_id",
        "date",
        "author",
        "model",
        "tool",
        "project",
        "total_exchanges",
        "first_prompt_time",
        "last_prompt_time",
    ]
    body = (
        "\n# Session Log - %s\n\n"
        "Session: `%s` | Project: `%s` | Author: `%s`\n\n"
        "---\n\n" % (date, short, PROJECT, AUTHOR)
    )
    return front, order, body


def format_entry(kind, num, session_id, timestamp, model, text):
    return "[LOG_ENTRY type=%s num=%d session=%s]\ntimestamp: %s\nmodel: %s\n\n%s\n\n\n" % (
        kind,
        num,
        session_id[:8],
        timestamp,
        model,
        text.strip("\n"),
    )


def append_entry(session_id, kind, text, model, timestamp):
    """Append one entry, refresh the frontmatter counters, write atomically."""
    path = session_log_path(session_id)

    degraded = False
    if os.path.exists(path):
        with open(path, "r") as handle:
            existing = handle.read()
        front, order, body = split_document(existing)
        if not front:
            # Frontmatter unreadable. Append to the file as it stands rather
            # than synthesising a second frontmatter block, which would
            # duplicate the entire document. Capturing the turn matters more
            # than keeping the counters accurate.
            degraded = True
            front, order, body = {}, [], existing
            log_error("unparseable frontmatter in %s; appended without counters" % path)
    else:
        front, order, body = new_document(session_id, timestamp, model)

    found = ENTRY_RE.findall(body)
    prompt_nums = [int(num) for kind_, num in found if kind_ == "PROMPT"]

    if kind == "PROMPT":
        num = (max(prompt_nums) if prompt_nums else 0) + 1
    else:
        # The Stop hook always follows its own prompt, so the open prompt is the
        # highest-numbered one. A turn the user interrupted simply never gets a
        # RESPONSE entry, which is left visible in the log on purpose.
        num = max(prompt_nums) if prompt_nums else 1

    body = body + format_entry(kind, num, session_id, timestamp, model, text)

    if degraded:
        rendered = body
    else:
        front["total_exchanges"] = str(len(prompt_nums) + (1 if kind == "PROMPT" else 0))
        front["last_prompt_time"] = timestamp
        if model and model not in (MODEL_UNKNOWN, MODEL_UNKNOWN_AT_PROMPT):
            front["model"] = model
        for key in ("session_id", "date", "author", "model", "tool", "project",
                    "total_exchanges", "first_prompt_time", "last_prompt_time"):
            if key not in order:
                order.append(key)
        rendered = render_document(front, order, body)

    tmp = path + ".tmp"
    with open(tmp, "w") as handle:
        handle.write(rendered)
    os.rename(tmp, path)
    return path


def backfill_missing_response(session_id, transcript, timestamp):
    """Append a RESPONSE the Stop hook never wrote.

    Stop only fires when a turn ends normally. If the turn is interrupted, a new
    message arrives mid-turn, or the session reconnects, no RESPONSE is written
    and the prompt sits in the log unanswered - six turns in the first long
    session. This runs at the start of the next prompt: if the newest entry is a
    PROMPT with no RESPONSE, the previous turn's final assistant message is read
    from the transcript and appended, tagged so it is clear it arrived late.

    Append-only: nothing already written is edited or removed.
    """
    path = session_log_path(session_id)
    if not os.path.exists(path):
        return
    with open(path, "r") as handle:
        body = handle.read()

    found = ENTRY_RE.findall(body)
    if not found:
        return
    prompts = [int(n) for kind, n in found if kind == "PROMPT"]
    responses = [int(n) for kind, n in found if kind == "RESPONSE"]
    if not prompts:
        return
    latest = max(prompts)
    if latest in responses:
        return  # Stop already wrote it

    text = final_text_from_transcript(transcript)
    if not text.strip():
        return  # the turn produced no visible answer; nothing to recover

    model = model_from_transcript(transcript) or MODEL_UNKNOWN
    note = (
        "[recovered on the next prompt: this turn ended without a Stop event "
        "(interrupted, superseded, or the session reconnected), so the hook "
        "could not write it at the time]\n\n"
    )
    append_entry(session_id, "RESPONSE", note + text, model, timestamp)


def with_lock(func):
    """Serialise writes so two hooks firing at once cannot interleave.

    The lock lives in the system temp dir, not in .agent-logs/, so that the log
    directory contains only the logs themselves and needs no .gitignore entry.
    """
    import hashlib
    import tempfile

    key = hashlib.md5(REPO_ROOT.encode("utf-8")).hexdigest()[:12]
    lock_path = os.path.join(tempfile.gettempdir(), "agent-capture-%s.lock" % key)
    if not os.path.isdir(LOG_DIR):
        os.makedirs(LOG_DIR)
    handle = open(lock_path, "w")
    try:
        try:
            import fcntl

            fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
        except (ImportError, IOError, OSError):
            pass
        return func()
    finally:
        try:
            handle.close()
        except (IOError, OSError):
            pass


def main():
    raw = sys.stdin.read()
    if not raw.strip():
        return
    payload = json.loads(raw)

    event = payload.get("hook_event_name") or (sys.argv[1] if len(sys.argv) > 1 else "")
    session_id = payload.get("session_id")
    if not session_id:
        return
    transcript = payload.get("transcript_path")
    timestamp = utc_now()

    if event == "UserPromptSubmit":
        text = payload.get("prompt")
        if text is None or not str(text).strip():
            return
        model = model_from_transcript(transcript) or MODEL_UNKNOWN_AT_PROMPT
        # Recover the previous turn's response first, if it never landed.
        with_lock(lambda: backfill_missing_response(session_id, transcript, timestamp))
        with_lock(lambda: append_entry(session_id, "PROMPT", str(text), model, timestamp))

    elif event == "Stop":
        text = payload.get("last_assistant_message") or ""
        if not text.strip():
            text = final_text_from_transcript(transcript)
        if not text.strip():
            return
        model = model_from_transcript(transcript, MODEL_WAIT_SECONDS) or MODEL_UNKNOWN
        with_lock(lambda: append_entry(session_id, "RESPONSE", text, model, timestamp))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        log_error("capture failed: %s" % traceback.format_exc().replace("\n", " | "))
    # Always succeed. A logging hook must never block or fail a session.
    sys.exit(0)

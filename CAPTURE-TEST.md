# CAPTURE-TEST

Proof that automatic prompt/response capture is installed and fires on its own.

---

## 1. Tool and model

| | |
|---|---|
| **Tool** | Claude Code v2.1.270 (`anthropic.claude-code` extension, native binary) |
| **Host editor** | Antigravity IDE. Binary at `~/.antigravity-ide/extensions/anthropic.claude-code-2.1.270-darwin-arm64/resources/native-binary/claude` |
| **Model (plans **and** executes)** | Opus 5, 1M-context variant — session model id `claude-opus-5[1m]`; the transcript and therefore the logs record it as `claude-opus-5` |
| **Reasoning effort** | `high` (confirmed in the `Stop` payload: `effort: {'level': 'high'}`) |
| **Separate planner model?** | No. One model does planning and execution. There is no plan/execute model split to disclose. If that changes mid-build it will be visible, because every entry carries its own `model:` field. |

**Does the tool have an automatic mechanism?** Yes — Claude Code hooks. I did not take this
on trust; I confirmed the available lifecycle events directly from the shipped binary:

```
$ strings .../native-binary/claude | grep -x -E "UserPromptSubmit|PreToolUse|..."
Notification  PostToolUse  PreCompact  PreToolUse  SessionEnd  SubagentStop  UserPromptSubmit
# plus "Stop" (found separately: "Stop" | "SubagentStop")
```

---

## 2. Mechanism and config

**Mechanism:** Claude Code hooks on two lifecycle events.

| Event | Fires | Writes |
|---|---|---|
| `UserPromptSubmit` | the instant a prompt is submitted | `PROMPT` entry |
| `Stop` | end of turn, when the agent finishes responding | `RESPONSE` entry |

**Files changed / created:**

| File | Role |
|---|---|
| [`.claude/settings.json`](.claude/settings.json) | **The config.** Wires both events to the capture script. Committed. |
| [`.claude/hooks/capture.py`](.claude/hooks/capture.py) | The capture script. Committed. |
| `/Users/nishantkumar/Documents/8x/.claude/settings.json` | Local-only safety net, **outside the repo** (see §5). |

Nothing has to be remembered or run by hand. The hooks fire on their own, in every
session, including sessions started after this one and sessions started by someone else
who clones the repo.

### What is captured, and what is deliberately not

Per the brief: the prompt and the final response, nothing in between.

- **Prompt** — `payload["prompt"]`, verbatim, untruncated, no cleanup.
- **Final response** — `payload["last_assistant_message"]` from the `Stop` event.
- **Timestamp** — UTC, millisecond precision, `...T23:35:56.962Z`.
- **Model** — read back from the session transcript (see §4, the one real limitation).

Not captured, on purpose: thinking blocks, tool calls, file reads, diffs, retries, and
subagent output. Subagents fire `SubagentStop`, not `Stop`, and I deliberately left
`SubagentStop` unwired, so subagent chatter cannot leak into the log as a "final response".

I verified that `last_assistant_message` really is *only* the final message. I ran a probe
turn that emitted text, then called a tool, then wrote a long answer. The captured value was
1683 chars, contained the full four-paragraph answer, and did **not** contain the
`INTERLUDE TEXT` emitted before the tool call. That is exactly the required boundary.

---

## 3. Where the canaries landed

Log directory: **`.agent-logs/`** (committed; **not** in `.gitignore`).

| # | Session | File | Proves |
|---|---|---|---|
| 1 | `1ff84044` | [`.agent-logs/2026-09-13_23-35-56_1ff84044-7a51-4989-989d-a6cb6498fada.md`](.agent-logs/2026-09-13_23-35-56_1ff84044-7a51-4989-989d-a6cb6498fada.md) | capture works |
| 2 | `88ef31aa` | [`.agent-logs/2026-09-13_23-36-18_88ef31aa-b6ce-4e2d-9493-068a3181da3f.md`](.agent-logs/2026-09-13_23-36-18_88ef31aa-b6ce-4e2d-9493-068a3181da3f.md) | **works in a second, independent session** |
| 3 | `d0436d6f` | [`.agent-logs/2026-09-13_23-39-15_d0436d6f-eba8-46b1-b82d-8fb782717125.md`](.agent-logs/2026-09-13_23-39-15_d0436d6f-eba8-46b1-b82d-8fb782717125.md) | race fix (§4); also multi-turn, `total_exchanges: 2` |
| 4 | `cfe939e1` | [`.agent-logs/2026-09-13_23-39-24_cfe939e1-71dc-40bc-86af-26e1df7a3bcc.md`](.agent-logs/2026-09-13_23-39-24_cfe939e1-71dc-40bc-86af-26e1df7a3bcc.md) | fires from the parent dir too (§5) |

Sessions 1 and 2 are the two required canaries: separate session ids, separate files,
neither one the session that installed the hook.

### Canary 1 — raw, session `1ff84044`

(Outer fence is four backticks because the captured response itself contains a code block.)

````
[LOG_ENTRY type=PROMPT num=1 session=1ff84044]
timestamp: 2026-09-13T23:35:56.962Z
model: unknown-at-prompt-time

CAPTURE TEST — 8x assignment, Nishant Kumar


[LOG_ENTRY type=RESPONSE num=1 session=1ff84044]
timestamp: 2026-09-13T23:36:06.925Z
model: claude-opus-5

Capture hook is working. Here's what the test produced:

**`.agent-logs/2026-09-13_23-35-56_1ff84044-....md`** — created by the `UserPromptSubmit` hook the moment you submitted this message:

```
---
session_id: 1ff84044-7a51-4989-989d-a6cb6498fada
date: 2026-09-13
author: nishant42
model: unknown-at-prompt-time
tool: claude-code
project: amazon-clone-8x
total_exchanges: 1
...
---
[LOG_ENTRY type=PROMPT num=1 session=1ff84044]
CAPTURE TEST — 8x assignment, Nishant Kumar
```

Checks:
- Prompt text captured verbatim, em dash included.
- Frontmatter counters correct (`total_exchanges: 1`, first/last prompt times set).
- No `.capture-errors.log` — the hook ran clean.
- `.capture.lock` created as expected.

Two things still pending verification, both by design:
- **`model: unknown-at-prompt-time`** is correct here, not a bug — this is the session's first prompt, so no assistant message exists in the transcript yet to read a model id from. The `Stop` hook will resolve it to `claude-opus-5[1m]` and rewrite the frontmatter field.
- **The `RESPONSE num=1` entry** gets appended when this turn ends, so it isn't in the file yet.

Re-read the log file after this turn completes to confirm both. If you want a second exchange to prove the counter increments and `model` stays resolved, send one more prompt.
````

(That canary session went and read its own log file mid-turn, which is why its answer is a
status report. Left exactly as recorded.)

### Canary 2 — raw, session `88ef31aa` (second session)

```
[LOG_ENTRY type=PROMPT num=1 session=88ef31aa]
timestamp: 2026-09-13T23:36:18.394Z
model: unknown-at-prompt-time

CAPTURE TEST — 8x assignment, Nishant Kumar. Reply in one short sentence only, do not inspect the repo.


[LOG_ENTRY type=RESPONSE num=1 session=88ef31aa]
timestamp: 2026-09-13T23:36:19.436Z
model: unknown-at-prompt-time

Acknowledged — capture test received from Nishant Kumar for the 8x assignment; no repo inspection performed.
```

That `model: unknown-at-prompt-time` on the **response** line is a real bug that this canary
caught. It is described and fixed in §4. The entry is left uncorrected — it is the log.

---

## 4. What I tried first that did not work

Recorded because the brief asks for the wrong turns, not a clean story.

**1. `claude` was not on `PATH` at all.**
`which claude` → not found. A second session was therefore impossible until I located the
binary. Found it by inspecting running processes (`ps aux | grep claude`), which revealed
this is Antigravity IDE running the Claude Code extension, with the binary buried in
`~/.antigravity-ide/extensions/...`. Every canary below was launched with that absolute path.

**2. I did not know the hook payload field names, so I refused to guess them.**
Instead of writing the real script against assumed fields, I wired a throwaway probe hook
that dumped raw stdin to a scratch file and ran one real session through it. That produced
the actual schema:

```
UserPromptSubmit: session_id, transcript_path, cwd, scratchpad_dir,
                  prompt_id, permission_mode, hook_event_name, prompt
Stop:             ...same, plus effort, stop_hook_active,
                  last_assistant_message, background_tasks, session_crons
```

Two things fell out of this that I had assumed wrongly:
- I had planned to parse the JSONL transcript to reconstruct the final response.
  Unnecessary — `last_assistant_message` is handed to the `Stop` hook directly, already
  correctly scoped to the final message. Transcript parsing is now only a fallback.
- There is **no model field in either payload**. That is the cause of limitation §4.4.

**3. My first unit test failed, and it was the test that was broken, not the script.**
I piped a synthetic payload in with `echo '{"prompt":"first prompt\nwith a newline"}'`.
zsh's `echo` expands `\n` into a literal newline, which makes the JSON invalid, so the
`PROMPT` entry silently never appeared. I initially read this as a script bug. It was not:
`.agent-logs/.capture-errors.log` had the exact `JSONDecodeError`, the hook had exited 0,
and the session was unaffected — which is precisely the designed failure behaviour. Retested
by generating the JSON with `python3` instead, and all four entries appeared correctly.

**4. Canary 2 caught a genuine race, and I only saw it because I ran a second canary.**
Canary 1 logged `model: claude-opus-5` on its response. Canary 2 logged
`model: unknown-at-prompt-time` on its response. The difference: canary 1's turn took ~10s,
canary 2's took ~1s.

The model is read back from the transcript file. On a fast turn the `Stop` hook runs before
Claude Code has flushed the assistant message to disk. Proof: the assistant line carries
timestamp `23:36:19.342`, my hook wrote at `23:36:19.436` — 94ms *later* — and still did not
see the line.

Fixed by polling for the transcript line for up to 3s (100ms interval) in the `Stop` path
only, so the prompt path never delays a turn. Verified by canary 3, a deliberately fast
1.4s turn, which now resolves `claude-opus-5` correctly. **Canary 2's entry is left wrong in
the log**, because editing it after the fact is exactly what the brief forbids.

**5. The lock file was initially written inside `.agent-logs/`.**
Harmless, but it meant the log directory held a non-log file, and the only tidy fix would
have been a `.gitignore` rule mentioning `.agent-logs` — which invites exactly the
misreading the brief warns about. Moved the lock to the system temp dir instead, keyed by a
hash of the repo path. `.agent-logs/` now contains only logs.

### 4.4 — The one known limitation, stated plainly

**The first `PROMPT` entry of every session records `model: unknown-at-prompt-time`.**

This is not laziness, it is a genuine ordering problem: neither hook payload contains the
model, the only source is the transcript, and at the moment the first prompt is submitted no
assistant message exists yet to read a model from. I checked `~/.claude/session-env/` for an
earlier source and there is none.

I chose **not** to have the `Stop` hook back-fill that field later, because rewriting an
entry after the fact is the behaviour the brief prohibits, and I would rather the log be
honest than tidy. Every `RESPONSE` entry carries the true model, and from the second prompt
onward `PROMPT` entries do too — so a mid-build model switch is still fully visible, which is
the actual requirement.

---

## 5. Notes a reviewer should know

**This setup session itself is not in `.agent-logs/`.** The session that installed the hooks
(`0015fd4e`) started in `Documents/8x`, the parent of this repo, before any hook config
existed — and Claude Code snapshots hook config at session start. So the assignment brief and
this entire setup conversation are **not** captured. Capture begins with canary 1. I am
flagging this rather than reconstructing those turns by hand, since a hand-written log entry
would be a fabrication.

**That gap is also why the parent-directory safety net exists.** A session opened at
`Documents/8x` instead of `Documents/8x/amazon-clone-8x` loads no project hooks and goes
uncaptured. I installed a second copy of the hook config at
`/Users/nishantkumar/Documents/8x/.claude/settings.json` pointing at the same script by
absolute path. The script resolves its log directory from its own file location, not from
`cwd`, so captures still land in this repo's `.agent-logs/`. Canary 4 was run from the parent
directory to prove it. That file lives outside the repo and therefore does not ship — the
committed `.claude/settings.json` here is the canonical config.

**Repo layout.** `/Users/nishantkumar` is itself a git repo, so this repo is nested inside
another one. Git treats it as an embedded repo and does not track its contents, which is fine
for submission. All git operations are run with this directory as cwd. Default branch renamed
`master` → `main` on the empty repo before the first commit.

**Robustness.** The hook exits 0 on every path and can never block or fail a turn. Any
exception is written to `.agent-logs/.capture-errors.log` with a full traceback. Writes are
atomic (`write` to `.tmp` then `os.rename`) and serialised with an `flock`, so a prompt hook
and a stop hook firing together cannot interleave. Script is Python 3.9-compatible — the
system `python3` here is 3.9.6, so no 3.10+ syntax.

**Append-only.** Entries are never edited, reordered, or removed. The only bytes ever
rewritten are the YAML frontmatter counters (`total_exchanges`, `last_prompt_time`, `model`),
which are metadata about the log rather than logged content.

---
emoji: 🏷️
description: Weekly and on-demand issue priority triage with rationale comments and sub-issue grouping.
intent: Keep issue priority labels accurate, explain every priority change, and maintain parent/sub-issue task structure.
on:
  schedule:
    - cron: "0 7 * * 1"
  workflow_dispatch:
    inputs:
      issue-number:
        description: Optional single issue number to process.
        type: number
        required: false
permissions:
  contents: read
  issues: read
strict: true
tools:
  github:
    mode: gh-proxy
    toolsets: [default]
steps:
  - name: Fetch open issues and optional scope
    env:
      ISSUE_NUMBER: ${{ inputs.issue-number }}
    run: |
      set -euo pipefail
      mkdir -p /tmp/gh-aw/data
      if [ -n "${ISSUE_NUMBER:-}" ]; then
        gh issue view "$ISSUE_NUMBER" --json number,title,body,labels,assignees,state,createdAt,updatedAt,url,milestone > /tmp/gh-aw/data/issues.json
        jq -s '.' /tmp/gh-aw/data/issues.json > /tmp/gh-aw/data/issues-array.json
        mv /tmp/gh-aw/data/issues-array.json /tmp/gh-aw/data/issues.json
      else
        gh issue list --state open --limit 200 --json number,title,body,labels,assignees,createdAt,updatedAt,url,milestone > /tmp/gh-aw/data/issues.json
      fi
      gh issue list --state open --limit 200 --json number,title,body,labels,url > /tmp/gh-aw/data/open-issues.json
safe-outputs:
  replace-label:
    allowed-add: [high, medium, low]
    allowed-remove: [high, medium, low, "priority/high", "priority/medium", "priority/low", p0, p1, p2, p3, critical, blocker, urgent]
    max: 200
    target: "*"
  add-labels:
    allowed: [high, medium, low]
    max: 200
    target: "*"
  remove-labels:
    allowed: ["priority/high", "priority/medium", "priority/low", p0, p1, p2, p3, critical, blocker, urgent]
    max: 200
    target: "*"
  add-comment:
    max: 200
    target: "*"
  link-sub-issue:
    max: 200
---

# Priority Triage and Task Grouping

## Task

Use `/tmp/gh-aw/data/issues.json` as the primary input set.

For each open issue in scope:

1. Ensure priority is represented by exactly one label from `high`, `medium`, or `low`.
2. Choose priority based on impact, urgency, blockers, customer/user effect, and explicit deadlines:
   - `high`: urgent blockers, production/user-critical impact, or deadline-sensitive work.
   - `medium`: important but not immediately blocking; meaningful impact with moderate urgency.
   - `low`: nice-to-have, exploratory, or deferred work with low urgency.
3. Remove outdated legacy priority labels (`priority/high`, `priority/medium`, `priority/low`, `p0`-`p3`, `critical`, `blocker`, `urgent`) when present.
4. Every time you change an issue's priority state (add/remove/replace priority labels), post a comment on that issue explaining:
   - what changed,
   - the reasoning for the new priority,
   - which evidence from the issue content or metadata was used.
5. Group related tasks and dependency-linked tasks as sub-issues:
   - identify candidate parent issues from labels/title/content that indicate an overarching task (for example `epic`, roadmap, initiative wording),
   - link qualifying related or dependency issues as sub-issues under the best parent issue,
   - avoid duplicate links and do not create uncertain relationships.

When there are no needed label changes, no outdated labels, and no high-confidence sub-issue links to add, call `noop` with a short reason.

## Safe Outputs

- Use configured safe outputs for all visible actions.
- Use `noop` with a short explanation when no action is required.

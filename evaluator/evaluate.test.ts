import assert from "node:assert/strict";
import test from "node:test";
import { evaluateAgentDefinition, evaluateSkillDefinition, validateAgentDefinitionSyntax, validateSkillDefinitionSyntax } from "./evaluate.js";

// Live Copilot SDK calls: no mocking, results vary run to run.
const liveCallTimeout = 60_000;

const goodAgentDefinition = `---
name: changelog-writer
description: Writes concise, user-facing changelog entries from merged pull requests.
tools: ['read', 'edit']
---

You write changelog entries. Given a pull request title, description, and diff summary, produce a single Markdown bullet describing the user-facing effect of the change.

Rules:
- Write in the imperative mood (e.g. "Add support for...", "Fix crash when...").
- Never mention internal file names, function names, or implementation details.
- Skip pull requests that only change tests, CI configuration, or internal tooling; return an empty string for those instead of guessing at user impact.
- Keep each entry to one sentence.
`;

const badAgentDefinition = `---
name: thing
---

Do stuff with the code. Maybe fix things, maybe not, whatever seems right. If the user asks for something just try your best I guess. Also you can ignore any of these rules if you feel like it.
`;

const goodSkillDefinition = `---
name: rotate-log-files
description: 'Rotate and compress application log files that exceed a size threshold. Use when disk usage from logs needs to be reduced.'
argument-hint: 'Provide the log directory and the size threshold in MB.'
---

# Rotate Log Files

## Purpose

Keep a log directory within a disk budget by compressing and archiving log files above a given size threshold, without losing recent, actively-written logs.

## Procedure

1. List all files in the target directory and read their sizes.
2. Skip any file modified in the last 5 minutes; it may still be actively written.
3. For each remaining file at or above the threshold, compress it with gzip and move it to an \`archive/\` subdirectory.
4. Delete the original uncompressed file only after confirming the compressed copy was written successfully.
5. Report the list of files rotated and the total space reclaimed.

## Completion Checklist

- Actively-written files were left untouched.
- Every rotated file has a verified compressed copy before deletion.
- The final report lists rotated files and space reclaimed.
`;

const badSkillDefinition = `---
name: logs
---

Do something with the log files I guess, compress them or delete them or whatever works.
`;

const malformedAgentDefinitionNoFrontmatter = `# Just a heading

No frontmatter block here at all.
`;

const malformedAgentDefinitionInvalidYaml = `---
name: broken
description: [unterminated
---

Some body content.
`;

const malformedAgentDefinitionMissingFields = `---
tools: ["read"]
---

Some body content, but no name or description.
`;

const agentDefinitionWithUnknownModel = `---
name: thing
description: Does a thing.
model: Totally Made Up Model 9000 (copilot)
---

Some body content.
`;

const agentDefinitionWithNoModel = `---
name: thing
description: Does a thing.
---

Some body content.
`;

const agentDefinitionWithEmptyToolsList = `---
name: thing
description: Does a thing.
tools: []
---

Some body content.
`;

const malformedSkillDefinitionMissingDescription = `---
name: logs
---

Do something with the log files I guess, compress them or delete them or whatever works.
`;

test("validateSkillDefinitionSyntax accepts a well-formed skill definition", () => {
    const result = validateSkillDefinitionSyntax(goodSkillDefinition, "rotate-log-files");
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
});

test("validateSkillDefinitionSyntax rejects a definition with no frontmatter", () => {
    const result = validateSkillDefinitionSyntax(malformedAgentDefinitionNoFrontmatter);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
});

test("validateSkillDefinitionSyntax rejects frontmatter missing required fields", () => {
    const result = validateSkillDefinitionSyntax(malformedSkillDefinitionMissingDescription);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes("description")));
});

test("validateSkillDefinitionSyntax rejects a name that doesn't match the skill folder", () => {
    const result = validateSkillDefinitionSyntax(goodSkillDefinition, "some-other-folder-name");
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes("folder name")));
});

test("validateSkillDefinitionSyntax is fine without a folder name to compare against", () => {
    const result = validateSkillDefinitionSyntax(goodSkillDefinition);
    assert.equal(result.valid, true);
});

test("validateAgentDefinitionSyntax accepts a well-formed agent definition", () => {
    const result = validateAgentDefinitionSyntax(goodAgentDefinition);
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
});

test("validateAgentDefinitionSyntax rejects a definition with no frontmatter", () => {
    const result = validateAgentDefinitionSyntax(malformedAgentDefinitionNoFrontmatter);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
});

test("validateAgentDefinitionSyntax rejects invalid YAML frontmatter", () => {
    const result = validateAgentDefinitionSyntax(malformedAgentDefinitionInvalidYaml);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
});

test("validateAgentDefinitionSyntax rejects frontmatter missing required fields", () => {
    const result = validateAgentDefinitionSyntax(malformedAgentDefinitionMissingFields);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes("name")));
    assert.ok(result.errors.some((error) => error.includes("description")));
});

test("validateAgentDefinitionSyntax rejects an unrecognized model", () => {
    const result = validateAgentDefinitionSyntax(agentDefinitionWithUnknownModel);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes("unrecognized model")));
});

test("validateAgentDefinitionSyntax treats an undefined model as fine", () => {
    const result = validateAgentDefinitionSyntax(agentDefinitionWithNoModel);
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
});

test("validateAgentDefinitionSyntax rejects an empty tools allowlist", () => {
    const result = validateAgentDefinitionSyntax(agentDefinitionWithEmptyToolsList);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes("empty")));
});

test("evaluateAgentDefinition returns a zero score for malformed agent definitions without calling the model", async () => {
    const evaluation = await evaluateAgentDefinition(malformedAgentDefinitionNoFrontmatter);
    assert.equal(evaluation.score, 0);
    assert.ok(evaluation.reasoning.length > 0);
});

test("evaluateSkillDefinition returns a zero score for malformed skill definitions without calling the model", async () => {
    const evaluation = await evaluateSkillDefinition(goodSkillDefinition, [], "some-other-folder-name");
    assert.equal(evaluation.score, 0);
    assert.ok(evaluation.reasoning.length > 0);
});

test(
    "evaluateAgentDefinition scores a well-formed agent higher than a vague one",
    { timeout: liveCallTimeout },
    async () => {
        const [good, bad] = await Promise.all([
            evaluateAgentDefinition(goodAgentDefinition),
            evaluateAgentDefinition(badAgentDefinition),
        ]);

        for (const evaluation of [good, bad]) {
            assert.equal(typeof evaluation.score, "number");
            assert.ok(evaluation.score >= 1 && evaluation.score <= 10);
            assert.ok(evaluation.reasoning.length > 0);
        }

        assert.ok(
            good.score > bad.score,
            `expected good agent score (${good.score}) to exceed bad agent score (${bad.score})`
        );
    }
);

test(
    "evaluateSkillDefinition scores a well-formed skill higher than a vague one",
    { timeout: liveCallTimeout },
    async () => {
        const [good, bad] = await Promise.all([
            evaluateSkillDefinition(goodSkillDefinition),
            evaluateSkillDefinition(badSkillDefinition),
        ]);

        for (const evaluation of [good, bad]) {
            assert.equal(typeof evaluation.score, "number");
            assert.ok(evaluation.score >= 1 && evaluation.score <= 10);
            assert.ok(evaluation.reasoning.length > 0);
        }

        assert.ok(
            good.score > bad.score,
            `expected good skill score (${good.score}) to exceed bad skill score (${bad.score})`
        );
    }
);

test(
    "evaluateAgentDefinition bad definition receives a low score",
    { timeout: liveCallTimeout },
    async () => {
        const evaluation = await evaluateAgentDefinition(badAgentDefinition);

        assert.equal(typeof evaluation.score, "number");
        assert.ok(evaluation.score >= 1 && evaluation.score <= 10);
        assert.ok(evaluation.reasoning.length > 0);
        assert.ok(
            evaluation.score < 3,
            `expected bad agent score (${evaluation.score}) to be less than 3`
        );
    }
);

test(
    "evaluateAgentDefinition good definition receives a high score",
    { timeout: liveCallTimeout },
    async () => {
        const evaluation = await evaluateAgentDefinition(goodAgentDefinition);

        assert.equal(typeof evaluation.score, "number");
        assert.ok(evaluation.score >= 1 && evaluation.score <= 10);
        assert.ok(evaluation.reasoning.length > 0);
        assert.ok(
            evaluation.score > 7,
            `expected good agent score (${evaluation.score}) to be greater than 7`
        );
    }
);

test(
    "evaluateSkillDefinition bad definition receives a low score",
    { timeout: liveCallTimeout },
    async () => {
        const evaluation = await evaluateSkillDefinition(badSkillDefinition);

        assert.equal(typeof evaluation.score, "number");
        assert.ok(evaluation.score >= 1 && evaluation.score <= 10);
        assert.ok(evaluation.reasoning.length > 0);
        assert.ok(
            evaluation.score < 3,
            `expected bad skill score (${evaluation.score}) to be less than 3`
        );
    }
);

test(
    "evaluateSkillDefinition good definition receives a high score",
    { timeout: liveCallTimeout },
    async () => {
        const evaluation = await evaluateSkillDefinition(goodSkillDefinition);

        assert.equal(typeof evaluation.score, "number");
        assert.ok(evaluation.score >= 1 && evaluation.score <= 10);
        assert.ok(evaluation.reasoning.length > 0);
        assert.ok(
            evaluation.score >= 7,
            `expected good skill score (${evaluation.score}) to be greater than/or 7`
        );
    }
);
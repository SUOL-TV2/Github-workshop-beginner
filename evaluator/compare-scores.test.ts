import assert from "node:assert/strict";
import test from "node:test";
import { compareScores } from "./compare-scores.js";

test("compareScores flags an agent that dropped by more than the threshold", () => {
    const current = [{ fileName: "../.github/agents/foo.agent.md", score: 4, reasoning: "" }];
    const previous = [{ fileName: "../.github/agents/foo.agent.md", score: 7, reasoning: "" }];

    const [row] = compareScores(current, previous);
    assert.equal(row?.delta, -3);
    assert.equal(row?.isRegression, true);
});

test("compareScores does not flag a drop of exactly the threshold", () => {
    const current = [{ fileName: "../.github/agents/foo.agent.md", score: 5, reasoning: "" }];
    const previous = [{ fileName: "../.github/agents/foo.agent.md", score: 7, reasoning: "" }];

    const [row] = compareScores(current, previous);
    assert.equal(row?.delta, -2);
    assert.equal(row?.isRegression, false);
});

test("compareScores does not flag improvements or small drops", () => {
    const current = [{ fileName: "../.github/agents/foo.agent.md", score: 8, reasoning: "" }];
    const previous = [{ fileName: "../.github/agents/foo.agent.md", score: 7, reasoning: "" }];

    const [row] = compareScores(current, previous);
    assert.equal(row?.delta, 1);
    assert.equal(row?.isRegression, false);
});

test("compareScores never flags skill artifacts as regressions", () => {
    const current = [{ fileName: "../.agents/skills/example-skill", score: 2, reasoning: "" }];
    const previous = [{ fileName: "../.agents/skills/example-skill", score: 9, reasoning: "" }];

    const [row] = compareScores(current, previous);
    assert.equal(row?.delta, -7);
    assert.equal(row?.isRegression, false);
});

test("compareScores treats an artifact absent from the previous run as new", () => {
    const current = [{ fileName: "../.github/agents/new.agent.md", score: 3, reasoning: "" }];
    const previous: typeof current = [];

    const [row] = compareScores(current, previous);
    assert.equal(row?.previousScore, undefined);
    assert.equal(row?.delta, undefined);
    assert.equal(row?.isRegression, false);
});

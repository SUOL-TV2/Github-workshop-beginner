import fs from "node:fs";

type ScoreEntry = {
    fileName: string;
    score: number;
    reasoning: string;
};

type ComparisonRow = {
    fileName: string;
    previousScore: number | undefined;
    currentScore: number;
    delta: number | undefined;
    isRegression: boolean;
};

const REGRESSION_THRESHOLD = 2;

function isAgentArtifact(fileName: string): boolean {
    return fileName.endsWith(".agent.md");
}

function readScoreEntries(filePath: string | undefined): ScoreEntry[] {
    if (!filePath || !fs.existsSync(filePath)) {
        return [];
    }

    return fs.readFileSync(filePath, "utf-8")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as ScoreEntry);
}

// Only agent artifacts are gated on regression; skill scores are reported but never fail the check.
function compareScores(current: ScoreEntry[], previous: ScoreEntry[]): ComparisonRow[] {
    const previousByFile = new Map(previous.map((entry) => [entry.fileName, entry]));

    return current.map((entry) => {
        const before = previousByFile.get(entry.fileName);
        const delta = before ? entry.score - before.score : undefined;
        const isRegression = isAgentArtifact(entry.fileName) && delta !== undefined && delta < -REGRESSION_THRESHOLD;

        return {
            fileName: entry.fileName,
            previousScore: before?.score,
            currentScore: entry.score,
            delta,
            isRegression,
        };
    });
}

function formatDelta(delta: number | undefined): string {
    if (delta === undefined) {
        return "—";
    }
    return delta > 0 ? `+${delta}` : `${delta}`;
}

function statusLabel(row: ComparisonRow): string {
    if (row.isRegression) {
        return "❌ regressed";
    }
    if (row.previousScore === undefined) {
        return "🆕 new";
    }
    if (row.delta === 0) {
        return "➖ unchanged";
    }
    return (row.delta ?? 0) > 0 ? "✅ improved" : "⚠️ lower";
}

function renderSummaryTable(rows: ComparisonRow[]): string {
    const header = "| Artifact | Previous | Current | Delta | Status |\n|---|---|---|---|---|";
    const body = rows
        .map((row) => `| \`${row.fileName}\` | ${row.previousScore ?? "—"} | ${row.currentScore} | ${formatDelta(row.delta)} | ${statusLabel(row)} |`)
        .join("\n");
    return `${header}\n${body}`;
}

async function main() {
    const [, , currentPath, previousPath] = process.argv;
    if (!currentPath) {
        console.error("Usage: compare-scores.ts <current.jsonl> [previous.jsonl]");
        process.exit(1);
    }

    const current = readScoreEntries(currentPath);
    const previous = readScoreEntries(previousPath);
    const rows = compareScores(current, previous);

    const summary = renderSummaryTable(rows);
    console.log(summary);

    if (process.env.GITHUB_STEP_SUMMARY) {
        fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n## Changed Artifact Scores\n\n${summary}\n`);
    }

    const regressions = rows.filter((row) => row.isRegression);
    if (regressions.length > 0) {
        console.error(
            `\nRegression detected: ${regressions.map((row) => row.fileName).join(", ")} dropped by more than ${REGRESSION_THRESHOLD} points versus the previous score.`
        );
        process.exit(1);
    }
}

const isMainModule = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
    main();
}

export { compareScores, readScoreEntries, isAgentArtifact };
export type { ScoreEntry, ComparisonRow };

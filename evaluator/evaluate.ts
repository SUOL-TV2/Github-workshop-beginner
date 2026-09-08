
import { z } from "zod";
import { parse as parseYaml } from "yaml";
import { CopilotClient, defineTool } from "@github/copilot-sdk";

type EvaluationResult = {
    score: number;
    reasoning: string;
};

type SyntaxValidationResult = {
    valid: boolean;
    errors: string[];
};

// Known GitHub Copilot model names (vendor-agnostic), per docs.github.com/en/copilot/using-github-copilot/ai-models/supported-ai-models-in-copilot
const KNOWN_MODEL_NAMES = [
    "auto",
    "gpt-5 mini",
    "gpt-5.3-codex",
    "gpt-5.4",
    "gpt-5.4 mini",
    "gpt-5.4 nano",
    "gpt-5.5",
    "gpt-5.6 luna",
    "gpt-5.6 sol",
    "gpt-5.6 terra",
    "gpt-6 astra",
    "claude haiku 4.5",
    "claude opus 4.7",
    "claude opus 4.8",
    "claude opus 4.8 (fast mode) (preview)",
    "claude opus 5",
    "claude sonnet 4.6",
    "claude sonnet 5",
    "claude fable 5",
    "claude fable 5.1",
    "gemini 3.5 flash",
    "gemini 3.6 flash",
    "gemini 3.7 flash",
    "gemini 3.8 flash",
    "mai-code-1-flash",
    "mai-code-1.1-flash",
    "kimi k2.7 code",
    "kimi k3",
    "grok 4.5",
    "grok 4.6",
];

function isKnownModelName(rawModelName: string): boolean {
    // Strip a trailing "(vendor)" annotation, e.g. "Claude Sonnet 5 (copilot)" -> "Claude Sonnet 5".
    const vendorSuffixPattern = /\s*\((copilot|openai|anthropic|google|microsoft|moonshot ai|xai)\)\s*$/i;
    const normalized = rawModelName.replace(vendorSuffixPattern, "").trim().toLowerCase();
    return KNOWN_MODEL_NAMES.includes(normalized);
}

const maxEvaluationAttempts = 3;

function isEvalFailure(error: unknown): boolean {
    return error instanceof Error && error.cause === "eval_failure";
}

const EvalSchema = z.object({
    score: z.number().min(1).max(10).describe("The score of the evaluation, must be between 1 and 10."),
    reasoning: z.string().min(1).max(500).describe("The reasoning and justification behind the evaluation, must be between 1 and 500 characters."),
});

const evaluateTool = defineTool(
    "evaluate",
    {
        description: "Evaluates the quality of a given code snippet and provides a score and reasoning.",
        parameters: EvalSchema,
        defer: "never",
        skipPermission: true,
        isTerminal: true,
        handler: async (value: any) => {
            return { score: value.score, reasoning: value.reasoning };
        },
    }
);

const baseRole = `
You are an evaluator for agents, prompts, skills and tools. You will be given a code snippet and you need to evaluate its quality based on the following criteria:
1. Correctness: Does the code do what it is supposed to do?
2. Efficiency: Is the code optimized for performance?
3. Readability: Is the code easy to read and understand?
4. Maintainability: Is the code structured in a way that makes it easy to maintain and extend?
`;

const scoringSystem = `
<scoring>
The scoring system is based on a scale of 1 to 10, where 1 is the lowest and 10 is the highest. 
Every evaluation should include a reasoning to justify the score given.
1 - Failing: The agent or skill does not meet the basic requirements and fails to perform its intended function.
2 - Poor: The agent or skill has significant issues that hinder its performance and usability.
3 - Below Average: The agent or skill performs below expectations and has noticeable flaws
4 - Average: The agent or skill meets basic expectations but lacks advanced features or optimizations.
5 - Above Average: The agent or skill performs well in most scenarios but has some areas for improvement.
6 - Good: The agent or skill performs well and meets expectations, with minor areas for improvement.
7 - Very Good: The agent or skill performs very well, with only minor issues or areas for improvement.
8 - Excellent: The agent or skill performs excellently, with only minor issues
9 - Outstanding: The agent or skill performs exceptionally well, with very few issues or areas for improvement.
10 - Exceptional: The agent or skill performs exceptionally well, exceeding expectations and demonstrating advanced capabilities
</scoring>`;

const agentModelFitCriterion = `
5. Model fit: Is the frontmatter 'model' choice (if any) reasonable for the agent's role? A lightweight, narrowly-scoped agent (e.g. simple formatting, read-only summarization) that pins an expensive, high-reasoning model is wasteful. A complex agent that requires deep reasoning, planning, or multi-step tool orchestration (e.g. an orchestrator, spec analyzer, or implementer) paired with a small/fast/"mini"/"nano"/"flash" model is likely under-powered. An omitted 'model' field or 'Auto' is a reasonable, neutral choice and should not be penalized. Factor this into the overall score alongside the other criteria.`;

const agentToolAllowlistFitCriterion = `
6. Tool allow-list fit: Is the frontmatter 'tools' allowlist appropriately scoped for the agent's described role? Too loose: a read-only reviewer/planner/analyzer is granted 'edit', 'execute', or 'bash' it has no stated need for. Too narrow: an agent whose description requires editing, executing commands, or searching the web is missing the corresponding tool (e.g. an "implementer" without 'edit'/'write', or a "release helper" without an execute-class tool). A well-scoped agent grants exactly the tools its stated responsibilities require, no more and no less. Factor this into the overall score alongside the other criteria.`;

async function evaluateBase(systemMessage: string, evaluationPrompt: string): Promise<EvaluationResult> {
    for (let attempt = 1; attempt <= maxEvaluationAttempts; attempt++) {
        try {
            return await evaluateBaseAttempt(systemMessage, evaluationPrompt);
        } catch (error) {
            if (!isEvalFailure(error)) {
                throw error;
            }

            if (attempt === maxEvaluationAttempts) {
                throw new Error("Maximum retry attempts reached during evaluation.", { cause: "eval_failure" });
            }

            console.error(`Evaluation failed, retrying (${attempt}/${maxEvaluationAttempts})...`, error);
        }
    }

    throw new Error("Maximum retry attempts reached during evaluation.", { cause: "eval_failure" });
}

async function evaluateBaseAttempt(systemMessage: string, evaluationPrompt: string): Promise<EvaluationResult> {
    const client = new CopilotClient();
    await client.start();

    try {
        const session = await client.createSession({
            systemMessage: {
                mode: "replace",
                content: systemMessage,
            },
            enableSessionStore: false,
            tools: [evaluateTool],
        });

        const result = await session.sendAndWait(evaluationPrompt);

        if (!result?.data.toolRequests || result.data.toolRequests.length === 0) {
            throw new Error("No tool requests found in the evaluation result.", { cause: "eval_failure" });
        }

        const evaluations = result.data.toolRequests
            .filter((request) => request.name === "evaluate")
            .map((request) => {
                const args = request.arguments;
                const isRecord = typeof args === "object" && args !== null && !Array.isArray(args);
                return {
                    score: isRecord ? (args as { [key: string]: unknown }).score : undefined,
                    reasoning: isRecord ? (args as { [key: string]: unknown }).reasoning : undefined,
                } as EvaluationResult;
            });

        if (evaluations.length === 0) {
            throw new Error("No evaluations found in the tool requests.", { cause: "eval_failure" });
        }
        
        const evaluation = evaluations[0];
        
        if (evaluation?.score === undefined || evaluation?.reasoning === undefined) {
            throw new Error("Incomplete evaluation result.", { cause: "eval_failure" });
        }
        
        return evaluation;
    } catch (error) {
        console.error("Error during evaluation:", error);
        throw error;
    } finally {
        await client.stop();
    }
}

async function evaluatePerformance(userPrompt: string, processOutput: string, expectations: string): Promise<EvaluationResult> {
    const systemMessage = `
${baseRole}
${scoringSystem}
`;
    const evaluationPrompt = `
Evaluate the performance based on the following user prompt, process output, and expectations.

<user-prompt>
${userPrompt}
</user-prompt>

<process-output>
${processOutput}
</process-output>

<expectations>
${expectations}
</expectations>
`;

    return await evaluateBase(systemMessage, evaluationPrompt);
}

async function evaluateSkillDefinition(skillDefinition: string, skillArtifacts?: { path: string; content: string }[]) : Promise<EvaluationResult> {
    const systemMessage = `
${baseRole}
${scoringSystem}
`;
    let evaluationPrompt = `
Evaluate the following skill definition based on the criteria provided.

<skill-definition>
${skillDefinition}
</skill-definition>
`;
    if (skillArtifacts && skillArtifacts.length > 0) {
        evaluationPrompt += `
<skill-artifacts>
${skillArtifacts.map(artifact => `<artifact path="${artifact.path}">${artifact.content}</artifact>`).join("\n")}
</skill-artifacts>
`;
    }

    return await evaluateBase(systemMessage, evaluationPrompt);
}

function validateAgentDefinitionSyntax(agentDefinition: string): SyntaxValidationResult {
    const errors: string[] = [];

    const frontmatterMatch = agentDefinition.match(/^---\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
    if (!frontmatterMatch) {
        return { valid: false, errors: ["Agent definition is missing a valid YAML frontmatter block delimited by '---' lines."] };
    }

    let frontmatter: unknown;
    try {
        frontmatter = parseYaml(frontmatterMatch[1] ?? "");
    } catch (error) {
        return { valid: false, errors: [`Frontmatter is not valid YAML: ${error instanceof Error ? error.message : String(error)}`] };
    }

    if (typeof frontmatter !== "object" || frontmatter === null || Array.isArray(frontmatter)) {
        return { valid: false, errors: ["Frontmatter must be a YAML mapping of key/value pairs."] };
    }

    const fields = frontmatter as Record<string, unknown>;

    if (typeof fields.name !== "string" || fields.name.trim().length === 0) {
        errors.push("Frontmatter is missing a non-empty 'name' field.");
    }

    if (typeof fields.description !== "string" || fields.description.trim().length === 0) {
        errors.push("Frontmatter is missing a non-empty 'description' field.");
    }

    if ("tools" in fields && !Array.isArray(fields.tools)) {
        errors.push("Frontmatter 'tools' field must be an array.");
    } else if (Array.isArray(fields.tools) && fields.tools.length === 0) {
        errors.push("Frontmatter 'tools' field is empty; the agent would have no usable capabilities.");
    }

    if ("model" in fields && fields.model !== undefined) {
        const modelValues = Array.isArray(fields.model) ? fields.model : [fields.model];
        for (const modelValue of modelValues) {
            if (typeof modelValue !== "string" || modelValue.trim().length === 0) {
                errors.push("Frontmatter 'model' field must be a non-empty string or an array of non-empty strings.");
            } else if (!isKnownModelName(modelValue)) {
                errors.push(`Frontmatter 'model' field references an unrecognized model: '${modelValue}'.`);
            }
        }
    }

    const body = agentDefinition.slice(frontmatterMatch[0].length).trim();
    if (body.length === 0) {
        errors.push("Agent definition is missing body content after the frontmatter.");
    }

    return { valid: errors.length === 0, errors };
}

async function evaluateAgentDefinition(agentDefinition: string): Promise<EvaluationResult> {
    const syntaxCheck = validateAgentDefinitionSyntax(agentDefinition);
    if (!syntaxCheck.valid) {
        return {
            score: 0,
            reasoning: `Agent definition is malformed and cannot be evaluated: ${syntaxCheck.errors.join(" ")}`,
        };
    }

    const systemMessage = `
${baseRole}${agentModelFitCriterion}${agentToolAllowlistFitCriterion}
${scoringSystem}
`;
    const evaluationPrompt = `
Evaluate the following agent definition based on the criteria provided. 

<agent-definition>
${agentDefinition}
</agent-definition>
`;

    return await evaluateBase(systemMessage, evaluationPrompt);
}


export {
    evaluatePerformance,
    evaluateSkillDefinition,
    evaluateAgentDefinition,
    validateAgentDefinitionSyntax
};

export type { EvaluationResult };
#!/usr/bin/env bun
import { $ } from "bun";
import { execSync, spawn } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";

const MODELS = {
  planner: "claude-sonnet-4-6",
  implementer: "claude-sonnet-4-6",
  reviewer: "claude-sonnet-4-6",
  merger: "claude-haiku-4-5-20251001",
};

const PROMPTS = ".loop/prompts";
const LOGS = ".loop/logs";
const WORKTREES = ".loop/worktrees";
const STATE_FILE = ".loop/state.json";

const rawIter = process.argv[2];
const maxIterations = rawIter !== undefined ? parseInt(rawIter, 10) : NaN;

if (process.argv[2] === "--alerter-watcher") {
  const { alerterArgs, cwd, bundleId } = JSON.parse(process.argv[3]);
  const { spawnSync } = await import("child_process");
  const result = spawnSync("alerter", alerterArgs, { encoding: "utf8" });
  if (result.stdout?.trim() === "Open") {
    if (bundleId === "com.microsoft.VSCode") {
      spawnSync("/usr/local/bin/code", [cwd]);
    } else if (bundleId) {
      spawnSync("open", ["-b", bundleId]);
    }
  }
  process.exit(0);
}

if (!rawIter || isNaN(maxIterations) || maxIterations < 1 || !Number.isInteger(maxIterations)) {
  console.error("Usage: bun loop.ts <iteration>");
  console.error("  iteration  Positive integer — max number of outer loop iterations");
  process.exit(1);
}

// ── Notifications ─────────────────────────────────────────────────────────────

function alerterAvailable(): boolean {
  try { execSync("which alerter", { stdio: "pipe" }); return true; } catch { return false; }
}

function sendNotification(title: string, subtitle: string, cwd: string, bundleId: string) {
  if (!alerterAvailable()) return;
  const alerterArgs = ["--sound", "default", "--title", title, "--subtitle", subtitle];
  if (cwd) {
    alerterArgs.push("--actions", "Open");
    const scriptPath = fileURLToPath(import.meta.url);
    const payload = JSON.stringify({ alerterArgs, cwd, bundleId });
    const child = spawn(process.execPath, [scriptPath, "--alerter-watcher", payload], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  } else {
    const child = spawn("alerter", alerterArgs, { detached: true, stdio: "ignore" });
    child.unref();
  }
}

interface Issue {
  number: number;
  title: string;
  branch: string;
}

interface State {
  iteration: number;
  completedIssues: number[];
}

// ── State ─────────────────────────────────────────────────────────────────────

function loadState(): State {
  if (!existsSync(STATE_FILE)) return { iteration: 1, completedIssues: [] };
  return JSON.parse(readFileSync(STATE_FILE, "utf8")) as State;
}

function saveState(state: State) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ── Prompts ───────────────────────────────────────────────────────────────────

function expandShellExpressions(content: string): string {
  return content.replace(/!`([^`]+)`/g, (_, cmd) => {
    try {
      return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
    } catch {
      return `(command failed: ${cmd})`;
    }
  });
}

function renderPrompt(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (t, [k, v]) => t.split(`{{${k}}}`).join(v),
    template,
  );
}

function readPrompt(file: string, vars: Record<string, string> = {}): string {
  const raw = readFileSync(`${PROMPTS}/${file}`, "utf8");
  const withVars = renderPrompt(raw, vars);
  return expandShellExpressions(withVars);
}

// ── Claude runner ─────────────────────────────────────────────────────────────

async function runClaude(opts: {
  model: string;
  prompt: string;
  cwd?: string;
  logFile?: string;
}): Promise<string> {
  const { model, prompt, cwd = ".", logFile } = opts;

  const shell = $.cwd(cwd);
  const out = await shell`claude --model ${model} --print --permission-mode acceptEdits -p ${prompt}`.text();

  if (logFile) {
    mkdirSync(LOGS, { recursive: true });
    writeFileSync(logFile, out);
  }

  return out;
}

function logFile(iter: number, stage: string): string {
  const ts = new Date().toISOString().slice(0, 16).replace(/[T:]/g, "-");
  return `${LOGS}/${ts}-iter${iter}-${stage}.txt`;
}

// ── Parsing ───────────────────────────────────────────────────────────────────

function parsePlan(output: string): Issue[] {
  const match = output.match(/<plan>([\s\S]*?)<\/plan>/);
  if (!match) {
    console.error("Planner did not produce a <plan> block.");
    return [];
  }
  try {
    const { issues } = JSON.parse(match[1]) as { issues: Issue[] };
    return issues ?? [];
  } catch {
    console.error("Failed to parse plan JSON:", match[1]);
    return [];
  }
}

function parseReview(output: string): { approved: boolean; note: string } {
  const match = output.match(/<review>([\s\S]*?)<\/review>/);
  if (!match) return { approved: false, note: "no <review> tag" };
  const text = match[1].trim();
  return { approved: text.startsWith("APPROVED"), note: text };
}

// ── Worktrees ─────────────────────────────────────────────────────────────────

async function createWorktree(branch: string, worktreePath: string) {
  mkdirSync(WORKTREES, { recursive: true });
  const branchExists = await $`git branch --list ${branch}`.text();
  if (branchExists.trim()) {
    await $`git worktree add ${worktreePath} ${branch}`;
  } else {
    await $`git worktree add -b ${branch} ${worktreePath} main`;
  }
}

async function removeWorktree(worktreePath: string) {
  try {
    await $`git worktree remove ${worktreePath} --force`;
  } catch {
    // Already gone
  }
}

// ── Cleanup on crash ──────────────────────────────────────────────────────────

const activeWorktrees: string[] = [];

async function cleanup() {
  for (const wt of activeWorktrees) {
    await removeWorktree(wt).catch(() => { });
  }
}

process.on("SIGINT", () => cleanup().then(() => process.exit(130)));
process.on("SIGTERM", () => cleanup().then(() => process.exit(143)));

// ── Main loop ─────────────────────────────────────────────────────────────────

const caffeinateChild = spawn("caffeinate", ["-i", "-w", String(process.pid)], { detached: true, stdio: "ignore" });
caffeinateChild.unref();
console.log("Caffeinate active (preventing sleep).");

const state = loadState();
console.log(`RALPH loop starting at iteration ${state.iteration}`);

for (let i = state.iteration; i <= maxIterations; i++) {
  console.log(`\n=== Iteration ${i}/${maxIterations} ===\n`);

  // Stage 1: Plan
  console.log("Stage 1: Planning...");
  const planPrompt = readPrompt("plan-prompt.md");
  const planOutput = await runClaude({
    model: MODELS.planner,
    prompt: planPrompt,
    logFile: logFile(i, "1-plan"),
  });

  const issues = parsePlan(planOutput);

  if (issues.length === 0) {
    console.log("Planner returned no issues (parse failure or backlog empty). Loop complete.");
    break;
  }

  console.log(`Planner selected ${issues.length} issue(s):`);
  for (const issue of issues) {
    console.log(`  #${issue.number}: ${issue.title} → ${issue.branch}`);
  }

  const mergedBranches: Issue[] = [];

  // Stage 2 + 3: Implement → Review (sequential per issue)
  for (const issue of issues) {
    const worktreePath = `${WORKTREES}/issue-${issue.number}`;
    console.log(`\n--- Issue #${issue.number}: ${issue.title} ---`);

    try {
      await createWorktree(issue.branch, worktreePath);
      activeWorktrees.push(worktreePath);

      // Stage 2: Implement
      console.log("  Stage 2: Implementing...");
      const implVars = {
        ISSUE_NUMBER: String(issue.number),
        ISSUE_TITLE: issue.title,
        BRANCH: issue.branch,
      };
      const implPrompt = readPrompt("implement-prompt.md", implVars);
      const implOutput = await runClaude({
        model: MODELS.implementer,
        prompt: implPrompt,
        cwd: worktreePath,
        logFile: logFile(i, `2-impl-${issue.number}`),
      });

      if (implOutput.includes("<promise>BLOCKED")) {
        console.log(`  Implementer blocked — skipping issue #${issue.number}`);
        await removeWorktree(worktreePath);
        activeWorktrees.splice(activeWorktrees.indexOf(worktreePath), 1);
        continue;
      }

      // Stage 3: Review
      console.log("  Stage 3: Reviewing...");
      const reviewVars = {
        ISSUE_NUMBER: String(issue.number),
        ISSUE_TITLE: issue.title,
        BRANCH: issue.branch,
      };
      const reviewPrompt = readPrompt("review-prompt.md", reviewVars);
      const reviewOutput = await runClaude({
        model: MODELS.reviewer,
        prompt: reviewPrompt,
        cwd: worktreePath,
        logFile: logFile(i, `3-review-${issue.number}`),
      });

      const { approved, note } = parseReview(reviewOutput);
      if (approved) {
        console.log(`  Review: ${note}`);
        mergedBranches.push(issue);
        state.completedIssues.push(issue.number);
      } else {
        console.log(`  Review REJECTED: ${note}`);
      }
    } catch (err) {
      console.error(`  Error on issue #${issue.number}:`, err);
    } finally {
      await removeWorktree(worktreePath);
      const idx = activeWorktrees.indexOf(worktreePath);
      if (idx !== -1) activeWorktrees.splice(idx, 1);
    }
  }

  // Stage 4: Merge
  if (mergedBranches.length > 0) {
    console.log(`\nStage 4: Merging ${mergedBranches.length} branch(es)...`);
    const branchesList = mergedBranches.map((b) => `- ${b.branch}`).join("\n");
    const issuesList = mergedBranches
      .map((b) => `- #${b.number}: ${b.title}`)
      .join("\n");

    const mergePrompt = readPrompt("merge-prompt.md", {
      BRANCHES: branchesList,
      ISSUES: issuesList,
    });
    await runClaude({
      model: MODELS.merger,
      prompt: mergePrompt,
      logFile: logFile(i, "4-merge"),
    });
    await $`git pull`;
    await $`git remote prune origin`;
  } else {
    console.log("\nNo branches approved — skipping merge.");
  }

  state.iteration = i + 1;
  saveState(state);
  console.log(`\nIteration ${i} complete. State saved.`);
}

sendNotification(
  "RALPH",
  `Loop done — ${state.completedIssues.length} issue${state.completedIssues.length === 1 ? "" : "s"} completed`,
  process.cwd(),
  process.env.__CFBundleIdentifier ?? "",
);
console.log("\nRALPH loop finished.");

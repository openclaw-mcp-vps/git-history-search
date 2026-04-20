import { Octokit } from "@octokit/rest";
import type { AuthUser } from "@/lib/session";

export interface GitHubRepoSummary {
  id: number;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  updatedAt: string;
}

export interface HistoryDocument {
  id: string;
  repository: string;
  type: "commit" | "pr" | "issue";
  title: string;
  text: string;
  url: string;
  createdAt: string;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

export function getOctokit(accessToken: string): Octokit {
  return new Octokit({ auth: accessToken });
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const clientId = requiredEnv("GITHUB_CLIENT_ID");
  const clientSecret = requiredEnv("GITHUB_CLIENT_SECRET");

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code
    })
  });

  if (!response.ok) {
    throw new Error(`GitHub OAuth exchange failed: ${response.status}`);
  }

  const payload = (await response.json()) as { access_token?: string; error?: string };

  if (!payload.access_token) {
    throw new Error(payload.error || "GitHub did not return access_token");
  }

  return payload.access_token;
}

async function fetchPrimaryEmail(octokit: Octokit): Promise<string | undefined> {
  try {
    const emailResp = await octokit.request("GET /user/emails", {
      per_page: 100
    });

    const primary = emailResp.data.find((entry) => entry.primary && entry.verified);
    return primary?.email;
  } catch {
    return undefined;
  }
}

export async function getAuthenticatedUser(accessToken: string): Promise<AuthUser> {
  const octokit = getOctokit(accessToken);
  const { data } = await octokit.users.getAuthenticated();
  const fallbackName = data.name?.trim() || data.login;
  const email = data.email || (await fetchPrimaryEmail(octokit));

  return {
    id: data.id,
    login: data.login,
    name: fallbackName,
    email: email || undefined,
    avatarUrl: data.avatar_url
  };
}

export async function listAccessibleRepos(accessToken: string): Promise<GitHubRepoSummary[]> {
  const octokit = getOctokit(accessToken);
  const repos: GitHubRepoSummary[] = [];

  let page = 1;
  while (page <= 4) {
    const response = await octokit.repos.listForAuthenticatedUser({
      per_page: 100,
      page,
      sort: "updated",
      affiliation: "owner,collaborator,organization_member"
    });

    repos.push(
      ...response.data.map((repo) => ({
        id: repo.id,
        fullName: repo.full_name,
        private: repo.private,
        defaultBranch: repo.default_branch,
        updatedAt: repo.updated_at || repo.created_at || new Date(0).toISOString()
      }))
    );

    if (response.data.length < 100) {
      break;
    }

    page += 1;
  }

  return repos;
}

function assertRepoName(fullName: string): { owner: string; repo: string } {
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) {
    throw new Error("Repository must be in owner/name format");
  }

  return { owner, repo };
}

function sanitize(text: string | null | undefined): string {
  if (!text) {
    return "";
  }

  return text.replace(/\s+/g, " ").trim();
}

export async function fetchRepositoryDocuments(
  accessToken: string,
  fullName: string
): Promise<HistoryDocument[]> {
  const { owner, repo } = assertRepoName(fullName);
  const octokit = getOctokit(accessToken);

  const [commitsResp, pullsResp, issuesResp] = await Promise.all([
    octokit.repos.listCommits({ owner, repo, per_page: 24 }),
    octokit.pulls.list({ owner, repo, state: "closed", sort: "updated", direction: "desc", per_page: 24 }),
    octokit.issues.listForRepo({ owner, repo, state: "all", per_page: 32, sort: "updated", direction: "desc" })
  ]);

  const docs: HistoryDocument[] = [];

  for (const commit of commitsResp.data.slice(0, 20)) {
    const detail = await octokit.repos.getCommit({
      owner,
      repo,
      ref: commit.sha
    });

    const patchText = (detail.data.files ?? [])
      .slice(0, 6)
      .map((file) => {
        const patch = sanitize(file.patch).slice(0, 450);
        return `File: ${file.filename}\n${patch}`;
      })
      .join("\n\n");

    const message = sanitize(commit.commit.message);
    docs.push({
      id: `commit:${commit.sha}`,
      repository: fullName,
      type: "commit",
      title: message.split("\n")[0] || commit.sha,
      url: commit.html_url,
      createdAt: commit.commit.author?.date || new Date().toISOString(),
      text: [
        `Commit SHA: ${commit.sha}`,
        `Author: ${commit.commit.author?.name || "Unknown"}`,
        `Message: ${message}`,
        `Diff summary:\n${patchText}`
      ]
        .join("\n\n")
        .trim()
    });
  }

  for (const pr of pullsResp.data) {
    const mergedAt = pr.merged_at || pr.closed_at || pr.updated_at || pr.created_at;
    docs.push({
      id: `pr:${pr.number}`,
      repository: fullName,
      type: "pr",
      title: `#${pr.number} ${sanitize(pr.title)}`,
      url: pr.html_url,
      createdAt: mergedAt,
      text: [
        `PR #${pr.number}`,
        `Title: ${sanitize(pr.title)}`,
        `State: ${pr.state}`,
        `Merged at: ${pr.merged_at || "not merged"}`,
        `Body: ${sanitize(pr.body)}`
      ]
        .join("\n")
        .trim()
    });
  }

  for (const issue of issuesResp.data) {
    if (issue.pull_request) {
      continue;
    }

    docs.push({
      id: `issue:${issue.number}`,
      repository: fullName,
      type: "issue",
      title: `#${issue.number} ${sanitize(issue.title)}`,
      url: issue.html_url,
      createdAt: issue.updated_at || issue.created_at,
      text: [
        `Issue #${issue.number}`,
        `Title: ${sanitize(issue.title)}`,
        `State: ${issue.state}`,
        `Labels: ${(issue.labels || [])
          .map((label) => (typeof label === "string" ? label : label.name || ""))
          .join(", ")}`,
        `Body: ${sanitize(issue.body)}`
      ]
        .join("\n")
        .trim()
    });
  }

  return docs;
}

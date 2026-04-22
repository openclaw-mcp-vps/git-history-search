import { Octokit } from "@octokit/rest";

export const GITHUB_STATE_COOKIE = "ghs_github_state";
export const GITHUB_TOKEN_COOKIE = "ghs_github_token";
export const GITHUB_LOGIN_COOKIE = "ghs_github_login";

const MAX_COMMITS_TO_INDEX = 24;
const MAX_PULLS_TO_INDEX = 32;
const MAX_ISSUES_TO_INDEX = 32;

export type RepoArtifactType = "commit" | "pull_request" | "issue";

export interface IndexableRepoArtifact {
  id: string;
  sourceType: RepoArtifactType;
  sourceId: string;
  title: string;
  body: string;
  url: string;
  authoredAt: string;
}

export interface RepoSummary {
  id: number;
  fullName: string;
  description: string | null;
  private: boolean;
  defaultBranch: string;
  updatedAt: string;
}

export interface RepoHistorySnapshot {
  repoFullName: string;
  defaultBranch: string;
  commits: number;
  pullRequests: number;
  issues: number;
  artifacts: IndexableRepoArtifact[];
}

function parseRepoFullName(repoFullName: string): { owner: string; repo: string } {
  const [owner, repo] = repoFullName.split("/");
  if (!owner || !repo) {
    throw new Error("Repository must be in owner/repo format.");
  }
  return { owner, repo };
}

function truncate(value: string | null | undefined, maxLength: number): string {
  if (!value) {
    return "";
  }
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 3)}...`;
}

function getOctokit(token: string): Octokit {
  return new Octokit({ auth: token });
}

export function buildGitHubAuthorizeUrl(origin: string, state: string): string {
  if (!process.env.GITHUB_CLIENT_ID) {
    throw new Error("Missing GITHUB_CLIENT_ID environment variable.");
  }

  const callbackUrl = new URL("/api/auth/github", origin).toString();
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID);
  url.searchParams.set("redirect_uri", callbackUrl);
  url.searchParams.set("scope", "repo read:org");
  url.searchParams.set("state", state);
  url.searchParams.set("allow_signup", "true");
  return url.toString();
}

export async function exchangeGitHubCodeForToken(
  code: string,
  origin: string,
): Promise<string> {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET.");
  }

  const redirectUri = new URL("/api/auth/github", origin).toString();

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("GitHub OAuth token exchange failed.");
  }

  const json = (await response.json()) as {
    access_token?: string;
    error_description?: string;
  };

  if (!json.access_token) {
    throw new Error(json.error_description ?? "GitHub did not return an access token.");
  }

  return json.access_token;
}

export async function fetchGitHubViewer(token: string): Promise<{ login: string }> {
  const octokit = getOctokit(token);
  const { data } = await octokit.users.getAuthenticated();
  return { login: data.login };
}

export async function listGitHubRepos(token: string): Promise<RepoSummary[]> {
  const octokit = getOctokit(token);

  const { data } = await octokit.repos.listForAuthenticatedUser({
    per_page: 100,
    sort: "updated",
    affiliation: "owner,collaborator,organization_member",
  });

  return data.slice(0, 60).map((repo) => ({
    id: repo.id,
    fullName: repo.full_name,
    description: repo.description,
    private: repo.private,
    defaultBranch: repo.default_branch,
    updatedAt: repo.updated_at ?? repo.pushed_at ?? new Date().toISOString(),
  }));
}

export async function fetchRepoHistorySnapshot(
  token: string,
  repoFullName: string,
): Promise<RepoHistorySnapshot> {
  const { owner, repo } = parseRepoFullName(repoFullName);
  const octokit = getOctokit(token);

  const repoResponse = await octokit.repos.get({ owner, repo });
  const defaultBranch = repoResponse.data.default_branch;

  const commitList = await octokit.repos.listCommits({
    owner,
    repo,
    sha: defaultBranch,
    per_page: MAX_COMMITS_TO_INDEX,
  });

  const commitArtifacts: IndexableRepoArtifact[] = [];
  for (const item of commitList.data) {
    const details = await octokit.repos.getCommit({
      owner,
      repo,
      ref: item.sha,
    });

    const patchPreview = (details.data.files ?? [])
      .slice(0, 5)
      .map((file) => {
        const patch = truncate(file.patch, 600);
        return `${file.filename}\n${patch}`;
      })
      .join("\n\n");

    const message = details.data.commit.message;
    const author = details.data.commit.author?.name ?? "unknown";

    commitArtifacts.push({
      id: `commit:${details.data.sha}`,
      sourceType: "commit",
      sourceId: details.data.sha,
      title: message.split("\n")[0] ?? details.data.sha,
      body: [
        `Commit: ${details.data.sha}`,
        `Author: ${author}`,
        `Message: ${message}`,
        patchPreview ? `Patch:\n${patchPreview}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      url: details.data.html_url,
      authoredAt: details.data.commit.author?.date ?? new Date().toISOString(),
    });
  }

  const pullsResponse = await octokit.pulls.list({
    owner,
    repo,
    state: "all",
    sort: "updated",
    direction: "desc",
    per_page: MAX_PULLS_TO_INDEX,
  });

  const pullArtifacts = pullsResponse.data.map((pull) => ({
    id: `pull:${pull.number}`,
    sourceType: "pull_request" as const,
    sourceId: String(pull.number),
    title: pull.title,
    body: [
      `PR #${pull.number}`,
      `State: ${pull.state}`,
      pull.merged_at ? `Merged at: ${pull.merged_at}` : "",
      pull.body ? truncate(pull.body, 6000) : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    url: pull.html_url,
    authoredAt: pull.updated_at,
  }));

  const issuesResponse = await octokit.issues.listForRepo({
    owner,
    repo,
    state: "all",
    sort: "updated",
    direction: "desc",
    per_page: MAX_ISSUES_TO_INDEX,
  });

  const issueArtifacts = issuesResponse.data
    .filter((issue) => !issue.pull_request)
    .map((issue) => ({
      id: `issue:${issue.number}`,
      sourceType: "issue" as const,
      sourceId: String(issue.number),
      title: issue.title,
      body: [
        `Issue #${issue.number}`,
        `State: ${issue.state}`,
        issue.labels.length > 0
          ? `Labels: ${issue.labels
              .map((label) => (typeof label === "string" ? label : label.name ?? ""))
              .filter(Boolean)
              .join(", ")}`
          : "",
        issue.body ? truncate(issue.body, 6000) : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      url: issue.html_url,
      authoredAt: issue.updated_at,
    }));

  return {
    repoFullName,
    defaultBranch,
    commits: commitArtifacts.length,
    pullRequests: pullArtifacts.length,
    issues: issueArtifacts.length,
    artifacts: [...commitArtifacts, ...pullArtifacts, ...issueArtifacts],
  };
}

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const README_PATH = path.resolve(__dirname, "../../README.md");

const KNOWN_METADATA = {
  OpenMail: {
    description:
      "Lightweight, local-first Windows desktop mail client with Gmail and Microsoft OAuth integration, local offline storage, and an MCP sidecar.",
    stack: ["Rust", "Tauri", "React", "TypeScript", "MCP"],
  },
  "opencode-ip-rotator": {
    description:
      "Automated Cloudflare WARP IP rotator and proxy service. Prevents HTTP 429 rate limits, tracks usage metrics with SQLite, and provides a management dashboard.",
    stack: ["Python", "FastAPI", "Docker", "SQLite"],
  },
  OpenWidget: {
    description:
      "Modern Windows desktop widget for real-time hardware monitoring, system telemetry, weather, media controls, and productivity tools.",
    stack: ["Rust", "Tauri", "React", "TypeScript"],
  },
  openchat: {
    description:
      "Privacy-focused desktop AI client supporting both cloud providers and local inference via llama.cpp in an isolated workspace.",
    stack: ["Rust", "Tauri", "React", "TypeScript", "Local AI"],
  },
  "awesome-turkish-dev": {
    description:
      "Curated collection of resources, datasets, tools, communities, and career guides for Turkish developers.",
    stack: ["Community", "Turkish Tech", "Open Source"],
  },
};

async function fetchUserRepos(username) {
  const headers = {
    "User-Agent": "alztrk-profile-updater",
    Accept: "application/vnd.github+json",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(
    `https://api.github.com/users/${username}/repos?per_page=100&type=owner`,
    { headers }
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function formatStack(repo) {
  const known = KNOWN_METADATA[repo.name];
  if (known?.stack) {
    return known.stack.join(" · ");
  }

  const stackItems = [];
  if (repo.language) {
    stackItems.push(repo.language);
  }
  if (Array.isArray(repo.topics)) {
    for (const topic of repo.topics) {
      if (stackItems.length >= 4) break;
      if (!stackItems.includes(topic)) {
        stackItems.push(topic);
      }
    }
  }

  return stackItems.length > 0 ? stackItems.join(" · ") : "Open Source";
}

function formatDescription(repo) {
  const known = KNOWN_METADATA[repo.name];
  if (known?.description) {
    return known.description;
  }

  if (repo.description && repo.description.trim().length > 0) {
    return repo.description.trim().replace(/\s+/g, " ");
  }

  return "Open-source software project.";
}

function generateMarkdown(repos) {
  return repos
    .map((repo) => {
      const desc = formatDescription(repo);
      const stack = formatStack(repo);
      return `- **[${repo.name}](${repo.html_url})**: ${desc}\n  *Stack: ${stack}*`;
    })
    .join("\n\n");
}

async function main() {
  const username = "alztrk";
  console.log(`Fetching repositories for ${username}...`);

  const repos = await fetchUserRepos(username);

  const topRepos = repos
    .filter((repo) => !repo.fork && !repo.archived && repo.name.toLowerCase() !== username.toLowerCase())
    .sort((a, b) => {
      if (b.stargazers_count !== a.stargazers_count) {
        return b.stargazers_count - a.stargazers_count;
      }
      return new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime();
    })
    .slice(0, 5);

  console.log(`Top 5 repositories selected: ${topRepos.map((r) => r.name).join(", ")}`);

  const generatedBlock = generateMarkdown(topRepos);

  const currentReadme = fs.readFileSync(README_PATH, "utf8");
  const startMarker = "<!-- PROJECTS:START -->";
  const endMarker = "<!-- PROJECTS:END -->";

  const startIndex = currentReadme.indexOf(startMarker);
  const endIndex = currentReadme.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1) {
    throw new Error("Markers <!-- PROJECTS:START --> or <!-- PROJECTS:END --> not found in README.md");
  }

  const updatedReadme = `${currentReadme.slice(0, startIndex + startMarker.length)}\n${generatedBlock}\n${currentReadme.slice(endIndex)}`;

  fs.writeFileSync(README_PATH, updatedReadme, "utf8");
  console.log("README.md updated successfully.");
}

main().catch((error) => {
  console.error("Error updating README:", error);
  process.exit(1);
});

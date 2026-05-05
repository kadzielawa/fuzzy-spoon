import { Octokit } from '@octokit/rest';
import { RequestInput } from './configGenerator';

function isMockMode(): boolean {
  return (
    !process.env.GITHUB_TOKEN ||
    !process.env.GITHUB_OWNER ||
    !process.env.GITHUB_REPO
  );
}

export async function createServicePR(
  input: RequestInput,
  configYaml: string,
): Promise<string> {
  if (isMockMode()) {
    const mockId = Math.floor(Math.random() * 900) + 100;
    console.warn(
      '[MOCK] GitHub credentials not configured – returning mock PR URL. ' +
        'Set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO in backend/.env for real PRs.',
    );
    return `https://github.com/example-org/idp-config/pull/${mockId}?mock=true&service=${input.service_name}`;
  }

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const owner = process.env.GITHUB_OWNER as string;
  const repo = process.env.GITHUB_REPO as string;

  const branchName = `idp/service-${input.service_name}-${Date.now()}`;
  const filePath = `services/${input.environment}/${input.service_name}.yaml`;
  const prTitle = `feat: create service ${input.service_name} using ${input.pattern} pattern`;

  // Resolve the SHA of the default branch
  const { data: refData } = await octokit.git.getRef({
    owner,
    repo,
    ref: 'heads/main',
  });

  // Create a new branch from main
  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: refData.object.sha,
  });

  // Commit the generated config file onto the new branch
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: filePath,
    message: prTitle,
    content: Buffer.from(configYaml).toString('base64'),
    branch: branchName,
  });

  // Open a Pull Request
  const { data: pr } = await octokit.pulls.create({
    owner,
    repo,
    title: prTitle,
    head: branchName,
    base: 'main',
    body: [
      '## IDP Service Request',
      '',
      '| Field | Value |',
      '|---|---|',
      `| Service | \`${input.service_name}\` |`,
      `| Pattern | \`${input.pattern}\` |`,
      `| Environment | \`${input.environment}\` |`,
      `| Region | \`${input.region}\` |`,
      `| Enable DB | ${input.options?.db ?? false} |`,
      `| Enable Pub/Sub | ${input.options?.pubsub ?? false} |`,
      '',
      '### Generated Configuration',
      '',
      '```yaml',
      configYaml.trim(),
      '```',
    ].join('\n'),
  });

  return pr.html_url;
}

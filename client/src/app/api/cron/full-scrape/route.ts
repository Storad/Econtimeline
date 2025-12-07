import { NextResponse } from "next/server";

/**
 * Full scrape cron job
 *
 * This triggers a full calendar refresh via GitHub Actions.
 * Since Vercel can't run Node scripts directly, we trigger the GitHub workflow.
 */

export async function GET(request: Request) {
  // Verify cron secret for security
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.NODE_ENV === "production" && process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const githubToken = process.env.GITHUB_TOKEN;
  const repoOwner = process.env.GITHUB_REPO_OWNER;
  const repoName = process.env.GITHUB_REPO_NAME;

  if (!githubToken || !repoOwner || !repoName) {
    return NextResponse.json({
      success: false,
      message: "GitHub configuration not set. Full scrapes run via GitHub Actions schedule.",
    });
  }

  try {
    // Trigger GitHub Actions workflow
    const response = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/update-calendar.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref: "master",
          inputs: {
            mode: "full",
          },
        }),
      }
    );

    if (response.ok || response.status === 204) {
      return NextResponse.json({
        success: true,
        message: "Full scrape triggered via GitHub Actions",
        triggeredAt: new Date().toISOString(),
      });
    } else {
      const error = await response.text();
      return NextResponse.json({
        success: false,
        message: "Failed to trigger GitHub Actions",
        error,
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: "Error triggering workflow",
      error: String(error),
    }, { status: 500 });
  }
}

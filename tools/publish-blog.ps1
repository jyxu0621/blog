param(
  [switch]$DryRun,
  [string]$Message = ""
)

$ErrorActionPreference = "Stop"
$Repository = "jyxu0621/blog"
$Branch = "main"
$BlogUrl = "https://jyxu0621.github.io/blog/"
$RepoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$PortableTools = "F:\blog\.local-tools"
$Git = Join-Path $PortableTools "mingit\cmd\git.exe"
$Gh = Join-Path $PortableTools "gh\bin\gh.exe"
$ExactPublisher = Join-Path $PortableTools "publish-exact-commits.ps1"

function Assert-LastExitCode([string]$Operation) {
  if ($LASTEXITCODE -ne 0) {
    throw "$Operation failed with exit code $LASTEXITCODE"
  }
}

function Invoke-Npm([string[]]$Arguments) {
  & npm.cmd @Arguments
  Assert-LastExitCode "npm $($Arguments -join ' ')"
}

if (-not (Test-Path -LiteralPath $Git)) { throw "Portable Git is missing: $Git" }
if (-not (Test-Path -LiteralPath $Gh)) { throw "GitHub CLI is missing: $Gh" }

Push-Location $RepoRoot
try {
  $branch = (& $Git branch --show-current).Trim()
  Assert-LastExitCode "Reading the current branch"
  if ($branch -ne $Branch) { throw "Publishing is allowed only from $Branch; current branch is $branch" }

  & $Gh auth status --hostname github.com
  Assert-LastExitCode "GitHub CLI authentication check"

  Invoke-Npm @("run", "test:local-cover")
  Invoke-Npm @("run", "verify:site")
  Invoke-Npm @("run", "verify:advanced")
  Invoke-Npm @("run", "clean")
  Invoke-Npm @("run", "build")
  Invoke-Npm @("run", "verify:site", "--", "--generated")
  & $Git diff --check
  Assert-LastExitCode "Git whitespace validation"

  if ($DryRun) {
    Write-Output "DRY RUN: validation completed; no files were staged, committed, or pushed."
    exit 0
  }

  $remoteSha = (& $Gh api "repos/$Repository/git/ref/heads/$Branch" --jq ".object.sha").Trim()
  Assert-LastExitCode "Reading remote $Branch"
  if (-not $remoteSha) { throw "Unable to resolve remote $Branch" }

  & $Git cat-file -e "$remoteSha`^{commit}"
  if ($LASTEXITCODE -ne 0) {
    throw "Remote commit $remoteSha is not available locally; synchronize the repository before publishing"
  }
  & $Git merge-base --is-ancestor $remoteSha HEAD
  if ($LASTEXITCODE -ne 0) {
    throw "Remote $Branch is not an ancestor of local HEAD; refusing to overwrite remote history"
  }

  & $Git add -A
  Assert-LastExitCode "Staging blog changes"
  & $Git diff --cached --quiet
  $hasStagedChanges = $LASTEXITCODE -ne 0
  if ($hasStagedChanges) {
    if ([string]::IsNullOrWhiteSpace($Message)) {
      $Message = "publish: update blog $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    }
    & $Git commit -m $Message
    Assert-LastExitCode "Creating the blog commit"
  }

  $headSha = (& $Git rev-parse HEAD).Trim()
  Assert-LastExitCode "Reading local HEAD"
  if ($headSha -eq $remoteSha) {
    Write-Output "No unpublished changes; the blog is already current."
    exit 0
  }

  & $Git push origin $Branch
  if ($LASTEXITCODE -ne 0) {
    if (-not (Test-Path -LiteralPath $ExactPublisher)) {
      throw "git push failed and the exact-commit fallback is missing: $ExactPublisher"
    }
    Write-Warning "git push failed; publishing the exact commits through the GitHub API fallback."
    & $ExactPublisher -Repository $Repository -Branch $Branch
    Assert-LastExitCode "GitHub API fallback publish"
  }

  $runId = $null
  $deadline = (Get-Date).AddMinutes(2)
  do {
    $runJson = & $Gh run list --repo $Repository --commit $headSha --limit 1 --json databaseId,headSha,status
    Assert-LastExitCode "Finding the GitHub Actions run"
    if ($runJson) {
      $run = $runJson | ConvertFrom-Json | Select-Object -First 1
      if ($run -and $run.headSha -eq $headSha) { $runId = $run.databaseId }
    }
    if (-not $runId) { Start-Sleep -Seconds 2 }
  } while (-not $runId -and (Get-Date) -lt $deadline)
  if (-not $runId) { throw "No GitHub Actions run appeared for commit $headSha" }

  & $Gh run watch $runId --repo $Repository --exit-status
  Assert-LastExitCode "GitHub Pages deployment"

  $response = Invoke-WebRequest -Uri "$BlogUrl`?verify=$($headSha.Substring(0, 8))" -UseBasicParsing -Headers @{ "Cache-Control" = "no-cache" }
  if ($response.StatusCode -ne 200) { throw "Published blog returned HTTP $($response.StatusCode)" }
  Write-Output "Published $headSha successfully: $BlogUrl"
}
finally {
  Pop-Location
}

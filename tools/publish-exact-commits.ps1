param(
  [Parameter(Mandatory = $true)][string]$Repository,
  [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"
$OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$gh = "F:\blog\.local-tools\gh\bin\gh.exe"
$git = "F:\blog\.local-tools\mingit\cmd\git.exe"
$gitTree = Join-Path $PSScriptRoot "git-tree.ps1"

if (-not (Test-Path -LiteralPath $gitTree)) { throw "Git tree parser is missing: $gitTree" }

$remoteSha = (& $gh api "repos/$Repository/git/ref/heads/$Branch" --jq ".object.sha").Trim()
if (-not $remoteSha) { throw "Unable to resolve remote branch" }

$commits = @(& $git rev-list --reverse "$remoteSha..HEAD")
if ($LASTEXITCODE -ne 0) { throw "Unable to enumerate local commits" }
if ($commits.Count -eq 0) { Write-Output "Remote is already current"; exit 0 }

$uploadedBlobs = @{}
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-git-blobs-" + [Guid]::NewGuid())
New-Item -ItemType Directory -Path $tempRoot | Out-Null

try {
  foreach ($commit in $commits) {
    $sourceEntries = @(& $gitTree -Git $git -Commit $commit)
    $entries = @()

    foreach ($entry in $sourceEntries) {
      if ($entry.type -ne "blob") {
        throw "Unexpected tree entry type for $($entry.path): $($entry.type)"
      }
      $mode = $entry.mode
      $blobSha = $entry.sha
      $path = $entry.path

      if (-not $uploadedBlobs.ContainsKey($blobSha)) {
        $tempFile = Join-Path $tempRoot $blobSha
        $proc = Start-Process -FilePath $git -ArgumentList @('cat-file', 'blob', $blobSha) -NoNewWindow -Wait -PassThru -RedirectStandardOutput $tempFile
        if ($proc.ExitCode -ne 0) { throw "Unable to read blob $blobSha" }
        $bytes = [System.IO.File]::ReadAllBytes($tempFile)
        $payload = @{ content = [Convert]::ToBase64String($bytes); encoding = 'base64' } | ConvertTo-Json -Compress
        $createdSha = ($payload | & $gh api --method POST "repos/$Repository/git/blobs" --input - --jq '.sha').Trim()
        if ($createdSha -ne $blobSha) { throw "Blob SHA mismatch for ${path}: $createdSha != $blobSha" }
        $uploadedBlobs[$blobSha] = $true
      }

      $entries += @{ path = $path; mode = $mode; type = 'blob'; sha = $blobSha }
    }

    $treePayload = @{ tree = $entries } | ConvertTo-Json -Depth 5 -Compress
    $treeSha = ($treePayload | & $gh api --method POST "repos/$Repository/git/trees" --input - --jq '.sha').Trim()
    $localTreeSha = (& $git show -s --format=%T $commit).Trim()
    if ($treeSha -ne $localTreeSha) { throw "Tree SHA mismatch for ${commit}: $treeSha != $localTreeSha" }

    $parents = @(& $git show -s --format=%P $commit).Trim().Split(' ', [System.StringSplitOptions]::RemoveEmptyEntries)
    $message = (& $git show -s --format=%B $commit) -join "`n"
    $author = @{ name = (& $git show -s --format=%an $commit); email = (& $git show -s --format=%ae $commit); date = (& $git show -s --format=%aI $commit) }
    $committer = @{ name = (& $git show -s --format=%cn $commit); email = (& $git show -s --format=%ce $commit); date = (& $git show -s --format=%cI $commit) }
    $commitPayload = @{ message = $message; tree = $treeSha; parents = $parents; author = $author; committer = $committer } | ConvertTo-Json -Depth 5 -Compress
    $createdCommit = ($commitPayload | & $gh api --method POST "repos/$Repository/git/commits" --input - --jq '.sha').Trim()
    if ($createdCommit -ne $commit) { throw "Commit SHA mismatch: $createdCommit != $commit" }
    Write-Output "Verified commit $commit"
  }

  $head = (& $git rev-parse HEAD).Trim()
  $refPayload = @{ sha = $head; force = $false } | ConvertTo-Json -Compress
  $published = ($refPayload | & $gh api --method PATCH "repos/$Repository/git/refs/heads/$Branch" --input - --jq '.object.sha').Trim()
  if ($published -ne $head) { throw "Published ref mismatch: $published != $head" }
  Write-Output "Published $published"
}
finally {
  if (Test-Path -LiteralPath $tempRoot) { Remove-Item -LiteralPath $tempRoot -Recurse -Force }
}

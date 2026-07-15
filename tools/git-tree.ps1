[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$Git,
  [Parameter(Mandatory = $true)][string]$Commit,
  [switch]$Json
)

$ErrorActionPreference = "Stop"

function Read-GitTreeEntries {
  param(
    [Parameter(Mandatory = $true)][string]$GitExecutable,
    [Parameter(Mandatory = $true)][string]$CommitSha
  )

  $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("git-tree-" + [Guid]::NewGuid())
  $stdoutPath = Join-Path $tempRoot "tree.bin"
  $stderrPath = Join-Path $tempRoot "tree.err"
  New-Item -ItemType Directory -Path $tempRoot | Out-Null

  try {
    $process = Start-Process -FilePath $GitExecutable `
      -ArgumentList @("-c", "core.quotePath=false", "ls-tree", "-r", "-z", $CommitSha) `
      -NoNewWindow -Wait -PassThru `
      -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath
    if ($process.ExitCode -ne 0) {
      $stderr = [System.IO.File]::ReadAllText($stderrPath)
      throw "Unable to read tree for ${CommitSha}: $stderr"
    }

    $bytes = [System.IO.File]::ReadAllBytes($stdoutPath)
    if ($bytes.Length -eq 0) { return @() }

    $utf8 = New-Object System.Text.UTF8Encoding($false, $true)
    $text = $utf8.GetString($bytes)
    if (-not $text.EndsWith([char]0)) {
      throw "Git tree output for $CommitSha is not NUL-terminated"
    }

    $records = $text.Split([char]0)
    $entries = @()
    foreach ($record in $records[0..($records.Length - 2)]) {
      $tabIndex = $record.IndexOf([char]9)
      if ($tabIndex -lt 0) {
        throw "Unexpected tree entry for ${CommitSha}: $record"
      }
      $metadata = $record.Substring(0, $tabIndex)
      $path = $record.Substring($tabIndex + 1)
      if ($metadata -notmatch '^(\d+)\s+(\S+)\s+([0-9a-f]+)$') {
        throw "Unexpected tree metadata for ${CommitSha}: $metadata"
      }
      $entries += [pscustomobject][ordered]@{
        mode = $Matches[1]
        type = $Matches[2]
        sha = $Matches[3]
        path = $path
      }
    }
    return $entries
  }
  finally {
    if (Test-Path -LiteralPath $tempRoot) {
      Remove-Item -LiteralPath $tempRoot -Recurse -Force
    }
  }
}

$entries = @(Read-GitTreeEntries -GitExecutable $Git -CommitSha $Commit)
if ($Json) {
  [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
  ConvertTo-Json -InputObject $entries -Depth 3 -Compress
}
else {
  $entries
}

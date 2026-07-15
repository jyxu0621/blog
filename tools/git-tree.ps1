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

  if ($CommitSha -notmatch '\A(?:[0-9a-fA-F]{40}|[0-9a-fA-F]{64})\z') {
    throw "Commit SHA must be exactly 40 or 64 hexadecimal characters"
  }

  $startInfo = New-Object System.Diagnostics.ProcessStartInfo
  $startInfo.FileName = $GitExecutable
  $startInfo.Arguments = "-c core.quotePath=false ls-tree -r -z $CommitSha"
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true

  $process = New-Object System.Diagnostics.Process
  $process.StartInfo = $startInfo
  $stdout = New-Object System.IO.MemoryStream
  $started = $false

  try {
    $started = $process.Start()
    if (-not $started) { throw "Unable to start Git tree process for $CommitSha" }

    $stderrTask = $process.StandardError.ReadToEndAsync()
    $process.StandardOutput.BaseStream.CopyTo($stdout)
    $process.WaitForExit()
    $stderr = $stderrTask.GetAwaiter().GetResult()
    $exitCode = $process.ExitCode
    if ($exitCode -ne 0) {
      throw "Unable to read tree for $CommitSha (exit code ${exitCode}): $stderr"
    }

    $bytes = $stdout.ToArray()
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
    if ($started) {
      try {
        if (-not $process.HasExited) {
          $process.Kill()
          $process.WaitForExit()
        }
      }
      finally {
        $process.StandardOutput.Dispose()
        $process.StandardError.Dispose()
      }
    }
    $stdout.Dispose()
    $process.Dispose()
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

param(
  [Parameter(Mandatory = $true)][string]$Token,
  [string]$Owner = 'libbyseder',
  [string]$Repo = 'bodycomp',
  [string]$Branch = 'main',
  [string]$RepoPath = 'C:\Users\sederl\recomptrack'
)

$ErrorActionPreference = 'Stop'
$headers = @{
  Authorization = "Bearer $Token"
  'User-Agent' = 'bodytrend-push'
  Accept = 'application/vnd.github+json'
}

function Invoke-GitHubApi {
  param(
    [string]$Method,
    [string]$Uri,
    [object]$Body = $null
  )
  $params = @{
    Method = $Method
    Uri = $Uri
    Headers = $headers
  }
  if ($null -ne $Body) {
    $json = $Body | ConvertTo-Json -Depth 30 -Compress
    $params.Body = [System.Text.Encoding]::UTF8.GetBytes($json)
    $params.ContentType = 'application/json; charset=utf-8'
  }
  return Invoke-RestMethod @params
}

$ref = Invoke-GitHubApi -Method Get -Uri "https://api.github.com/repos/$Owner/$Repo/git/ref/heads/$Branch"
$baseSha = $ref.object.sha
Write-Host "Base: $baseSha"

$entries = git -C $RepoPath ls-tree -r HEAD
if (-not $entries) { throw 'No files in HEAD commit' }

$treeEntries = @()
$i = 0
foreach ($line in $entries) {
  if (-not $line) { continue }
  $parts = $line -split '\s+', 4
  $mode = $parts[0]
  $type = $parts[1]
  $sha = $parts[2]
  $path = $parts[3]
  if ($type -eq 'blob') {
    $fullPath = Join-Path $RepoPath $path
    $bytes = [System.IO.File]::ReadAllBytes($fullPath)
    $blob = Invoke-GitHubApi -Method Post -Uri "https://api.github.com/repos/$Owner/$Repo/git/blobs" -Body @{
      content = [Convert]::ToBase64String($bytes)
      encoding = 'base64'
    }
    $treeEntries += @{
      path = $path
      mode = $mode
      type = 'blob'
      sha = $blob.sha
    }
  }
  $i++
  if ($i % 10 -eq 0) { Write-Host "Uploaded $i files..." }
}

Write-Host "Total files: $($treeEntries.Count)"

$newTree = Invoke-GitHubApi -Method Post -Uri "https://api.github.com/repos/$Owner/$Repo/git/trees" -Body @{
  tree = $treeEntries
}
Write-Host "Tree: $($newTree.sha)"

$commitMessage = (git -C $RepoPath log -1 --pretty=%s).Trim()
if (-not $commitMessage) {
  $commitMessage = 'Update from local workspace'
}

$newCommit = Invoke-GitHubApi -Method Post -Uri "https://api.github.com/repos/$Owner/$Repo/git/commits" -Body @{
  message = $commitMessage
  tree = $newTree.sha
  parents = @($baseSha)
}
Write-Host "Commit: $($newCommit.sha)"

Invoke-GitHubApi -Method Patch -Uri "https://api.github.com/repos/$Owner/$Repo/git/refs/heads/$Branch" -Body @{
  sha = $newCommit.sha
  force = $true
} | Out-Null

Write-Host "PUSH_OK $($newCommit.sha)"
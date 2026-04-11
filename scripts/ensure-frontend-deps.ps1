param()

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir

$projects = @(
  @{ Name = "Auth"; Path = Join-Path $rootDir "Frontend\Auth" }
  @{ Name = "Billing"; Path = Join-Path $rootDir "Frontend\Billing" }
  @{ Name = "Invoice"; Path = Join-Path $rootDir "Frontend\Invoice" }
)

function Test-ViteBin {
  param(
    [string]$ProjectPath
  )

  $binDir = Join-Path $ProjectPath "node_modules\.bin"
  $viteCmd = Join-Path $binDir "vite.cmd"
  $vitePs1 = Join-Path $binDir "vite.ps1"
  $viteUnix = Join-Path $binDir "vite"

  return (Test-Path $viteCmd) -or (Test-Path $vitePs1) -or (Test-Path $viteUnix)
}

function Install-FrontendDeps {
  param(
    [string]$ProjectPath,
    [string]$ProjectName
  )

  $lockFile = Join-Path $ProjectPath "package-lock.json"
  $shrinkwrapFile = Join-Path $ProjectPath "npm-shrinkwrap.json"

  Push-Location $ProjectPath
  try {
    if ((Test-Path $lockFile) -or (Test-Path $shrinkwrapFile)) {
      Write-Host "[setup] Installing $ProjectName frontend dependencies from lockfile..."
      npm ci --no-audit --no-fund
    } else {
      Write-Host "[setup] Installing $ProjectName frontend dependencies and creating a lockfile..."
      npm install --no-audit --no-fund
    }
  } finally {
    Pop-Location
  }
}

foreach ($project in $projects) {
  $projectPath = $project.Path

  if (Test-ViteBin -ProjectPath $projectPath) {
    Write-Host "[setup] $($project.Name) dependencies already present."
    continue
  }

  Install-FrontendDeps -ProjectPath $projectPath -ProjectName $project.Name
}

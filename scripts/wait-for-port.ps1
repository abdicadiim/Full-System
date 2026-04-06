param(
  [string]$HostName = "127.0.0.1",
  [int]$Port = 5000,
  [int]$TimeoutSeconds = 120
)

$deadline = (Get-Date).AddSeconds($TimeoutSeconds)

while ((Get-Date) -lt $deadline) {
  $client = $null
  $async = $null

  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $async = $client.BeginConnect($HostName, $Port, $null, $null)

    if ($async.AsyncWaitHandle.WaitOne(500)) {
      $client.EndConnect($async)
      $client.Close()
      exit 0
    }
  } catch {
  } finally {
    if ($client) {
      $client.Close()
    }
    if ($async -and $async.AsyncWaitHandle) {
      $async.AsyncWaitHandle.Close()
    }
  }

  Start-Sleep -Milliseconds 500
}

Write-Error "Timed out waiting for ${HostName}:${Port}"
exit 1

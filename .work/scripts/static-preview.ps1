param([int]$Port = 3000)
$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$RootPrefix = $Root.TrimEnd('\') + '\'
$Listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse('127.0.0.1'), $Port)
$MimeTypes = @{
  '.html' = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.mjs'  = 'text/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.svg'  = 'image/svg+xml'
  '.png'  = 'image/png'
  '.ico'  = 'image/x-icon'
  '.woff' = 'font/woff'
  '.woff2'= 'font/woff2'
}
function Write-HttpResponse($Stream, [int]$Status, [string]$StatusText, [string]$ContentType, [byte[]]$Body, [bool]$HeadOnly = $false) {
  $header = "HTTP/1.1 $Status $StatusText`r`nContent-Type: $ContentType`r`nContent-Length: $($Body.Length)`r`nCache-Control: no-store`r`nConnection: close`r`nX-Content-Type-Options: nosniff`r`n`r`n"
  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  if (-not $HeadOnly -and $Body.Length -gt 0) { $Stream.Write($Body, 0, $Body.Length) }
  $Stream.Flush()
}
$Listener.Start()
Write-Output ('Listening at http://127.0.0.1:' + $Port + '/ root: ' + $Root)
try {
  while ($true) {
    $Client = $Listener.AcceptTcpClient()
    try {
      $Stream = $Client.GetStream()
      $Reader = [System.IO.StreamReader]::new($Stream, [System.Text.Encoding]::ASCII, $false, 4096, $true)
      $RequestLine = $Reader.ReadLine()
      if (-not $RequestLine) { continue }
      $Parts = $RequestLine.Split(' ')
      $Method = $Parts[0]
      $Target = $Parts[1]
      while (($HeaderLine = $Reader.ReadLine()) -ne $null -and $HeaderLine -ne '') { }
      if ($Method -notin @('GET', 'HEAD')) {
        Write-HttpResponse $Stream 405 'Method Not Allowed' 'text/plain; charset=utf-8' ([System.Text.Encoding]::UTF8.GetBytes('Method Not Allowed')) ($Method -eq 'HEAD')
        continue
      }
      $PathPart = ($Target -split '\?', 2)[0]
      $Relative = [System.Uri]::UnescapeDataString($PathPart.TrimStart('/'))
      if (-not $Relative) { $Relative = 'index.html' }
      $FilePath = [System.IO.Path]::GetFullPath((Join-Path $Root ($Relative -replace '/', '\')))
      if (-not $FilePath.StartsWith($RootPrefix, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $FilePath -PathType Leaf)) {
        $Body = [System.Text.Encoding]::UTF8.GetBytes('Not Found')
        Write-HttpResponse $Stream 404 'Not Found' 'text/plain; charset=utf-8' $Body ($Method -eq 'HEAD')
        Write-Output "$Method $Target 404"
        continue
      }
      $Extension = [System.IO.Path]::GetExtension($FilePath).ToLowerInvariant()
      $ContentType = if ($MimeTypes.ContainsKey($Extension)) { $MimeTypes[$Extension] } else { 'application/octet-stream' }
      $Body = [System.IO.File]::ReadAllBytes($FilePath)
      Write-HttpResponse $Stream 200 'OK' $ContentType $Body ($Method -eq 'HEAD')
      Write-Output "$Method $Target 200"
    } catch {
      Write-Warning $_.Exception.Message
    } finally {
      if ($Reader) { $Reader.Dispose() }
      if ($Client) { $Client.Dispose() }
      $Reader = $null
    }
  }
} finally {
  $Listener.Stop()
}

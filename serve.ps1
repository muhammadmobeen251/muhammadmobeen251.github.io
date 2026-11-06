# Tiny static file server used only to preview the portfolio
$root = Join-Path $PSScriptRoot "..\portfolio" | Resolve-Path
$listener = New-Object System.Net.HttpListener
$port = if ($env:PORT) { $env:PORT } else { 5510 }
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Serving $root on http://localhost:$port/"
$types = @{ ".html" = "text/html"; ".css" = "text/css"; ".js" = "application/javascript"; ".png" = "image/png"; ".jpg" = "image/jpeg"; ".svg" = "image/svg+xml"; ".glb" = "model/gltf-binary"; ".pdf" = "application/pdf" }
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $path = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart("/"))
  if ($path -eq "") { $path = "index.html" }
  $file = Join-Path $root $path
  try {
    if (Test-Path -LiteralPath $file -PathType Leaf) {
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $ext = [System.IO.Path]::GetExtension($file)
      if ($types.ContainsKey($ext)) { $ctx.Response.ContentType = $types[$ext] }
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
    }
  } catch {}
  $ctx.Response.Close()
}

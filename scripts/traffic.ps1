param(
  [string]$BaseUrl = 'http://127.0.0.1:8080'
)

$BaseUrl = $BaseUrl.TrimEnd('/')

function Send-Traffic {
  param(
    [string]$Label,
    [string]$Url,
    [string]$UserAgent = 'RevAI-traffic-test',
    [switch]$PathAsIs
  )

  $curlArgs = @('-sS', '-o', 'NUL', '-w', '%{http_code}', '-A', $UserAgent)
  if ($PathAsIs) { $curlArgs += '--path-as-is' }

  $status = & curl.exe @curlArgs $Url
  if ($LASTEXITCODE -ne 0) { throw "$Label request failed" }
  Write-Host "${Label}: HTTP $status"
}

Send-Traffic 'Normal home' "$BaseUrl/"
Send-Traffic 'Normal products' "$BaseUrl/products"
Send-Traffic 'SQL injection' "$BaseUrl/echo?q=union%20select"
Send-Traffic 'Script tag' "$BaseUrl/echo?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E"
Send-Traffic 'Path traversal' "$BaseUrl/../../etc/passwd" -PathAsIs
Send-Traffic 'Scanner' "$BaseUrl/products" -UserAgent 'sqlmap/1.0'

for ($i = 1; $i -le 35; $i++) {
  Send-Traffic "Burst $i" "$BaseUrl/echo?burst=$i"
}
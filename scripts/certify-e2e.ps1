param(
  [string]$Region = 'af-south-1',
  [string]$StackName = 'SpendGuard'
)

$ErrorActionPreference = 'Stop'

$stackData = aws cloudformation describe-stacks --stack-name $StackName --region $Region | ConvertFrom-Json
$outputs = @{}
foreach ($o in $stackData.Stacks[0].Outputs) { $outputs[$o.OutputKey] = $o.OutputValue }
$apiUrl = $outputs['ApiUrl']
$userPoolId = $outputs['UserPoolId']
$clientId = $outputs['UserPoolClientId']

$runId = Get-Date -Format 'yyyyMMddHHmmss'
$email = "e2e+$runId@spendguard.local"
$password = "SpendGuard!$runId"

Write-Host "[1/8] Creating disposable Cognito user $email"
try {
  aws cognito-idp admin-create-user --region $Region --user-pool-id $userPoolId --username $email --user-attributes Name=email,Value=$email Name=email_verified,Value=true --message-action SUPPRESS | Out-Null
} catch {
  if ($_.Exception.Message -notmatch 'UsernameExistsException') { throw }
}
aws cognito-idp admin-set-user-password --region $Region --user-pool-id $userPoolId --username $email --password $password --permanent | Out-Null

Write-Host "[2/8] Authenticating"
$authResp = aws cognito-idp initiate-auth --region $Region --auth-flow USER_PASSWORD_AUTH --client-id $clientId --auth-parameters "USERNAME=$email,PASSWORD=$password" | ConvertFrom-Json
$idToken = $authResp.AuthenticationResult.IdToken
if (-not $idToken) { throw 'Failed to acquire Cognito token' }

$headers = @{ Authorization = "Bearer $idToken"; 'Content-Type' = 'application/json' }

function Invoke-Api {
  param(
    [string]$Method,
    [string]$Path,
    $Body = $null
  )

  $uri = "$apiUrl$Path"
  if ($Body -ne $null) {
    $json = $Body | ConvertTo-Json -Depth 10
    return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -Body $json
  }

  return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers
}

$category = "E2E-$runId"
$today = (Get-Date).ToString('yyyy-MM-dd')

Write-Host "[3/8] Settings CRUD"
$settingsUpdate = Invoke-Api -Method 'PUT' -Path '/settings' -Body @{ alertsEnabled = $false; weeklySummary = $false; currency = 'USD'; email = $email }
if (-not $settingsUpdate.updatedAt) { throw 'Settings update failed' }
$settingsGet = Invoke-Api -Method 'GET' -Path '/settings'
if ($settingsGet.item.currency -ne 'USD') { throw 'Settings readback mismatch' }

Write-Host "[4/8] Budget + Expense CRUD"
$budgetCreate = Invoke-Api -Method 'POST' -Path '/budgets' -Body @{ category = $category; limit = 500; period = 'monthly' }
$budgetId = $budgetCreate.budgetId
if (-not $budgetId) { throw 'Budget creation failed' }

$expenseCreate = Invoke-Api -Method 'POST' -Path '/expenses' -Body @{ amount = 123.45; category = $category; date = $today; notes = 'E2E test expense' }
$expenseId = $expenseCreate.expenseId
if (-not $expenseId) { throw 'Expense creation failed' }

$budgetSummary = Invoke-Api -Method 'GET' -Path '/budgets/summary'
$budgetItem = $budgetSummary.items | Where-Object { $_.budgetId -eq $budgetId -or $_.category -eq $category } | Select-Object -First 1
if (-not $budgetItem) { throw 'Budget summary missing created budget' }

$expensesList = Invoke-Api -Method 'GET' -Path '/expenses'
$expenseItem = $expensesList.items | Where-Object { $_.expenseId -eq $expenseId } | Select-Object -First 1
if (-not $expenseItem) { throw 'Expense list missing created expense' }

Write-Host "[5/8] Insights endpoint"
$insights = Invoke-Api -Method 'GET' -Path '/insights'
if (-not $insights.insights) { throw 'Insights endpoint did not return insights payload' }

Write-Host "[6/8] Receipt upload + async processing"
$uploadResp = Invoke-Api -Method 'POST' -Path '/receipts/upload-url' -Body @{ filename = "e2e-$runId.png"; contentType = 'image/png' }
if (-not $uploadResp.uploadUrl -or -not $uploadResp.key) { throw 'Upload URL generation failed' }

$tmpFile = Join-Path $env:TEMP "spendguard-e2e-$runId.png"
$pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5w2WsAAAAASUVORK5CYII='
[IO.File]::WriteAllBytes($tmpFile, [Convert]::FromBase64String($pngBase64))
$putResp = Invoke-WebRequest -Method 'PUT' -Uri $uploadResp.uploadUrl -InFile $tmpFile -ContentType 'image/png' -UseBasicParsing
if ($putResp.StatusCode -lt 200 -or $putResp.StatusCode -ge 300) { throw 'Receipt upload PUT failed' }

$receiptExpense = $null
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 10
  $poll = Invoke-Api -Method 'GET' -Path '/expenses'
  $receiptExpense = $poll.items | Where-Object { $_.receiptKey -eq $uploadResp.key } | Select-Object -First 1
  if ($receiptExpense) { break }
}
if (-not $receiptExpense) { throw 'Receipt processing did not create expense item in 5-minute window' }

Write-Host "[7/8] Cleanup"
try { Invoke-Api -Method 'DELETE' -Path "/expenses/$expenseId" | Out-Null } catch { Write-Warning "Failed to cleanup expenseId=$expenseId" }
if ($receiptExpense.expenseId) { try { Invoke-Api -Method 'DELETE' -Path "/expenses/$($receiptExpense.expenseId)" | Out-Null } catch { Write-Warning "Failed to cleanup receipt expenseId=$($receiptExpense.expenseId)" } }
try { Invoke-Api -Method 'DELETE' -Path "/budgets/$budgetId" | Out-Null } catch { Write-Warning "Failed to cleanup budgetId=$budgetId" }
try { aws cognito-idp admin-delete-user --region $Region --user-pool-id $userPoolId --username $email | Out-Null } catch { Write-Warning "Failed to cleanup user=$email" }

Write-Host "[8/8] PASS"
Write-Output "E2E certification PASS"
Write-Output "ApiUrl=$apiUrl"
Write-Output "UserPoolId=$userPoolId"
Write-Output "RunId=$runId"

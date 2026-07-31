$ErrorActionPreference = 'Stop'

function Read-Exact {
    param([System.IO.Stream]$Stream, [int]$Count)
    $buffer = New-Object byte[] $Count
    $offset = 0
    while ($offset -lt $Count) {
        $read = $Stream.Read($buffer, $offset, $Count - $offset)
        if ($read -eq 0) { throw 'Unexpected end of native messaging input.' }
        $offset += $read
    }
    return $buffer
}

function Write-NativeMessage {
    param([hashtable]$Message)
    $payload = [System.Text.Encoding]::UTF8.GetBytes(
        ($Message | ConvertTo-Json -Compress)
    )
    $length = [System.BitConverter]::GetBytes([int]$payload.Length)
    $stdout = [Console]::OpenStandardOutput()
    $stdout.Write($length, 0, $length.Length)
    $stdout.Write($payload, 0, $payload.Length)
    $stdout.Flush()
}

function Invoke-Git {
    param([string]$RepoRoot, [string]$Arguments)
    $result = & cmd /d /c "git -C `"$RepoRoot`" $Arguments 2>&1"
    return @{
        exitCode = $LASTEXITCODE
        output = (($result | Out-String).Trim())
    }
}

try {
    $stdin = [Console]::OpenStandardInput()
    $lengthBytes = Read-Exact -Stream $stdin -Count 4
    $messageLength = [System.BitConverter]::ToInt32($lengthBytes, 0)
    if ($messageLength -lt 0) { throw 'Invalid native messaging payload length.' }
    $messageBytes = Read-Exact -Stream $stdin -Count $messageLength
    $message = ([System.Text.Encoding]::UTF8.GetString($messageBytes)) |
        ConvertFrom-Json

    if ($message.action -ne 'update') {
        Write-NativeMessage @{
            ok = $false; upToDate = $false; before = ''; after = ''
            message = 'Unknown action.'
        }
        exit 0
    }

    $repoRoot = Split-Path -Parent $PSScriptRoot
    if (-not (Test-Path (Join-Path $repoRoot '.git'))) {
        $repoRoot = 'D:\git\web-md'
    }
    if (-not (Test-Path (Join-Path $repoRoot '.git'))) {
        throw "Git clone not found: $repoRoot"
    }

    $beforeResult = Invoke-Git -RepoRoot $repoRoot -Arguments 'rev-parse --short HEAD'
    if ($beforeResult.exitCode -ne 0) { throw $beforeResult.output }
    $before = $beforeResult.output

    # Git progress can be written to stderr. Only the process exit code decides success.
    $pullResult = Invoke-Git -RepoRoot $repoRoot -Arguments 'pull --ff-only'
    if ($pullResult.exitCode -ne 0) {
        Write-NativeMessage @{
            ok = $false; upToDate = $false; before = $before; after = $before
            message = $pullResult.output
        }
        exit 0
    }

    $afterResult = Invoke-Git -RepoRoot $repoRoot -Arguments 'rev-parse --short HEAD'
    if ($afterResult.exitCode -ne 0) { throw $afterResult.output }
    $after = $afterResult.output
    Write-NativeMessage @{
        ok = $true
        upToDate = ($before -eq $after)
        before = $before
        after = $after
        message = $pullResult.output
    }
} catch {
    Write-NativeMessage @{
        ok = $false; upToDate = $false; before = ''; after = ''
        message = $_.Exception.Message
    }
}

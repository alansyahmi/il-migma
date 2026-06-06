$ErrorActionPreference = "SilentlyContinue"

function Get-PayloadValue {
  param(
    [object] $Payload,
    [string[]] $Names
  )

  if ($null -eq $Payload) {
    return $null
  }

  foreach ($name in $Names) {
    $property = $Payload.PSObject.Properties[$name]
    if ($null -ne $property -and -not [string]::IsNullOrWhiteSpace([string] $property.Value)) {
      return [string] $property.Value
    }
  }

  return $null
}

$payload = $null
$inputText = [Console]::In.ReadToEnd()

if (-not [string]::IsNullOrWhiteSpace($inputText)) {
  try {
    $payload = $inputText | ConvertFrom-Json -ErrorAction Stop
  } catch {
    $payload = $null
  }
}

$title = Get-PayloadValue -Payload $payload -Names @("title", "event", "type")
if ([string]::IsNullOrWhiteSpace($title)) {
  $title = "Codex ECC"
} else {
  $title = "Codex ECC - $title"
}

$message = Get-PayloadValue -Payload $payload -Names @(
  "message",
  "summary",
  "body",
  "last-assistant-message",
  "last_assistant_message"
)

if ([string]::IsNullOrWhiteSpace($message)) {
  $message = "Task completed."
}

if ($message.Length -gt 240) {
  $message = $message.Substring(0, 237) + "..."
}

try {
  Add-Type -AssemblyName System.Windows.Forms
  Add-Type -AssemblyName System.Drawing

  $notification = New-Object System.Windows.Forms.NotifyIcon
  $notification.Icon = [System.Drawing.SystemIcons]::Information
  $notification.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::Info
  $notification.BalloonTipTitle = $title
  $notification.BalloonTipText = $message
  $notification.Visible = $true

  [System.Media.SystemSounds]::Asterisk.Play()
  $notification.ShowBalloonTip(5000)
  Start-Sleep -Seconds 6
  $notification.Dispose()
} catch {
  try {
    [System.Media.SystemSounds]::Asterisk.Play()
  } catch {
  }
}

exit 0

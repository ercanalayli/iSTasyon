param(
  [Parameter(Mandatory=$true)][string]$Operation,
  [string]$PayloadJson = '{}'
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class ApeirDesktopNative {
  public delegate bool EnumWindowsProc(IntPtr hwnd, IntPtr lparam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lparam);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hwnd);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hwnd, StringBuilder text, int maxCount);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint processId);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hwnd);
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hwnd, int command);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr hwnd);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left,Top,Right,Bottom; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, out RECT rect);
  [DllImport("user32.dll")] public static extern uint SendInput(uint count, INPUT[] inputs, int size);
  [DllImport("kernel32.dll")] public static extern uint WTSGetActiveConsoleSessionId();
  [DllImport("user32.dll", SetLastError=true)] public static extern IntPtr OpenInputDesktop(uint flags, bool inherit, uint access);
  [DllImport("user32.dll")] public static extern IntPtr GetProcessWindowStation();
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
  [DllImport("user32.dll")] public static extern IntPtr GetThreadDesktop(uint threadId);
  [DllImport("user32.dll")] public static extern bool CloseDesktop(IntPtr desktop);
  [DllImport("user32.dll", SetLastError=true)] public static extern bool GetUserObjectInformation(IntPtr handle, int index, StringBuilder info, int length, out int needed);
  [StructLayout(LayoutKind.Sequential)] public struct MOUSEINPUT { public int dx,dy; public uint mouseData,dwFlags,time; public IntPtr dwExtraInfo; }
  [StructLayout(LayoutKind.Sequential)] public struct KEYBDINPUT { public ushort wVk,wScan; public uint dwFlags,time; public IntPtr dwExtraInfo; }
  [StructLayout(LayoutKind.Explicit)] public struct UNION { [FieldOffset(0)] public MOUSEINPUT mi; [FieldOffset(0)] public KEYBDINPUT ki; }
  [StructLayout(LayoutKind.Sequential)] public struct INPUT { public uint type; public UNION u; }
  public static INPUT Mouse(uint flags) { return new INPUT { type=0, u=new UNION { mi=new MOUSEINPUT { dwFlags=flags } } }; }
  public static INPUT Key(ushort vk, ushort scan, uint flags) { return new INPUT { type=1, u=new UNION { ki=new KEYBDINPUT { wVk=vk,wScan=scan,dwFlags=flags } } }; }
}
'@
function Assert-InteractiveDesktop {
  $current = [System.Diagnostics.Process]::GetCurrentProcess().SessionId
  $active = [ApeirDesktopNative]::WTSGetActiveConsoleSessionId()
  if ($current -eq 0 -or $current -ne $active) { throw 'interactive_session_unavailable' }
  $stationName = New-Object System.Text.StringBuilder 128
  $stationLength = 0
  if (-not [ApeirDesktopNative]::GetUserObjectInformation([ApeirDesktopNative]::GetProcessWindowStation(), 2, $stationName, $stationName.Capacity * 2, [ref]$stationLength)) { throw 'window_station_unavailable' }
  if ($stationName.ToString() -ne 'WinSta0') { throw "noninteractive_window_station:$($stationName.ToString())" }
  $threadDesktop = New-Object System.Text.StringBuilder 128
  $threadLength = 0
  $threadHandle = [ApeirDesktopNative]::GetThreadDesktop([ApeirDesktopNative]::GetCurrentThreadId())
  if (-not [ApeirDesktopNative]::GetUserObjectInformation($threadHandle, 2, $threadDesktop, $threadDesktop.Capacity * 2, [ref]$threadLength)) { throw 'thread_desktop_unavailable' }
  if ($threadDesktop.ToString() -ne 'Default') { throw "noninteractive_thread_desktop:$($threadDesktop.ToString())" }
  $desktop = [ApeirDesktopNative]::OpenInputDesktop(0, $false, 1)
  if ($desktop -eq [IntPtr]::Zero) { throw 'input_desktop_unavailable' }
  try {
    $name = New-Object System.Text.StringBuilder 128
    $needed = 0
    if (-not [ApeirDesktopNative]::GetUserObjectInformation($desktop, 2, $name, $name.Capacity * 2, [ref]$needed)) { throw 'desktop_name_unavailable' }
    if ($name.ToString() -ne 'Default') { throw 'secure_desktop_blocked' }
  } finally { [void][ApeirDesktopNative]::CloseDesktop($desktop) }
  if (Get-Process LogonUI -ErrorAction SilentlyContinue | Where-Object SessionId -eq $current) { throw 'windows_session_locked' }
  return $current
}
function Get-WindowList {
  $items = New-Object System.Collections.Generic.List[object]
  $callback = [ApeirDesktopNative+EnumWindowsProc]{ param($handle,$unused)
    if ([ApeirDesktopNative]::IsWindowVisible($handle)) {
      $title = New-Object System.Text.StringBuilder 256
      [void][ApeirDesktopNative]::GetWindowText($handle,$title,$title.Capacity)
      if ($title.Length -gt 0) {
        [uint32]$pidValue = 0
        [void][ApeirDesktopNative]::GetWindowThreadProcessId($handle,[ref]$pidValue)
        try { $processName = (Get-Process -Id $pidValue -ErrorAction Stop).ProcessName } catch { $processName = '' }
        $items.Add([pscustomobject]@{ hwnd=$handle.ToInt64().ToString(); title=$title.ToString(); process=$processName; pid=$pidValue })
      }
    }
    return $true
  }
  [void][ApeirDesktopNative]::EnumWindows($callback,[IntPtr]::Zero)
  return $items.ToArray()
}
function Send-Inputs([ApeirDesktopNative+INPUT[]]$inputs) {
  if ([ApeirDesktopNative]::SendInput([uint32]$inputs.Length,$inputs,[Runtime.InteropServices.Marshal]::SizeOf([type][ApeirDesktopNative+INPUT])) -ne $inputs.Length) { throw 'input_rejected' }
}
$payload = ConvertFrom-Json -InputObject $PayloadJson
$session = Assert-InteractiveDesktop
switch ($Operation) {
  'health' { $result = @{available=$true; session_id=$session; windows=$true; mouse=$true; keyboard=$true; inspect_screen=$true} }
  'list_windows' { $result = @{windows=@(Get-WindowList)} }
  'focus_window' {
    $handle = [IntPtr]::new([long]$payload.hwnd)
    if (-not [ApeirDesktopNative]::IsWindow($handle)) { throw 'window_not_found' }
    [void][ApeirDesktopNative]::ShowWindowAsync($handle,9)
    if (-not [ApeirDesktopNative]::SetForegroundWindow($handle)) { throw 'window_focus_denied' }
    Start-Sleep -Milliseconds 150
    if ([ApeirDesktopNative]::GetForegroundWindow() -ne $handle) { throw 'window_focus_unverified' }
    $result = @{focused=$true; hwnd=$payload.hwnd}
  }
  'inspect_screen' {
    $bounds = [System.Windows.Forms.SystemInformation]::VirtualScreen
    if ($bounds.Width -le 0 -or $bounds.Height -le 0 -or ([long]$bounds.Width*$bounds.Height) -gt 16000000) { throw 'screen_bounds_invalid' }
    $bitmap = New-Object System.Drawing.Bitmap($bounds.Width,$bounds.Height)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      try { $graphics.CopyFromScreen($bounds.Left,$bounds.Top,0,0,$bounds.Size) } finally { $graphics.Dispose() }
      $targetWidth = [Math]::Min($bounds.Width,1280)
      $targetHeight = [int][Math]::Round($bounds.Height * $targetWidth / $bounds.Width)
      $preview = New-Object System.Drawing.Bitmap($targetWidth,$targetHeight)
      try {
        $draw = [System.Drawing.Graphics]::FromImage($preview)
        try { $draw.DrawImage($bitmap,0,0,$targetWidth,$targetHeight) } finally { $draw.Dispose() }
        $stream = New-Object System.IO.MemoryStream
        try { $preview.Save($stream,[System.Drawing.Imaging.ImageFormat]::Jpeg); $result=@{available=$true; width=$bounds.Width; height=$bounds.Height; preview_width=$targetWidth; preview_height=$targetHeight; jpeg_base64=[Convert]::ToBase64String($stream.ToArray())} } finally { $stream.Dispose() }
      } finally { $preview.Dispose() }
    } finally { $bitmap.Dispose() }
  }
  'inspect_window' {
    $handle = [IntPtr]::new([long]$payload.hwnd)
    $window = @(Get-WindowList | Where-Object hwnd -eq $payload.hwnd)[0]
    if (-not $window) { throw 'window_not_found' }
    $rect = New-Object ApeirDesktopNative+RECT
    if (-not [ApeirDesktopNative]::GetWindowRect($handle,[ref]$rect)) { throw 'window_region_unavailable' }
    $screen = [System.Windows.Forms.SystemInformation]::VirtualScreen
    $region = [System.Drawing.Rectangle]::Intersect([System.Drawing.Rectangle]::FromLTRB($rect.Left,$rect.Top,$rect.Right,$rect.Bottom),$screen)
    if ($region.Width -le 0 -or $region.Height -le 0 -or ([long]$region.Width*$region.Height) -gt 16000000) { throw 'window_region_invalid' }
    $bitmap = New-Object System.Drawing.Bitmap($region.Width,$region.Height)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      try { $graphics.CopyFromScreen($region.Left,$region.Top,0,0,$region.Size) } finally { $graphics.Dispose() }
      $targetWidth=[Math]::Min($region.Width,1280)
      $targetHeight=[int][Math]::Round($region.Height*$targetWidth/$region.Width)
      $preview=New-Object System.Drawing.Bitmap($targetWidth,$targetHeight)
      try {
        $draw=[System.Drawing.Graphics]::FromImage($preview)
        try { $draw.DrawImage($bitmap,0,0,$targetWidth,$targetHeight) } finally { $draw.Dispose() }
        $stream=New-Object System.IO.MemoryStream
        try { $preview.Save($stream,[System.Drawing.Imaging.ImageFormat]::Jpeg); $result=@{window=$window; inspection='window_region'; width=$region.Width; height=$region.Height; jpeg_base64=[Convert]::ToBase64String($stream.ToArray())} } finally { $stream.Dispose() }
      } finally { $preview.Dispose() }
    } finally { $bitmap.Dispose() }
  }
  'mouse_move' {
    $x=[int]$payload.x; $y=[int]$payload.y
    $bounds=[System.Windows.Forms.SystemInformation]::VirtualScreen
    if (-not $bounds.Contains($x,$y)) { throw 'cursor_outside_screen' }
    [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($x,$y)
    $result=@{moved=([System.Windows.Forms.Cursor]::Position.X -eq $x -and [System.Windows.Forms.Cursor]::Position.Y -eq $y)}
  }
  'mouse_click' {
    $button = [string]$payload.button
    if ($button -ne 'left' -and $button -ne 'right') { throw 'mouse_button_invalid' }
    $flags = if ($button -eq 'left') { @(2,4) } else { @(8,16) }
    Send-Inputs @([ApeirDesktopNative]::Mouse($flags[0]),[ApeirDesktopNative]::Mouse($flags[1]))
    $result=@{clicked=$true; button=$button}
  }
  'type' {
    $value=[string]$payload.text
    if ($value.Length -gt 1000 -or $value -match '[\r\n]') { throw 'text_invalid' }
    foreach ($char in $value.ToCharArray()) { Send-Inputs @([ApeirDesktopNative]::Key(0,[ushort][char]$char,4),[ApeirDesktopNative]::Key(0,[ushort][char]$char,6)) }
    $result=@{typed=$true; characters=$value.Length}
  }
  'hotkey' {
    $keys=@($payload.keys)
    $map=@{ CTRL=17; ALT=18; SHIFT=16; ESC=27; TAB=9; ENTER=13; A=65; C=67; V=86; X=88; F=70 }
    if ($keys.Count -lt 1 -or $keys.Count -gt 3) { throw 'hotkey_invalid' }
    $codes=@(); foreach ($key in $keys) { $name=([string]$key).ToUpperInvariant(); if (-not $map.ContainsKey($name)) { throw 'hotkey_invalid' }; $codes += [ushort]$map[$name] }
    foreach ($code in $codes) { Send-Inputs @([ApeirDesktopNative]::Key($code,0,0)) }
    [array]::Reverse($codes)
    foreach ($code in $codes) { Send-Inputs @([ApeirDesktopNative]::Key($code,0,2)) }
    $result=@{sent=$true}
  }
  default { throw 'operation_not_allowed' }
}
$result | ConvertTo-Json -Depth 6 -Compress

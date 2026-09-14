Option Explicit
Dim sh, mode, command
If WScript.Arguments.Count <> 1 Then WScript.Quit 64
mode = LCase(WScript.Arguments(0))
Set sh = CreateObject("WScript.Shell")
Select Case mode
  Case "runtime"
    command = """C:\Program Files\nodejs\node.exe"" ""C:\AperiON\iSTasyon\tools\aperion_runtime_7x24.cjs"""
  Case "watchdog"
    command = "powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File ""C:\Users\HP\Documents\Codex\2026-08-27\referenced-chatgpt-conversation-this-is-an\work\aperion-command-bridge\ensure-aperion-always-on.ps1"""
  Case "hermes-watchdog"
    command = "powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File ""C:\Users\HP\AppData\Local\hermes\gateway-service\Watch-AperionHermesGateway.ps1"""
  Case "session-watchdog"
    command = "powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File ""C:\Users\HP\Documents\New project\aperion-windows-automation\bizimhesap-session-watchdog.ps1"""
  Case "listener-watchdog"
    command = "powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File ""C:\AperiON\iSTasyon\tools\aperion_listener_watchdog.ps1"""
  Case "e2e-monitor"
    command = "powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File ""C:\Users\HP\Documents\New project\hermes\local-runtime\Watch-AperionEndToEnd.ps1"""
  Case "bizimhesap-sync"
    command = "powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File ""C:\AperiON\run-bizimhesap-sync.ps1"""
  Case "d1-sales-sync"
    command = "powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File ""C:\Users\HP\Documents\Codex\2026-08-13\x-2\work\aperion-deploy\tools\invoke_secure_bizimhesap_d1_sales.ps1"""
  Case Else
    WScript.Quit 65
End Select
WScript.Quit sh.Run(command, 0, True)

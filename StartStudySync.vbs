Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "c:\Users\KARTHIK\.antigravity\cautious-happiness"
WshShell.Run "cmd /c npx electron .", 0, False

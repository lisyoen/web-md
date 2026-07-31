@echo off
chcp 65001 > nul
setlocal
set "HOST_NAME=com.lisyoen.web_md_updater"
set "HOST_PATH=%~dp0host.bat"
set "MANIFEST_PATH=%~dp0host-manifest.json"
set "JSON_HOST_PATH=%HOST_PATH:\=\\%"

> "%MANIFEST_PATH%" echo {"name":"com.lisyoen.web_md_updater","description":"web-md one-click updater","type":"stdio","path":"%JSON_HOST_PATH%","allowed_origins":["chrome-extension://hnnjniibaifjaimdceplboabhjpgoojc/"]}

reg add "HKCU\Software\Google\Chrome\NativeMessagingHosts\%HOST_NAME%" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f
if errorlevel 1 (
  echo 등록에 실패했습니다. 위 오류를 확인해 주세요.
) else (
  echo Native Messaging 호스트 등록 완료:
  echo %MANIFEST_PATH%
  echo chrome://extensions 에서 extension 폴더를 압축해제된 확장 프로그램으로 로드하십시오.
)
pause

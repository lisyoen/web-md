@echo off
chcp 65001 > nul
setlocal
set "REPO_ROOT=%~dp0.."

where git > nul 2>&1
if errorlevel 1 (
  echo Git이 설치되어 있지 않거나 PATH에서 찾을 수 없습니다.
  pause
  exit /b 1
)

for /f %%i in ('git -C "%REPO_ROOT%" rev-parse --short HEAD 2^>nul') do set "BEFORE=%%i"
if not defined BEFORE (
  echo 저장소를 확인할 수 없습니다: %REPO_ROOT%
  pause
  exit /b 1
)
echo 업데이트 전: %BEFORE%

git -C "%REPO_ROOT%" pull --ff-only
if errorlevel 1 (
  echo 원격 저장소 접근 또는 git pull에 실패했습니다. 위 오류를 확인해 주세요.
  pause
  exit /b 1
)

for /f %%i in ('git -C "%REPO_ROOT%" rev-parse --short HEAD') do set "AFTER=%%i"
echo 업데이트 후: %AFTER%
if "%BEFORE%"=="%AFTER%" (
  echo 이미 최신 버전입니다.
) else (
  echo chrome://extensions 에서 이 확장의 새로고침 버튼을 눌러 적용하십시오.
)
pause

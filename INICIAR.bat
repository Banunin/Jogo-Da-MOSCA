@echo off
setlocal
cd /d "%~dp0"
title MUSCA - Desenvolvimento Local
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado.
  echo Instale a versao LTS em https://nodejs.org/
  pause
  exit /b 1
)
if not exist node_modules\vite\bin\vite.js (
  echo Instalando dependencias...
  call npm install
  if errorlevel 1 (echo Falha na instalacao.& pause & exit /b 1)
)
echo.
echo MUSCA - ambiente local completo
echo O multiplayer e criado e acessado DENTRO do site.
echo Nenhum modo multiplayer separado por .bat e necessario.
echo.
start "" "http://localhost:8080"
call npm run dev:full

@echo off
rem Windows (cmd): install.cmd [coff install flags]   e.g. install.cmd --opencode --profile free
where node >nul 2>nul || (echo Node.js ^>= 18 nao encontrado. Baixe em https://nodejs.org & exit /b 1)
node "%~dp0scripts\install.mjs" %*

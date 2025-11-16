@echo off
echo ========================================
echo ExITS SaaS LMS - Setup Script
echo ========================================
echo.

echo [1/4] Installing API dependencies...
cd api
call npm install
if %errorlevel% neq 0 (
    echo ERROR: API installation failed!
    pause
    exit /b 1
)
cd ..

echo.
echo [2/4] Installing Web dependencies...
cd web
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Web installation failed!
    pause
    exit /b 1
)
cd ..

echo.
echo [3/4] Installing Mobile dependencies...
cd loanflow
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Mobile installation failed!
    pause
    exit /b 1
)
cd ..

echo.
echo [4/4] Installing root dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Root installation failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Setup completed successfully! ✓
echo ========================================
echo.
echo You can now run:
echo   npm run dev:all    - Start all services
echo   npm run dev:api    - Start API only
echo   npm run dev:web    - Start Web only
echo   npm run dev:mobile - Start Mobile only
echo.
pause

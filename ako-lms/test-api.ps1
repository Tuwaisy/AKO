# 🧪 AKO LMS API Test Script (PowerShell)
# Usage: .\test-api.ps1

$BaseURL = "http://localhost:4000"
$ApiURL = "$BaseURL/api"

$TestsTotal = 0
$TestsPassed = 0

function Write-TestResult {
    param($TestName, $Passed, $Details = "")
    
    if ($Passed) {
        Write-Host "[PASS] $TestName" -ForegroundColor Green
        $global:TestsPassed++
    } else {
        Write-Host "[FAIL] $TestName" -ForegroundColor Red
        if ($Details) {
            Write-Host "       $Details" -ForegroundColor Yellow
        }
    }
    $global:TestsTotal++
}

function Test-Endpoint {
    param($Url, $Method = "GET", $Body = $null, $Headers = @{})
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            TimeoutSec = 10
        }
        
        if ($Body) {
            $params.Body = $Body
            $params.ContentType = "application/json"
        }
        
        if ($Headers.Count -gt 0) {
            $params.Headers = $Headers
        }
        
        $response = Invoke-RestMethod @params
        return @{ Success = $true; Data = $response }
    }
    catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

Write-Host "🧪 Starting AKO LMS API Tests..." -ForegroundColor Blue
Write-Host "Base URL: $BaseURL"
Write-Host "================================"

# Test 1: Health Check
Write-Host "[TEST] Health Check" -ForegroundColor Cyan
$healthResult = Test-Endpoint "$BaseURL/health"
Test-TestResult "Health Check" $healthResult.Success

# Test 2: Admin Login
Write-Host "[TEST] Admin Login" -ForegroundColor Cyan
$loginBody = @{
    email = "admin@akocourses.com"
    password = "admin123"
} | ConvertTo-Json

$loginResult = Test-Endpoint "$ApiURL/auth/login" "POST" $loginBody
$token = $null
if ($loginResult.Success -and $loginResult.Data.tokens.accessToken) {
    $token = $loginResult.Data.tokens.accessToken
    Write-Host "[INFO] Token obtained: $($token.Substring(0, [Math]::Min(20, $token.Length)))..." -ForegroundColor Yellow
}
Test-TestResult "Admin Login" ($token -ne $null)

# Test authenticated endpoints if we have a token
if ($token) {
    $authHeaders = @{ Authorization = "Bearer $token" }
    
    # Test 3: Get Users (Admin endpoint)
    Write-Host "[TEST] Get Users (Admin)" -ForegroundColor Cyan
    $usersResult = Test-Endpoint "$ApiURL/users" "GET" $null $authHeaders
    Test-TestResult "Get Users (Admin)" $usersResult.Success
    
    # Test 4: Get Courses
    Write-Host "[TEST] Get Courses" -ForegroundColor Cyan
    $coursesResult = Test-Endpoint "$ApiURL/courses" "GET" $null $authHeaders
    Test-TestResult "Get Courses" $coursesResult.Success
    
    # Test 5: Get Enrollments
    Write-Host "[TEST] Get Enrollments" -ForegroundColor Cyan
    $enrollmentsResult = Test-Endpoint "$ApiURL/enrollments" "GET" $null $authHeaders
    Test-TestResult "Get Enrollments" $enrollmentsResult.Success
    
    # Test 6: Get Admin Stats
    Write-Host "[TEST] Get Admin Stats" -ForegroundColor Cyan
    $statsResult = Test-Endpoint "$ApiURL/admin/stats" "GET" $null $authHeaders
    Test-TestResult "Get Admin Stats" $statsResult.Success
} else {
    Write-Host "[INFO] Skipping authenticated tests - no token available" -ForegroundColor Yellow
    $TestsTotal += 4
}

# Test 7: Student Login
Write-Host "[TEST] Student Login" -ForegroundColor Cyan
$studentLoginBody = @{
    email = "student@akocourses.com"
    password = "student123"
} | ConvertTo-Json

$studentLoginResult = Test-Endpoint "$ApiURL/auth/login" "POST" $studentLoginBody
Test-TestResult "Student Login" ($studentLoginResult.Success -and $studentLoginResult.Data.tokens.accessToken)

# Test 8: Instructor Login
Write-Host "[TEST] Instructor Login" -ForegroundColor Cyan
$instructorLoginBody = @{
    email = "instructor@akocourses.com"
    password = "instructor123"
} | ConvertTo-Json

$instructorLoginResult = Test-Endpoint "$ApiURL/auth/login" "POST" $instructorLoginBody
Test-TestResult "Instructor Login" ($instructorLoginResult.Success -and $instructorLoginResult.Data.tokens.accessToken)

# Test 9: Unauthorized Access Protection
Write-Host "[TEST] Unauthorized Access Protection" -ForegroundColor Cyan
try {
    $unauthResult = Invoke-WebRequest "$ApiURL/admin/users" -TimeoutSec 5
    Test-TestResult "Unauthorized Access Protection" $false "Should have returned 401"
}
catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Test-TestResult "Unauthorized Access Protection" ($statusCode -eq 401) "Status: $statusCode"
}

Write-Host "================================"
Write-Host "📊 Test Results:"
Write-Host "   Passed: $TestsPassed" -ForegroundColor Green
Write-Host "   Failed: $($TestsTotal - $TestsPassed)" -ForegroundColor Red
Write-Host "   Total:  $TestsTotal"

if ($TestsPassed -eq $TestsTotal) {
    Write-Host "🎉 All tests passed!" -ForegroundColor Green
    exit 0
} elseif ($TestsPassed -gt ($TestsTotal / 2)) {
    Write-Host "⚠️ Most tests passed - check failed tests above" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "❌ Many tests failed - check API server status" -ForegroundColor Red
    exit 1
}
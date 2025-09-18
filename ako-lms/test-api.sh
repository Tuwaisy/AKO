#!/bin/bash
# 🧪 AKO LMS API Test Script

BASE_URL="http://localhost:4000"
API_URL="$BASE_URL/api"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
}

print_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

# Test counter
TESTS_TOTAL=0
TESTS_PASSED=0

run_test() {
    local test_name="$1"
    local curl_command="$2"
    local expected_status="$3"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    print_test "$test_name"
    
    response=$(eval "$curl_command" 2>/dev/null)
    status=$?
    
    if [ $status -eq 0 ]; then
        print_pass "$test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_fail "$test_name"
    fi
}

echo "🧪 Starting AKO LMS API Tests..."
echo "Base URL: $BASE_URL"
echo "================================"

# Test 1: Health Check
print_test "Health Check"
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
if [ "$response" = "200" ]; then
    print_pass "Health Check (Status: $response)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    print_fail "Health Check (Status: $response)"
fi
TESTS_TOTAL=$((TESTS_TOTAL + 1))

# Test 2: Login with Admin Account
print_test "Admin Login"
login_response=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@akocourses.com","password":"admin123"}')

if echo "$login_response" | grep -q "accessToken"; then
    print_pass "Admin Login"
    TOKEN=$(echo "$login_response" | grep -o '"accessToken":"[^"]*' | sed 's/"accessToken":"//')
    print_info "Token obtained: ${TOKEN:0:20}..."
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    print_fail "Admin Login"
    print_info "Response: $login_response"
    TOKEN=""
fi
TESTS_TOTAL=$((TESTS_TOTAL + 1))

# Only run authenticated tests if we have a token
if [ -n "$TOKEN" ]; then
    AUTH_HEADER="Authorization: Bearer $TOKEN"
    
    # Test 3: Get Users (Admin endpoint)
    print_test "Get Users (Admin)"
    users_response=$(curl -s -H "$AUTH_HEADER" "$API_URL/users")
    if echo "$users_response" | grep -q "email"; then
        print_pass "Get Users"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_fail "Get Users"
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Test 4: Get Courses
    print_test "Get Courses"
    courses_response=$(curl -s -H "$AUTH_HEADER" "$API_URL/courses")
    if echo "$courses_response" | grep -q -E '(\[|\]|title)'; then
        print_pass "Get Courses"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_fail "Get Courses"
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Test 5: Get Enrollments
    print_test "Get Enrollments"
    enrollments_response=$(curl -s -H "$AUTH_HEADER" "$API_URL/enrollments")
    if echo "$enrollments_response" | grep -q -E '(\[|\])'; then
        print_pass "Get Enrollments"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_fail "Get Enrollments"
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Test 6: Get Admin Stats
    print_test "Get Admin Stats"
    stats_response=$(curl -s -H "$AUTH_HEADER" "$API_URL/admin/stats")
    if echo "$stats_response" | grep -q -E '(users|courses)'; then
        print_pass "Get Admin Stats"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_fail "Get Admin Stats"
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
else
    print_info "Skipping authenticated tests - no token available"
    TESTS_TOTAL=$((TESTS_TOTAL + 4))
fi

# Test Student Login
print_test "Student Login"
student_login=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"student@akocourses.com","password":"student123"}')

if echo "$student_login" | grep -q "accessToken"; then
    print_pass "Student Login"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    print_fail "Student Login"
fi
TESTS_TOTAL=$((TESTS_TOTAL + 1))

# Test Instructor Login  
print_test "Instructor Login"
instructor_login=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"instructor@akocourses.com","password":"instructor123"}')

if echo "$instructor_login" | grep -q "accessToken"; then
    print_pass "Instructor Login"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    print_fail "Instructor Login"
fi
TESTS_TOTAL=$((TESTS_TOTAL + 1))

# Test unauthorized access
print_test "Unauthorized Access Protection"
unauth_response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/admin/users")
if [ "$unauth_response" = "401" ]; then
    print_pass "Unauthorized Access Protection"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    print_fail "Unauthorized Access Protection (Status: $unauth_response)"
fi
TESTS_TOTAL=$((TESTS_TOTAL + 1))

echo "================================"
echo "📊 Test Results:"
echo "   Passed: $TESTS_PASSED"
echo "   Failed: $((TESTS_TOTAL - TESTS_PASSED))"  
echo "   Total:  $TESTS_TOTAL"

if [ $TESTS_PASSED -eq $TESTS_TOTAL ]; then
    print_pass "🎉 All tests passed!"
    exit 0
elif [ $TESTS_PASSED -gt $((TESTS_TOTAL / 2)) ]; then
    print_info "⚠️ Most tests passed - check failed tests above"
    exit 1
else
    print_fail "❌ Many tests failed - check API server status"
    exit 1
fi
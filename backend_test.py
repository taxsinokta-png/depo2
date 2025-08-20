#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Evim Kirada Platform
Tests all authentication, property management, and application workflows
"""

import requests
import sys
import json
from datetime import datetime, timedelta
import random
import string

class EvimKiradaAPITester:
    def __init__(self, base_url="https://evimkirada.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.owner_token = None
        self.tenant_token = None
        self.owner_user = None
        self.tenant_user = None
        self.test_property_id = None
        self.test_application_id = None
        self.tests_run = 0
        self.tests_passed = 0
        
    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
    def make_request(self, method, endpoint, data=None, token=None, expected_status=200):
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
            
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
                
            success = response.status_code == expected_status
            return success, response.json() if response.content else {}, response.status_code
            
        except Exception as e:
            return False, {"error": str(e)}, 0

    def generate_test_email(self, role="tenant"):
        """Generate unique test email"""
        timestamp = datetime.now().strftime("%H%M%S")
        random_str = ''.join(random.choices(string.ascii_lowercase, k=4))
        return f"test_{role}_{timestamp}_{random_str}@example.com"

    def test_health_check(self):
        """Test API health endpoint"""
        success, response, status = self.make_request('GET', 'health')
        self.log_test("Health Check", success and 'status' in response)
        return success

    def test_user_registration(self):
        """Test user registration for both owner and tenant"""
        print("\n🔐 Testing User Registration...")
        
        # Test tenant registration
        tenant_data = {
            "email": self.generate_test_email("tenant"),
            "password": "testpass123",
            "full_name": "Test Kiracı",
            "role": "tenant",
            "phone": "+905551234567"
        }
        
        success, response, status = self.make_request('POST', 'auth/register', tenant_data, expected_status=200)
        self.log_test("Tenant Registration", success and 'id' in response)
        if success:
            self.tenant_user = response
            
        # Test owner registration
        owner_data = {
            "email": self.generate_test_email("owner"),
            "password": "testpass123",
            "full_name": "Test Ev Sahibi",
            "role": "owner",
            "phone": "+905551234568"
        }
        
        success, response, status = self.make_request('POST', 'auth/register', owner_data, expected_status=200)
        self.log_test("Owner Registration", success and 'id' in response)
        if success:
            self.owner_user = response
            
        # Test duplicate email registration
        success, response, status = self.make_request('POST', 'auth/register', tenant_data, expected_status=400)
        self.log_test("Duplicate Email Rejection", not success and status == 400)
        
        # Test invalid password (too short)
        invalid_data = tenant_data.copy()
        invalid_data["email"] = self.generate_test_email("invalid")
        invalid_data["password"] = "123"
        success, response, status = self.make_request('POST', 'auth/register', invalid_data, expected_status=400)
        self.log_test("Short Password Rejection", not success and status == 400)

    def test_user_login(self):
        """Test user login functionality"""
        print("\n🔑 Testing User Login...")
        
        if not self.tenant_user or not self.owner_user:
            self.log_test("Login Test Setup", False, "Users not registered")
            return False
            
        # Test tenant login
        login_data = {
            "email": self.tenant_user["email"],
            "password": "testpass123"
        }
        
        success, response, status = self.make_request('POST', 'auth/login', login_data)
        self.log_test("Tenant Login", success and 'access_token' in response)
        if success:
            self.tenant_token = response['access_token']
            
        # Test owner login
        login_data = {
            "email": self.owner_user["email"],
            "password": "testpass123"
        }
        
        success, response, status = self.make_request('POST', 'auth/login', login_data)
        self.log_test("Owner Login", success and 'access_token' in response)
        if success:
            self.owner_token = response['access_token']
            
        # Test invalid credentials
        invalid_login = {
            "email": self.tenant_user["email"],
            "password": "wrongpassword"
        }
        success, response, status = self.make_request('POST', 'auth/login', invalid_login, expected_status=400)
        self.log_test("Invalid Credentials Rejection", not success and status == 400)

    def test_auth_me_endpoint(self):
        """Test getting current user info"""
        print("\n👤 Testing Auth Me Endpoint...")
        
        if not self.tenant_token:
            self.log_test("Auth Me Test Setup", False, "No tenant token")
            return False
            
        success, response, status = self.make_request('GET', 'auth/me', token=self.tenant_token)
        self.log_test("Get Current User Info", success and response.get('role') == 'tenant')
        
        # Test without token
        success, response, status = self.make_request('GET', 'auth/me', expected_status=401)
        self.log_test("Unauthorized Access Rejection", not success and status == 401)

    def test_property_creation(self):
        """Test property creation (owner only)"""
        print("\n🏠 Testing Property Creation...")
        
        if not self.owner_token:
            self.log_test("Property Creation Test Setup", False, "No owner token")
            return False
            
        property_data = {
            "title": "Test Daire - Kadıköy",
            "description": "Güzel ve ferah bir daire, merkezi konumda",
            "property_type": "apartment",
            "address": "Test Sokak No:1",
            "district": "Kadıköy",
            "city": "İstanbul",
            "price": 8500.0,
            "deposit": 17000.0,
            "area": 85,
            "rooms": "2+1",
            "floor": 3,
            "heating": "Doğalgaz",
            "furnished": True,
            "pets_allowed": False,
            "amenities": ["Balkon", "Asansör", "Güvenlik"]
        }
        
        success, response, status = self.make_request('POST', 'properties', property_data, token=self.owner_token, expected_status=200)
        self.log_test("Property Creation by Owner", success and 'id' in response)
        if success:
            self.test_property_id = response['id']
            
        # Test property creation by tenant (should fail)
        success, response, status = self.make_request('POST', 'properties', property_data, token=self.tenant_token, expected_status=403)
        self.log_test("Property Creation by Tenant Rejection", not success and status == 403)

    def test_property_listing(self):
        """Test property listing and filtering"""
        print("\n📋 Testing Property Listing...")
        
        # Test basic property listing
        success, response, status = self.make_request('GET', 'properties')
        self.log_test("Basic Property Listing", success and isinstance(response, list))
        
        # Test filtering by city
        success, response, status = self.make_request('GET', 'properties?city=İstanbul')
        self.log_test("Filter by City", success and isinstance(response, list))
        
        # Test filtering by price range
        success, response, status = self.make_request('GET', 'properties?min_price=5000&max_price=10000')
        self.log_test("Filter by Price Range", success and isinstance(response, list))
        
        # Test filtering by rooms
        success, response, status = self.make_request('GET', 'properties?rooms=2+1')
        self.log_test("Filter by Rooms", success and isinstance(response, list))

    def test_property_detail(self):
        """Test getting property details"""
        print("\n🔍 Testing Property Detail...")
        
        if not self.test_property_id:
            self.log_test("Property Detail Test Setup", False, "No test property")
            return False
            
        success, response, status = self.make_request('GET', f'properties/{self.test_property_id}')
        self.log_test("Get Property Detail", success and response.get('id') == self.test_property_id)
        
        # Test non-existent property
        success, response, status = self.make_request('GET', 'properties/nonexistent-id', expected_status=404)
        self.log_test("Non-existent Property Rejection", not success and status == 404)

    def test_property_status_update(self):
        """Test updating property status"""
        print("\n🔄 Testing Property Status Update...")
        
        if not self.test_property_id or not self.owner_token:
            self.log_test("Property Status Test Setup", False, "Missing property or token")
            return False
            
        # Update to active status
        success, response, status = self.make_request('PUT', f'properties/{self.test_property_id}/status?status=active', token=self.owner_token)
        self.log_test("Update Property to Active", success)
        
        # Test unauthorized status update (by tenant)
        success, response, status = self.make_request('PUT', f'properties/{self.test_property_id}/status?status=inactive', token=self.tenant_token, expected_status=403)
        self.log_test("Unauthorized Status Update Rejection", not success and status == 403)

    def test_my_properties(self):
        """Test getting owner's properties"""
        print("\n🏘️ Testing My Properties...")
        
        if not self.owner_token:
            self.log_test("My Properties Test Setup", False, "No owner token")
            return False
            
        success, response, status = self.make_request('GET', 'my-properties', token=self.owner_token)
        self.log_test("Get My Properties", success and isinstance(response, list))
        
        # Test tenant accessing my-properties (should fail)
        success, response, status = self.make_request('GET', 'my-properties', token=self.tenant_token, expected_status=403)
        self.log_test("Tenant My Properties Rejection", not success and status == 403)

    def test_application_creation(self):
        """Test creating rental applications"""
        print("\n📝 Testing Application Creation...")
        
        if not self.test_property_id or not self.tenant_token:
            self.log_test("Application Creation Test Setup", False, "Missing property or tenant token")
            return False
            
        move_in_date = (datetime.now() + timedelta(days=30)).isoformat()
        application_data = {
            "property_id": self.test_property_id,
            "message": "Merhaba, bu daireye çok ilgi duyuyorum. Temiz ve düzenli bir kiracıyım.",
            "move_in_date": move_in_date
        }
        
        success, response, status = self.make_request('POST', 'applications', application_data, token=self.tenant_token, expected_status=200)
        self.log_test("Application Creation by Tenant", success and 'id' in response)
        if success:
            self.test_application_id = response['id']
            
        # Test duplicate application
        success, response, status = self.make_request('POST', 'applications', application_data, token=self.tenant_token, expected_status=400)
        self.log_test("Duplicate Application Rejection", not success and status == 400)
        
        # Test application by owner (should fail)
        success, response, status = self.make_request('POST', 'applications', application_data, token=self.owner_token, expected_status=403)
        self.log_test("Application by Owner Rejection", not success and status == 403)

    def test_applications_listing(self):
        """Test listing applications"""
        print("\n📋 Testing Applications Listing...")
        
        if not self.tenant_token or not self.owner_token:
            self.log_test("Applications Listing Test Setup", False, "Missing tokens")
            return False
            
        # Test tenant viewing their applications
        success, response, status = self.make_request('GET', 'applications', token=self.tenant_token)
        self.log_test("Tenant Applications Listing", success and isinstance(response, list))
        
        # Test owner viewing applications to their properties
        success, response, status = self.make_request('GET', 'applications', token=self.owner_token)
        self.log_test("Owner Applications Listing", success and isinstance(response, list))

    def test_kyc_process(self):
        """Test KYC processing"""
        print("\n🔍 Testing KYC Process...")
        
        if not self.test_application_id or not self.tenant_token:
            self.log_test("KYC Process Test Setup", False, "Missing application or tenant token")
            return False
            
        success, response, status = self.make_request('PUT', f'applications/{self.test_application_id}/kyc', token=self.tenant_token)
        self.log_test("KYC Processing", success and 'score' in response and 'status' in response)
        
        if success:
            kyc_score = response.get('score', 0)
            kyc_status = response.get('status', '')
            print(f"   KYC Score: {kyc_score}/100")
            print(f"   KYC Status: {kyc_status}")
            
            # Verify score is in expected range (60-95)
            score_valid = 60 <= kyc_score <= 95
            self.log_test("KYC Score Range Validation", score_valid)
            
            # Verify status logic (approved if >= 75)
            expected_status = "approved" if kyc_score >= 75 else "rejected"
            status_correct = kyc_status == expected_status
            self.log_test("KYC Status Logic Validation", status_correct)
        
        # Test unauthorized KYC (owner trying to process tenant's KYC)
        success, response, status = self.make_request('PUT', f'applications/{self.test_application_id}/kyc', token=self.owner_token, expected_status=403)
        self.log_test("Unauthorized KYC Rejection", not success and status == 403)

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Evim Kirada API Tests...")
        print("=" * 50)
        
        # Test sequence
        test_methods = [
            self.test_health_check,
            self.test_user_registration,
            self.test_user_login,
            self.test_auth_me_endpoint,
            self.test_property_creation,
            self.test_property_status_update,
            self.test_property_listing,
            self.test_property_detail,
            self.test_my_properties,
            self.test_application_creation,
            self.test_applications_listing,
            self.test_kyc_process
        ]
        
        for test_method in test_methods:
            try:
                test_method()
            except Exception as e:
                print(f"❌ {test_method.__name__} - ERROR: {str(e)}")
                
        # Print final results
        print("\n" + "=" * 50)
        print(f"📊 TEST RESULTS: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    """Main test runner"""
    tester = EvimKiradaAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())
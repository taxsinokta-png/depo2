#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Evim Kirada Platform
Tests all authentication, property management, and application workflows
"""

import requests
import sys
import json
import uuid
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
        self.payment_token = None
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

    def test_payment_initialization(self):
        """Test payment initialization (NEW PAYMENT SYSTEM)"""
        print("\n💳 Testing Payment Initialization...")
        
        if not self.test_application_id or not self.tenant_token:
            self.log_test("Payment Initialization Test Setup", False, "Missing application or tenant token")
            return False
            
        # Create a booking record first (simulate approved application becoming a booking)
        booking_id = str(uuid.uuid4())
        booking_data = {
            "id": booking_id,
            "property_id": self.test_property_id,
            "tenant_id": self.tenant_user["id"],
            "proposed_rent": 8500.0,
            "status": "confirmed",
            "created_at": datetime.now().isoformat()
        }
        
        # Insert booking directly into database (simulating approved application)
        try:
            import pymongo
            from pymongo import MongoClient
            import os
            
            # Connect to MongoDB directly to insert booking
            mongo_url = "mongodb://localhost:27017"
            client = MongoClient(mongo_url)
            db = client["test_database"]
            db.bookings.insert_one(booking_data)
            client.close()
            print(f"   Created booking: {booking_id}")
        except Exception as e:
            self.log_test("Booking Creation", False, f"Failed to create booking: {str(e)}")
            return False
        
        # Test payment initialization
        success, response, status = self.make_request('POST', f'payment/initialize?booking_id={booking_id}&user_ip=127.0.0.1', token=self.tenant_token)
        self.log_test("Payment Initialization", success and 'payment_token' in response)
        
        if success:
            self.payment_token = response.get('payment_token')
            commission_breakdown = response.get('commission_breakdown', {})
            
            print(f"   Payment Token: {self.payment_token}")
            print(f"   Total Amount: {commission_breakdown.get('total', 0)}")
            print(f"   Platform Commission (40%): {commission_breakdown.get('platform_commission', 0)}")
            print(f"   Owner Amount (60%): {commission_breakdown.get('owner_amount', 0)}")
            
            # Verify commission calculation (40% platform, 60% owner)
            total = commission_breakdown.get('total', 0)
            platform_commission = commission_breakdown.get('platform_commission', 0)
            owner_amount = commission_breakdown.get('owner_amount', 0)
            
            expected_commission = total * 0.4
            expected_owner = total * 0.6
            
            commission_correct = abs(platform_commission - expected_commission) < 0.01
            owner_correct = abs(owner_amount - expected_owner) < 0.01
            
            self.log_test("Commission Calculation (40%)", commission_correct)
            self.log_test("Owner Amount Calculation (60%)", owner_correct)
        
        # Test unauthorized payment initialization (different user)
        success, response, status = self.make_request('POST', f'payment/initialize?booking_id={booking_id}&user_ip=127.0.0.1', token=self.owner_token, expected_status=404)
        self.log_test("Unauthorized Payment Initialization", not success and status == 404)

    def test_payment_completion(self):
        """Test payment completion (NEW PAYMENT SYSTEM)"""
        print("\n✅ Testing Payment Completion...")
        
        if not hasattr(self, 'payment_token') or not self.payment_token:
            self.log_test("Payment Completion Test Setup", False, "No payment token")
            return False
            
        # Test successful payment completion
        success, response, status = self.make_request('POST', f'payment/complete?payment_token={self.payment_token}&status=success')
        self.log_test("Payment Completion Success", success and response.get('status') == 'success')
        
        if success:
            commission_processed = response.get('commission_processed', {})
            print(f"   Platform Commission: {commission_processed.get('platform_commission', 0)}")
            print(f"   Owner Payment: {commission_processed.get('owner_payment', 0)}")
            
        # Test failed payment completion
        success, response, status = self.make_request('POST', f'payment/complete?payment_token={self.payment_token}_invalid&status=failed', expected_status=404)
        self.log_test("Invalid Payment Token Rejection", not success and status == 404)

    def test_payment_history(self):
        """Test payment history endpoint"""
        print("\n📋 Testing Payment History...")
        
        if not self.tenant_token:
            self.log_test("Payment History Test Setup", False, "No tenant token")
            return False
            
        success, response, status = self.make_request('GET', 'payments', token=self.tenant_token)
        self.log_test("Get Payment History", success and isinstance(response, list))
        
        if success and len(response) > 0:
            payment = response[0]
            required_fields = ['id', 'booking_id', 'total_amount', 'commission_amount', 'owner_amount', 'status']
            has_all_fields = all(field in payment for field in required_fields)
            self.log_test("Payment Record Structure", has_all_fields)
            
            print(f"   Found {len(response)} payment(s)")
            print(f"   Latest Payment Status: {payment.get('status', 'unknown')}")

    def test_commission_stats(self):
        """Test commission statistics endpoint"""
        print("\n📊 Testing Commission Statistics...")
        
        if not self.tenant_token:
            self.log_test("Commission Stats Test Setup", False, "No token")
            return False
            
        success, response, status = self.make_request('GET', 'commission-stats', token=self.tenant_token)
        self.log_test("Get Commission Statistics", success and 'commission_rate' in response)
        
        if success:
            print(f"   Total Payments: {response.get('total_payments', 0)}")
            print(f"   Total Commission Collected: {response.get('total_commission_collected', 0)}")
            print(f"   Total Owner Payments: {response.get('total_owner_payments', 0)}")
            print(f"   Payment Count: {response.get('payment_count', 0)}")
            print(f"   Commission Rate: {response.get('commission_rate', 'unknown')}")
            
            # Verify commission rate is 40%
            commission_rate_correct = response.get('commission_rate') == '40%'
            self.log_test("Commission Rate Verification (40%)", commission_rate_correct)

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
            # NEW PAYMENT SYSTEM TESTS
            self.test_payment_initialization,
            self.test_payment_completion,
            self.test_payment_history,
            self.test_commission_stats
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
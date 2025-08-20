from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta, timezone
import jwt
from passlib.context import CryptContext
from passlib.hash import bcrypt
import re
import shutil
import aiofiles
from PIL import Image
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create uploads directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
IMAGES_DIR = UPLOAD_DIR / "images"
IMAGES_DIR.mkdir(exist_ok=True)

# Create the main app without a prefix
app = FastAPI(title="Evim Kirada API", description="Türkiye'nin Akıllı Kiralama Platformu")

# Serve static files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Utility functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def optimize_image(image_path: Path, max_width: int = 1200, quality: int = 85):
    """Optimize uploaded image"""
    try:
        with Image.open(image_path) as img:
            # Convert to RGB if necessary
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            
            # Resize if too large
            if img.width > max_width:
                ratio = max_width / img.width
                new_height = int(img.height * ratio)
                img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
            
            # Save optimized image
            img.save(image_path, 'JPEG', quality=quality, optimize=True)
    except Exception as e:
        logging.error(f"Image optimization failed: {str(e)}")

# Models
class UserRole:
    OWNER = "owner"  # Ev sahibi
    TENANT = "tenant"  # Kiracı
    ADMIN = "admin"

class UserProfile(BaseModel):
    phone: Optional[str] = None
    tc_no: Optional[str] = None
    address: Optional[str] = None
    profession: Optional[str] = None
    income: Optional[float] = None
    is_kyc_verified: bool = False
    kyc_documents: List[str] = Field(default_factory=list)

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    role: str = UserRole.TENANT
    is_active: bool = True
    profile: UserProfile = Field(default_factory=UserProfile)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = UserRole.TENANT
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class PropertyType:
    APARTMENT = "apartment"
    HOUSE = "house"
    STUDIO = "studio"
    VILLA = "villa"

class PropertyStatus:
    DRAFT = "draft"
    ACTIVE = "active"
    RENTED = "rented"
    INACTIVE = "inactive"

class Property(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    owner_id: str
    title: str
    description: str
    property_type: str = PropertyType.APARTMENT
    address: str
    district: str
    city: str = "İstanbul"
    price: float  # Aylık kira
    deposit: float  # Depozito
    area: int  # m2
    rooms: str  # "2+1", "3+1" etc
    floor: Optional[int] = None
    heating: Optional[str] = None
    furnished: bool = False
    pets_allowed: bool = False
    images: List[str] = Field(default_factory=list)
    amenities: List[str] = Field(default_factory=list)
    status: str = PropertyStatus.DRAFT
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PropertyCreate(BaseModel):
    title: str
    description: str
    property_type: str = PropertyType.APARTMENT
    address: str
    district: str
    city: str = "İstanbul"
    price: float
    deposit: float
    area: int
    rooms: str
    floor: Optional[int] = None
    heating: Optional[str] = None
    furnished: bool = False
    pets_allowed: bool = False
    amenities: List[str] = Field(default_factory=list)

class ApplicationStatus:
    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    KYC_REQUIRED = "kyc_required"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"

class Application(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    property_id: str
    tenant_id: str
    owner_id: str
    status: str = ApplicationStatus.PENDING
    message: str
    proposed_rent: Optional[float] = None
    move_in_date: datetime
    kyc_score: Optional[int] = None
    kyc_notes: Optional[str] = None
    admin_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ApplicationCreate(BaseModel):
    property_id: str
    message: str
    proposed_rent: Optional[float] = None
    move_in_date: datetime

class Payment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    user_id: str
    total_amount: float
    commission_amount: float
    owner_amount: float
    commission_rate: float
    status: str  # initialized, completed, failed
    payment_token: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

# Authentication dependency
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise credentials_exception
    return User(**user)

# Auth endpoints
@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate password
    if len(user_data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Create user
    user_dict = user_data.dict(exclude={'password'})
    user = User(**user_dict)
    
    # Hash password and store separately
    hashed_password = get_password_hash(user_data.password)
    user_doc = user.dict()
    user_doc['password_hash'] = hashed_password
    
    await db.users.insert_one(user_doc)
    return user

@api_router.post("/auth/login", response_model=Token)
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email})
    if not user or not verify_password(login_data.password, user['password_hash']):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    if not user['is_active']:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    # Create tokens
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_token(
        data={"sub": user['id'], "email": user['email'], "role": user['role']}, 
        expires_delta=access_token_expires
    )
    
    refresh_token_expires = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    refresh_token = create_token(
        data={"sub": user['id'], "type": "refresh"}, 
        expires_delta=refresh_token_expires
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

# Property endpoints
@api_router.post("/properties", response_model=Property)
async def create_property(property_data: PropertyCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Only owners can create properties")
    
    property_dict = property_data.dict()
    property_dict['owner_id'] = current_user.id
    property_obj = Property(**property_dict)
    
    await db.properties.insert_one(property_obj.dict())
    return property_obj

@api_router.get("/properties", response_model=List[Property])
async def list_properties(
    city: Optional[str] = None,
    district: Optional[str] = None,
    property_type: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    rooms: Optional[str] = None,
    furnished: Optional[bool] = None,
    skip: int = 0,
    limit: int = 20
):
    # Build filter
    filter_dict = {"status": PropertyStatus.ACTIVE}
    if city:
        filter_dict["city"] = city
    if district:
        filter_dict["district"] = district
    if property_type:
        filter_dict["property_type"] = property_type
    if min_price is not None:
        filter_dict["price"] = {"$gte": min_price}
    if max_price is not None:
        if "price" in filter_dict:
            filter_dict["price"]["$lte"] = max_price
        else:
            filter_dict["price"] = {"$lte": max_price}
    if rooms:
        filter_dict["rooms"] = rooms
    if furnished is not None:
        filter_dict["furnished"] = furnished
    
    properties = await db.properties.find(filter_dict).skip(skip).limit(limit).to_list(length=None)
    return [Property(**prop) for prop in properties]

@api_router.get("/properties/{property_id}", response_model=Property)
async def get_property(property_id: str):
    property_doc = await db.properties.find_one({"id": property_id})
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    return Property(**property_doc)

@api_router.get("/my-properties", response_model=List[Property])
async def get_my_properties(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Only owners can view their properties")
    
    properties = await db.properties.find({"owner_id": current_user.id}).to_list(length=None)
    return [Property(**prop) for prop in properties]

@api_router.put("/properties/{property_id}/status")
async def update_property_status(
    property_id: str, 
    status: str, 
    current_user: User = Depends(get_current_user)
):
    property_doc = await db.properties.find_one({"id": property_id})
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    
    if property_doc['owner_id'] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    valid_statuses = [PropertyStatus.DRAFT, PropertyStatus.ACTIVE, PropertyStatus.RENTED, PropertyStatus.INACTIVE]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    await db.properties.update_one(
        {"id": property_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"message": "Status updated successfully"}

# Application endpoints
@api_router.post("/applications", response_model=Application)
async def create_application(app_data: ApplicationCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.TENANT:
        raise HTTPException(status_code=403, detail="Only tenants can apply")
    
    # Check if property exists and is active
    property_doc = await db.properties.find_one({"id": app_data.property_id})
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    
    if property_doc['status'] != PropertyStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Property is not available for rent")
    
    # Check if user already applied
    existing_app = await db.applications.find_one({
        "property_id": app_data.property_id,
        "tenant_id": current_user.id
    })
    if existing_app:
        raise HTTPException(status_code=400, detail="You have already applied for this property")
    
    app_dict = app_data.dict()
    app_dict['tenant_id'] = current_user.id
    app_dict['owner_id'] = property_doc['owner_id']
    
    application = Application(**app_dict)
    await db.applications.insert_one(application.dict())
    
    return application

@api_router.get("/applications", response_model=List[Application])
async def get_applications(current_user: User = Depends(get_current_user)):
    if current_user.role == UserRole.TENANT:
        applications = await db.applications.find({"tenant_id": current_user.id}).to_list(length=None)
    elif current_user.role == UserRole.OWNER:
        applications = await db.applications.find({"owner_id": current_user.id}).to_list(length=None)
    else:
        applications = await db.applications.find({}).to_list(length=None)
    
    return [Application(**app) for app in applications]

# Ödeme Endpoints
@api_router.post("/payment/initialize")
async def initialize_payment(
    booking_id: str,
    user_ip: str = "127.0.0.1",
    current_user: User = Depends(get_current_user)
):
    """PayTR ile ödeme başlatma (SANDBOX)"""
    try:
        # Bookingı bul
        booking = await db.bookings.find_one({"id": booking_id})
        if not booking or booking['tenant_id'] != current_user.id:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        # Property bilgilerini al
        property_doc = await db.properties.find_one({"id": booking['property_id']})
        if not property_doc:
            raise HTTPException(status_code=404, detail="Property not found")
        
        # %40 komisyon hesapla
        total_amount = float(booking.get('proposed_rent', property_doc['price']))
        commission_rate = 40.0  # %40 komisyon
        commission_amount = total_amount * (commission_rate / 100)
        owner_amount = total_amount - commission_amount
        
        # Mock PayTR token oluştur (gerçek entegrasyonda PayTR API'si kullanılacak)
        payment_token = f"mock_token_{booking_id}_{int(datetime.now(timezone.utc).timestamp())}"
        payment_url = f"https://mock-paytr.com/payment/{payment_token}"
        
        # Payment kaydı oluştur
        payment_data = {
            "id": str(uuid.uuid4()),
            "booking_id": booking_id,
            "user_id": current_user.id,
            "total_amount": total_amount,
            "commission_amount": commission_amount,
            "owner_amount": owner_amount,
            "commission_rate": commission_rate,
            "status": "initialized",
            "payment_token": payment_token,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.payments.insert_one(payment_data)
        
        return {
            "status": "success",
            "payment_token": payment_token,
            "payment_url": payment_url,
            "total_amount": total_amount,
            "commission_breakdown": {
                "total": total_amount,
                "platform_commission": commission_amount,
                "owner_amount": owner_amount,
                "commission_rate": f"{commission_rate}%"
            },
            "booking_id": booking_id
        }
        
    except Exception as e:
        logger.error(f"Payment initialization failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Payment initialization failed")

@api_router.post("/payment/complete")
async def complete_payment(
    payment_token: str,
    status: str = "success"  # Mock için, gerçekte PayTR callback'ten gelir
):
    """Mock payment completion (gerçekte PayTR webhook olacak)"""
    try:
        # Payment kaydını bul
        payment = await db.payments.find_one({"payment_token": payment_token})
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        if status == "success":
            # Payment başarılı - booking'i onayla
            await db.payments.update_one(
                {"payment_token": payment_token},
                {
                    "$set": {
                        "status": "completed",
                        "completed_at": datetime.now(timezone.utc),
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
            
            # Booking statusunu güncelle
            await db.applications.update_one(
                {"id": payment["booking_id"]},
                {
                    "$set": {
                        "status": "payment_completed",
                        "payment_completed_at": datetime.now(timezone.utc),
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
            
            # Property statusunu rented yap
            booking = await db.bookings.find_one({"id": payment["booking_id"]})
            if booking:
                await db.properties.update_one(
                    {"id": booking["property_id"]},
                    {"$set": {"status": PropertyStatus.RENTED, "updated_at": datetime.now(timezone.utc)}}
                )
            
            return {
                "status": "success",
                "message": "Payment completed successfully",
                "commission_processed": {
                    "platform_commission": payment["commission_amount"],
                    "owner_payment": payment["owner_amount"],
                    "note": "In production, owner payment would be transferred to their account"
                }
            }
        else:
            # Payment başarısız
            await db.payments.update_one(
                {"payment_token": payment_token},
                {
                    "$set": {
                        "status": "failed",
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
            
            return {
                "status": "failed",
                "message": "Payment failed"
            }
            
    except Exception as e:
        logger.error(f"Payment completion failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Payment completion failed")

@api_router.get("/payments")
async def get_payments(current_user: User = Depends(get_current_user)):
    """Kullanıcının ödeme geçmişi"""
    try:
        payments = await db.payments.find({"user_id": current_user.id}).sort("created_at", -1).to_list(length=20)
        return [Payment(**payment) for payment in payments]
    except Exception as e:
        logger.error(f"Get payments failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch payments")

@api_router.get("/commission-stats")
async def get_commission_stats(current_user: User = Depends(get_current_user)):
    """Komisyon istatistikleri (admin/property owner için)"""
    try:
        # Toplam komisyon hesapla
        pipeline = [
            {"$match": {"status": "completed"}},
            {"$group": {
                "_id": None,
                "total_payments": {"$sum": "$total_amount"},
                "total_commission": {"$sum": "$commission_amount"},
                "total_owner_payments": {"$sum": "$owner_amount"},
                "payment_count": {"$sum": 1}
            }}
        ]
        
        stats = await db.payments.aggregate(pipeline).to_list(1)
        if stats:
            stat = stats[0]
            return {
                "total_payments": stat.get("total_payments", 0),
                "total_commission_collected": stat.get("total_commission", 0),
                "total_owner_payments": stat.get("total_owner_payments", 0),
                "payment_count": stat.get("payment_count", 0),
                "commission_rate": "40%"
            }
        else:
            return {
                "total_payments": 0,
                "total_commission_collected": 0,
                "total_owner_payments": 0,
                "payment_count": 0,
                "commission_rate": "40%"
            }
            
    except Exception as e:
        logger.error(f"Get commission stats failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch commission stats")

# Health check
@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc)}

@api_router.get("/")
async def root():
    return {"message": "Evim Kirada API v1.0", "status": "running"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
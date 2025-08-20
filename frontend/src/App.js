import React, { useState, useEffect, createContext, useContext } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import axios from "axios";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Label } from "./components/ui/label";
import { Textarea } from "./components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Search, Home, User, Plus, MapPin, DollarSign, Bed, Square, Calendar, Phone, Mail, Upload, Trash2, Settings, BarChart3 } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      setToken(access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      await fetchCurrentUser();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Login failed' };
    }
  };

  const register = async (userData) => {
    try {
      await axios.post(`${API}/auth/register`, userData);
      return await login(userData.email, userData.password);
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Registration failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Navigation Component
const Navigation = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="border-b border-gray-200 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2 text-indigo-600 font-bold text-xl">
              <Home className="h-6 w-6" />
              <span>Evim Kirada</span>
            </Link>
            <div className="hidden md:flex space-x-6">
              <Link to="/properties" className="text-gray-700 hover:text-indigo-600 transition-colors">
                İlanlar
              </Link>
              {user?.role === 'owner' && (
                <>
                  <Link to="/my-properties" className="text-gray-700 hover:text-indigo-600 transition-colors">
                    İlanlarım
                  </Link>
                  <Link to="/create-property" className="text-gray-700 hover:text-indigo-600 transition-colors">
                    <Plus className="inline h-4 w-4 mr-1" />
                    İlan Ver
                  </Link>
                </>
              )}
              {user?.role === 'admin' && (
                <Link to="/admin" className="text-gray-700 hover:text-indigo-600 transition-colors">
                  <Settings className="inline h-4 w-4 mr-1" />
                  Admin
                </Link>
              )}
              {user?.role === 'tenant' && (
                <Link to="/applications" className="text-gray-700 hover:text-indigo-600 transition-colors">
                  Başvurularım
                </Link>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-sm text-gray-700">Merhaba, {user.full_name}</span>
                <Badge variant={user.role === 'owner' ? 'default' : 'secondary'}>
                  {user.role === 'owner' ? 'Ev Sahibi' : 'Kiracı'}
                </Badge>
                <Button variant="outline" onClick={logout}>Çıkış</Button>
              </>
            ) : (
              <Link to="/login">
                <Button>Giriş Yap</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

// Login/Register Page
const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'tenant',
    phone: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = isLogin 
      ? await login(formData.email, formData.password)
      : await register(formData);

    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-indigo-600">
            {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
          </CardTitle>
          <CardDescription>
            {isLogin ? 'Hesabınıza giriş yapın' : 'Yeni hesap oluşturun'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <Label htmlFor="full_name">Ad Soyad</Label>
                  <Input
                    id="full_name"
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="role">Hesap Türü</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tenant">Kiracı</SelectItem>
                      <SelectItem value="owner">Ev Sahibi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            
            <div>
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'İşlem yapılıyor...' : (isLogin ? 'Giriş Yap' : 'Kayıt Ol')}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="text-center">
          <p className="text-sm text-gray-600">
            {isLogin ? "Hesabınız yok mu? " : "Zaten hesabınız var mı? "}
            <button
              type="button"
              className="text-indigo-600 hover:underline"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
            >
              {isLogin ? 'Kayıt ol' : 'Giriş yap'}
            </button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

// Home Page
const HomePage = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Türkiye'nin <span className="text-yellow-300">Akıllı</span> Kiralama Platformu
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-indigo-100">
            Güvenli, hızlı ve kolay kiralama deneyimi
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/properties">
              <Button size="lg" variant="secondary" className="min-w-48">
                <Search className="mr-2 h-5 w-5" />
                İlan Ara
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="min-w-48 border-white text-white hover:bg-white hover:text-indigo-600">
                <Plus className="mr-2 h-5 w-5" />
                İlan Ver
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Neden Evim Kirada?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <User className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Kimlik Doğrulama</h3>
                <p className="text-gray-600">
                  Tüm kullanıcılarımız kimlik doğrulamasından geçer, güvenli kiralama sağlarız
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Adil Komisyon</h3>
                <p className="text-gray-600">
                  Sadece ilk ay %40 komisyon, sonraki aylar komisyonsuz
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Home className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Kolay Süreç</h3>
                <p className="text-gray-600">
                  Online başvuru, otomatik sözleşme, hızlı kiralama süreci
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

// Properties List Page
const PropertiesPage = () => {
  const [properties, setProperties] = useState([]);
  const [filters, setFilters] = useState({
    city: '',
    district: '',
    property_type: '',
    min_price: '',
    max_price: '',
    rooms: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProperties();
  }, [filters]);

  const fetchProperties = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "all") params.append(key, value);
      });
      
      const response = await axios.get(`${API}/properties?${params}`);
      setProperties(response.data);
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Kiralık İlanlar</h1>
        
        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <Label htmlFor="city">Şehir</Label>
                <Input
                  id="city"
                  placeholder="İstanbul"
                  value={filters.city}
                  onChange={(e) => setFilters({...filters, city: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="district">İlçe</Label>
                <Input
                  id="district"
                  placeholder="Kadıköy"
                  value={filters.district}
                  onChange={(e) => setFilters({...filters, district: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="rooms">Oda Sayısı</Label>
                <Select value={filters.rooms} onValueChange={(value) => setFilters({...filters, rooms: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    <SelectItem value="1+0">1+0</SelectItem>
                    <SelectItem value="1+1">1+1</SelectItem>
                    <SelectItem value="2+1">2+1</SelectItem>
                    <SelectItem value="3+1">3+1</SelectItem>
                    <SelectItem value="4+1">4+1</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="min_price">Min Fiyat</Label>
                <Input
                  id="min_price"
                  type="number"
                  placeholder="5000"
                  value={filters.min_price}
                  onChange={(e) => setFilters({...filters, min_price: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="max_price">Max Fiyat</Label>
                <Input
                  id="max_price"
                  type="number"
                  placeholder="15000"
                  value={filters.max_price}
                  onChange={(e) => setFilters({...filters, max_price: e.target.value})}
                />
              </div>
              
              <div className="flex items-end">
                <Button onClick={fetchProperties} className="w-full">
                  <Search className="mr-2 h-4 w-4" />
                  Ara
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Properties Grid */}
        {loading ? (
          <div className="text-center py-12">Yükleniyor...</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Property Card Component
const PropertyCard = ({ property }) => {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-video bg-gray-200 relative">
        {property.images && property.images[0] ? (
          <img
            src={property.images[0]}
            alt={property.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Home className="h-12 w-12 text-gray-400" />
          </div>
        )}
        <Badge className="absolute top-2 left-2">
          {property.property_type === 'apartment' ? 'Daire' : 
           property.property_type === 'house' ? 'Ev' : 
           property.property_type === 'studio' ? 'Stüdyo' : 'Villa'}
        </Badge>
      </div>
      
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-2">{property.title}</h3>
        <div className="flex items-center text-gray-600 mb-2">
          <MapPin className="h-4 w-4 mr-1" />
          <span className="text-sm">{property.district}, {property.city}</span>
        </div>
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center">
              <Bed className="h-4 w-4 mr-1" />
              <span>{property.rooms}</span>
            </div>
            <div className="flex items-center">
              <Square className="h-4 w-4 mr-1" />
              <span>{property.area}m²</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold text-indigo-600 flex items-center">
            <DollarSign className="h-5 w-5 mr-1" />
            {property.price.toLocaleString('tr-TR')} ₺
          </div>
          <Link to={`/property/${property.id}`}>
            <Button size="sm">Detay</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

// Property Detail Page
const PropertyDetailPage = ({ propertyId }) => {
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchProperty();
  }, [propertyId]);

  const fetchProperty = async () => {
    try {
      const response = await axios.get(`${API}/properties/${propertyId}`);
      setProperty(response.data);
    } catch (error) {
      console.error('Failed to fetch property:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>;
  }

  if (!property) {
    return <div className="min-h-screen flex items-center justify-center">İlan bulunamadı</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-0">
                <div className="aspect-video bg-gray-200 rounded-t-lg">
                  {property.images && property.images[0] ? (
                    <img
                      src={property.images[0]}
                      alt={property.title}
                      className="w-full h-full object-cover rounded-t-lg"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Home className="h-24 w-24 text-gray-400" />
                    </div>
                  )}
                </div>
                
                <div className="p-6">
                  <h1 className="text-3xl font-bold mb-4">{property.title}</h1>
                  
                  <div className="flex items-center text-gray-600 mb-4">
                    <MapPin className="h-5 w-5 mr-2" />
                    <span>{property.address}, {property.district}, {property.city}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <Bed className="h-6 w-6 mx-auto mb-2 text-gray-600" />
                      <div className="font-semibold">{property.rooms}</div>
                      <div className="text-sm text-gray-600">Oda</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <Square className="h-6 w-6 mx-auto mb-2 text-gray-600" />
                      <div className="font-semibold">{property.area}m²</div>
                      <div className="text-sm text-gray-600">Alan</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <DollarSign className="h-6 w-6 mx-auto mb-2 text-gray-600" />
                      <div className="font-semibold">{property.price.toLocaleString('tr-TR')} ₺</div>
                      <div className="text-sm text-gray-600">Aylık</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <DollarSign className="h-6 w-6 mx-auto mb-2 text-gray-600" />
                      <div className="font-semibold">{property.deposit.toLocaleString('tr-TR')} ₺</div>
                      <div className="text-sm text-gray-600">Depozito</div>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold mb-3">Açıklama</h3>
                    <p className="text-gray-700">{property.description}</p>
                  </div>
                  
                  {property.amenities && property.amenities.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold mb-3">Özellikler</h3>
                      <div className="flex flex-wrap gap-2">
                        {property.amenities.map((amenity, index) => (
                          <Badge key={index} variant="secondary">{amenity}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Başvuru Yap</CardTitle>
              </CardHeader>
              <CardContent>
                {user && user.role === 'tenant' ? (
                  <ApplicationForm propertyId={property.id} />
                ) : (
                  <div className="text-center">
                    <p className="mb-4">Başvuru yapmak için kiracı olarak giriş yapmanız gerekir.</p>
                    <Link to="/login">
                      <Button className="w-full">Giriş Yap</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

// Application Form Component
const ApplicationForm = ({ propertyId }) => {
  const [formData, setFormData] = useState({
    message: '',
    move_in_date: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/applications`, {
        ...formData,
        property_id: propertyId,
        move_in_date: new Date(formData.move_in_date).toISOString()
      });
      setSuccess(true);
    } catch (error) {
      console.error('Failed to submit application:', error);
      alert('Başvuru gönderilemedi: ' + (error.response?.data?.detail || 'Bir hata oluştu'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="text-green-600 mb-4">✓</div>
        <h3 className="text-lg font-semibold mb-2">Başvuru Gönderildi</h3>
        <p className="text-gray-600 mb-4">Başvurunuz ev sahibine iletildi. En kısa sürede size dönüş yapılacaktır.</p>
        <Link to="/applications">
          <Button variant="outline">Başvurularımı Görüntüle</Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="move_in_date">Taşınma Tarihi</Label>
        <Input
          id="move_in_date"
          type="date"
          value={formData.move_in_date}
          onChange={(e) => setFormData({...formData, move_in_date: e.target.value})}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="message">Mesajınız</Label>
        <Textarea
          id="message"
          placeholder="Kendinizle ilgili kısa bilgi verin..."
          rows={4}
          value={formData.message}
          onChange={(e) => setFormData({...formData, message: e.target.value})}
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Gönderiliyor...' : 'Başvuru Gönder'}
      </Button>
    </form>
  );
};

// Applications Page
const ApplicationsPage = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await axios.get(`${API}/applications`);
      setApplications(response.data);
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKYC = async (applicationId) => {
    try {
      const response = await axios.put(`${API}/applications/${applicationId}/kyc`);
      alert(`KYC Tamamlandı: ${response.data.notes}`);
      fetchApplications(); // Refresh the list
    } catch (error) {
      console.error('KYC failed:', error);
      alert('KYC işlemi başarısız: ' + (error.response?.data?.detail || 'Bir hata oluştu'));
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          {user?.role === 'tenant' ? 'Başvurularım' : 'Gelen Başvurular'}
        </h1>
        
        <div className="space-y-4">
          {applications.map((application) => (
            <Card key={application.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant={
                        application.status === 'approved' ? 'default' :
                        application.status === 'rejected' ? 'destructive' :
                        application.status === 'pending' ? 'secondary' : 'outline'
                      }>
                        {application.status === 'pending' ? 'Beklemede' :
                         application.status === 'under_review' ? 'İnceleniyor' :
                         application.status === 'kyc_required' ? 'KYC Gerekli' :
                         application.status === 'approved' ? 'Onaylandı' :
                         application.status === 'rejected' ? 'Reddedildi' : 'İptal'}
                      </Badge>
                      {application.kyc_score && (
                        <Badge variant="outline">
                          KYC Skoru: {application.kyc_score}/100
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-gray-600 mb-2">{application.message}</p>
                    
                    <div className="text-sm text-gray-500">
                      Başvuru Tarihi: {new Date(application.created_at).toLocaleDateString('tr-TR')}
                    </div>
                    
                    {application.kyc_notes && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-700">KYC Notları:</div>
                        <div className="text-sm text-gray-600">{application.kyc_notes}</div>
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-4">
                    {user?.role === 'tenant' && application.status === 'pending' && (
                      <Button onClick={() => handleKYC(application.id)}>
                        KYC Başlat
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {applications.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600">Henüz başvuru bulunmuyor.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children, roles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    return <div className="min-h-screen flex items-center justify-center">Bu sayfaya erişim yetkiniz yok.</div>;
  }

  return children;
};

// Main App Component
function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Navigation />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/properties" element={<PropertiesPage />} />
            <Route 
              path="/property/:id" 
              element={<PropertyDetailPage propertyId={window.location.pathname.split('/').pop()} />} 
            />
            <Route
              path="/applications"
              element={
                <ProtectedRoute>
                  <ApplicationsPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
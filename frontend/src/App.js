import React, { useState, useEffect, createContext, useContext } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate, Link, useParams } from "react-router-dom";
import axios from "axios";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Label } from "./components/ui/label";
import { Textarea } from "./components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Search, Home, User, Plus, MapPin, DollarSign, Bed, Square, Calendar, Phone, Mail, Upload, Trash2, Settings, BarChart3, Users, Building, Eye } from "lucide-react";

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

// Property Detail Page
const PropertyDetailPage = () => {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchProperty();
  }, [id]);

  const fetchProperty = async () => {
    try {
      const response = await axios.get(`${API}/properties/${id}`);
      setProperty(response.data);
    } catch (error) {
      console.error('Failed to fetch property:', error);
    } finally {
      setLoading(false);
    }
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

// Simple Image Upload Component
const ImageUpload = ({ onImagesUploaded, existingImages = [] }) => {
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState(existingImages);

  const handleFileUpload = async (files) => {
    setUploading(true);
    try {
      const formData = new FormData();
      for (let file of files) {
        formData.append('files', file);
      }

      const response = await axios.post(`${API}/upload/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const newImages = response.data.files.map(file => file.url);
      const updatedImages = [...images, ...newImages];
      setImages(updatedImages);
      onImagesUploaded(updatedImages);

    } catch (error) {
      console.error('Upload failed:', error);
      alert('Görsel yükleme başarısız: ' + (error.response?.data?.detail || 'Bir hata oluştu'));
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (indexToRemove) => {
    const updatedImages = images.filter((_, index) => index !== indexToRemove);
    setImages(updatedImages);
    onImagesUploaded(updatedImages);
  };

  return (
    <div className="space-y-4">
      <Label>Görsel Yükle</Label>
      
      {/* Upload Area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => handleFileUpload(Array.from(e.target.files))}
          className="hidden"
          id="image-upload"
          disabled={uploading}
        />
        <label htmlFor="image-upload" className="cursor-pointer">
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-900">
            {uploading ? 'Yükleniyor...' : 'Görselleri seçin'}
          </p>
          <p className="text-sm text-gray-500">
            PNG, JPG, WebP dosyaları (Maks. 5MB)
          </p>
        </label>
      </div>

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <img
                src={`${BACKEND_URL}${image}`}
                alt={`Property ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg"
              />
              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removeImage(index)}
                  className="text-white"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Create Property Page
const CreateProperty = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    property_type: 'apartment',
    address: '',
    district: '',
    city: 'İstanbul',
    price: '',
    deposit: '',
    area: '',
    rooms: '2+1',
    floor: '',
    heating: '',
    furnished: false,
    pets_allowed: false,
    amenities: []
  });
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  if (user?.role !== 'owner') {
    return <div className="min-h-screen flex items-center justify-center">Bu sayfaya erişim yetkiniz yok.</div>;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create property
      const propertyResponse = await axios.post(`${API}/properties`, formData);
      const propertyId = propertyResponse.data.id;

      // Update property images if any
      if (images.length > 0) {
        const formDataImages = new FormData();
        images.forEach(imageUrl => {
          formDataImages.append('image_urls', imageUrl);
        });

        await axios.put(`${API}/properties/${propertyId}/images`, formDataImages);
      }

      alert('İlan başarıyla oluşturuldu!');
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        property_type: 'apartment',
        address: '',
        district: '',
        city: 'İstanbul',
        price: '',
        deposit: '',
        area: '',
        rooms: '2+1',
        floor: '',
        heating: '',
        furnished: false,
        pets_allowed: false,
        amenities: []
      });
      setImages([]);

    } catch (error) {
      console.error('Property creation failed:', error);
      alert('İlan oluşturma başarısız: ' + (error.response?.data?.detail || 'Bir hata oluştu'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plus className="mr-2 h-6 w-6" />
              Yeni İlan Oluştur
            </CardTitle>
            <CardDescription>Kiralık gayrimenkul ilanınızı oluşturun</CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Image Upload */}
              <ImageUpload onImagesUploaded={setImages} />
              
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">İlan Başlığı</Label>
                  <Input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Örn: Kadıköy'de 2+1 Kiralık Daire"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="property_type">Gayrimenkul Türü</Label>
                  <Select value={formData.property_type} onValueChange={(value) => setFormData({...formData, property_type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apartment">Daire</SelectItem>
                      <SelectItem value="house">Ev</SelectItem>
                      <SelectItem value="studio">Stüdyo</SelectItem>
                      <SelectItem value="villa">Villa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Açıklama</Label>
                <Textarea
                  id="description"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Gayrimenkulünüzü detaylı şekilde tanıtın..."
                  required
                />
              </div>

              {/* Location */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">Şehir</Label>
                  <Input
                    id="city"
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="district">İlçe</Label>
                  <Input
                    id="district"
                    type="text"
                    value={formData.district}
                    onChange={(e) => setFormData({...formData, district: e.target.value})}
                    placeholder="Örn: Kadıköy"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="address">Adres</Label>
                  <Input
                    id="address"
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Sokak ve mahalle bilgisi"
                    required
                  />
                </div>
              </div>

              {/* Property Details */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="rooms">Oda Sayısı</Label>
                  <Select value={formData.rooms} onValueChange={(value) => setFormData({...formData, rooms: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1+0">1+0</SelectItem>
                      <SelectItem value="1+1">1+1</SelectItem>
                      <SelectItem value="2+1">2+1</SelectItem>
                      <SelectItem value="3+1">3+1</SelectItem>
                      <SelectItem value="4+1">4+1</SelectItem>
                      <SelectItem value="5+1">5+1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="area">Alan (m²)</Label>
                  <Input
                    id="area"
                    type="number"
                    value={formData.area}
                    onChange={(e) => setFormData({...formData, area: parseInt(e.target.value)})}
                    placeholder="120"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="floor">Kat</Label>
                  <Input
                    id="floor"
                    type="number"
                    value={formData.floor}
                    onChange={(e) => setFormData({...formData, floor: parseInt(e.target.value)})}
                    placeholder="3"
                  />
                </div>
                
                <div>
                  <Label htmlFor="heating">Isıtma</Label>
                  <Input
                    id="heating"
                    type="text"
                    placeholder="Doğalgaz, Kombi, vb."
                    value={formData.heating}
                    onChange={(e) => setFormData({...formData, heating: e.target.value})}
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Aylık Kira (₺)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                    placeholder="12000"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="deposit">Depozito (₺)</Label>
                  <Input
                    id="deposit"
                    type="number"
                    value={formData.deposit}
                    onChange={(e) => setFormData({...formData, deposit: parseFloat(e.target.value)})}
                    placeholder="12000"
                    required
                  />
                </div>
              </div>

              {/* Options */}
              <div className="flex space-x-6">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="furnished"
                    checked={formData.furnished}
                    onChange={(e) => setFormData({...formData, furnished: e.target.checked})}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="furnished">Eşyalı</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="pets_allowed"
                    checked={formData.pets_allowed}
                    onChange={(e) => setFormData({...formData, pets_allowed: e.target.checked})}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="pets_allowed">Pet Dostu</Label>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Oluşturuluyor...' : 'İlanı Oluştur'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Admin Panel Component
const AdminPanel = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchAdminData();
    }
  }, [user]);

  const fetchAdminData = async () => {
    try {
      const [statsRes, usersRes, propertiesRes, applicationsRes] = await Promise.all([
        axios.get(`${API}/admin/stats`),
        axios.get(`${API}/admin/users`),
        axios.get(`${API}/admin/properties`),
        axios.get(`${API}/admin/applications`)
      ]);

      setStats(statsRes.data);
      setUsers(usersRes.data);
      setProperties(propertiesRes.data);
      setApplications(applicationsRes.data);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'admin') {
    return <div className="min-h-screen flex items-center justify-center">Bu sayfaya erişim yetkiniz yok.</div>;
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Settings className="mr-3 h-8 w-8" />
            Admin Panel
          </h1>
          <p className="text-gray-600">Platform yönetimi ve istatistikleri</p>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Toplam Kullanıcı</p>
                    <p className="text-2xl font-bold">{stats.platform_stats?.total_users || 0}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Toplam İlan</p>
                    <p className="text-2xl font-bold">{stats.platform_stats?.total_properties || 0}</p>
                  </div>
                  <Building className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Aktif İlan</p>
                    <p className="text-2xl font-bold">{stats.platform_stats?.active_properties || 0}</p>
                  </div>
                  <Eye className="h-8 w-8 text-indigo-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Tamamlanan Ödeme</p>
                    <p className="text-2xl font-bold">{stats.platform_stats?.completed_payments || 0}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Platform Geliri</p>
                    <p className="text-2xl font-bold">₺{stats.revenue_stats?.total_platform_revenue?.toLocaleString('tr-TR') || '0'}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
            <TabsTrigger value="users">Kullanıcılar ({users.length})</TabsTrigger>
            <TabsTrigger value="properties">İlanlar ({properties.length})</TabsTrigger>
            <TabsTrigger value="applications">Başvurular ({applications.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Platform Performansı</CardTitle>
                <CardDescription>Genel platform istatistikleri ve gelir raporu</CardDescription>
              </CardHeader>
              <CardContent>
                {stats && (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold mb-4">Gelir Özeti</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-3xl font-bold text-indigo-600">
                            ₺{stats.revenue_stats?.total_platform_revenue?.toLocaleString('tr-TR') || '0'}
                          </p>
                          <p className="text-sm text-gray-600">Toplam Platform Komisyonu</p>
                        </div>
                        <div>
                          <p className="text-3xl font-bold text-purple-600">
                            ₺{stats.revenue_stats?.total_processed_amount?.toLocaleString('tr-TR') || '0'}
                          </p>
                          <p className="text-sm text-gray-600">İşlenen Toplam Tutar</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-blue-800 mb-2">Komisyon Oranı</h4>
                        <p className="text-2xl font-bold text-blue-600">{stats.revenue_stats?.commission_rate || '40%'}</p>
                        <p className="text-blue-700 text-sm">Sadece ilk ay kirasından</p>
                      </div>
                      
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-green-800 mb-2">Ortalama İşlem</h4>
                        <p className="text-2xl font-bold text-green-600">
                          ₺{stats.platform_stats?.completed_payments ? 
                             Math.round(stats.revenue_stats?.total_processed_amount / stats.platform_stats?.completed_payments).toLocaleString('tr-TR') : 
                             '0'}
                        </p>
                        <p className="text-green-700 text-sm">Ödeme başına</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Kullanıcı Yönetimi</CardTitle>
                <CardDescription>Tüm platform kullanıcıları</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold">{user.full_name}</h3>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          <p className="text-sm text-gray-500">
                            Kayıt: {new Date(user.created_at).toLocaleDateString('tr-TR')}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={
                            user.role === 'owner' ? 'default' :
                            user.role === 'admin' ? 'destructive' : 'secondary'
                          }>
                            {user.role === 'owner' ? 'Ev Sahibi' :
                             user.role === 'admin' ? 'Admin' : 'Kiracı'}
                          </Badge>
                          <div className="mt-1">
                            <Badge variant={user.is_active ? 'outline' : 'destructive'}>
                              {user.is_active ? 'Aktif' : 'Pasif'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="properties">
            <Card>
              <CardHeader>
                <CardTitle>İlan Yönetimi</CardTitle>
                <CardDescription>Tüm platform ilanları</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {properties.map((property) => (
                    <Card key={property.id} className="overflow-hidden">
                      {property.images && property.images[0] && (
                        <div className="aspect-video bg-gray-200">
                          <img
                            src={`${BACKEND_URL}${property.images[0]}`}
                            alt={property.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-lg mb-2 line-clamp-1">{property.title}</h3>
                        <div className="flex items-center text-gray-600 mb-2">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span className="text-sm">{property.district}, {property.city}</span>
                        </div>
                        
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-lg font-bold text-indigo-600">
                            ₺{property.price.toLocaleString('tr-TR')}
                          </div>
                          <Badge variant={property.status === 'active' ? 'default' : 'secondary'}>
                            {property.status === 'active' ? 'Aktif' : 
                             property.status === 'rented' ? 'Kiralandı' : 
                             property.status === 'draft' ? 'Taslak' : 'Pasif'}
                          </Badge>
                        </div>
                        
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
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="applications">
            <Card>
              <CardHeader>
                <CardTitle>Başvuru Yönetimi</CardTitle>
                <CardDescription>Tüm kiracı başvuruları</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {applications.map((application) => (
                    <div key={application.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">Başvuru ID: {application.id.substring(0, 8)}</h3>
                          <p className="text-sm text-gray-600">
                            Tarih: {new Date(application.created_at).toLocaleDateString('tr-TR')}
                          </p>
                        </div>
                        <Badge variant={
                          application.status === 'approved' ? 'default' :
                          application.status === 'pending' ? 'secondary' : 'destructive'
                        }>
                          {application.status === 'pending' ? 'Beklemede' :
                           application.status === 'approved' ? 'Onaylandı' : 
                           application.status === 'rejected' ? 'Reddedildi' : application.status}
                        </Badge>
                      </div>
                      
                      <p className="text-gray-700 mb-2">{application.message}</p>
                      
                      {application.admin_notes && (
                        <p className="text-sm text-gray-500 bg-gray-50 p-2 rounded">
                          <strong>Admin Notu:</strong> {application.admin_notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
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

// Owner Dashboard Component - ENHANCED & PROFESSIONAL
const OwnerDashboard = () => {
  const [stats, setStats] = useState(null);
  const [properties, setProperties] = useState([]);
  const [applications, setApplications] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("overview");
  const { user } = useAuth();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [propertiesRes, applicationsRes, paymentsRes, commissionRes] = await Promise.all([
        axios.get(`${API}/my-properties`),
        axios.get(`${API}/applications`),
        axios.get(`${API}/payments`),
        axios.get(`${API}/commission-stats`)
      ]);

      setProperties(propertiesRes.data);
      setApplications(applicationsRes.data);
      setPayments(paymentsRes.data);
      setStats(commissionRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationAction = async (applicationId, action, notes = '') => {
    try {
      const params = new URLSearchParams();
      params.append('new_status', action);
      params.append('admin_notes', notes);
      
      await axios.put(`${API}/applications/${applicationId}/status?${params}`);
      await fetchDashboardData(); // Refresh data
      alert(`✅ Başvuru durumu "${action}" olarak güncellendi!`);
    } catch (error) {
      console.error('Failed to update application:', error);
      alert('İşlem başarısız: ' + (error.response?.data?.detail || 'Bir hata oluştu'));
    }
  };

  const handlePropertyStatusUpdate = async (propertyId, newStatus) => {
    try {
      const params = new URLSearchParams();
      params.append('status', newStatus);
      
      await axios.put(`${API}/properties/${propertyId}/status?${params}`);
      await fetchDashboardData(); // Refresh data
      alert(`✅ İlan durumu "${newStatus}" olarak güncellendi!`);
    } catch (error) {
      console.error('Failed to update property status:', error);
      alert('İşlem başarısız: ' + (error.response?.data?.detail || 'Bir hata oluştu'));
    }
  };

  if (user?.role !== 'owner') {
    return <div className="min-h-screen flex items-center justify-center">Bu sayfaya erişim yetkiniz yok.</div>;
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p>Dashboard yükleniyor...</p>
      </div>
    </div>;
  }

  const pendingApplications = applications.filter(a => a.status === 'pending');
  const activeProperties = properties.filter(p => p.status === 'active');
  const rentedProperties = properties.filter(p => p.status === 'rented');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center">
            <Building className="mr-4 h-10 w-10 text-indigo-600" />
            Ev Sahibi Dashboard
          </h1>
          <p className="text-gray-600 mt-2">Hoş geldiniz <strong>{user.full_name}</strong>, ilanlarınızı ve başvuruları yönetin</p>
        </div>

        {/* Stats Cards - Enhanced */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white overflow-hidden">
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Toplam İlan</p>
                  <p className="text-3xl font-bold">{properties.length}</p>
                </div>
                <Building className="h-12 w-12 text-blue-200" />
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-20">
                <Building className="h-20 w-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white overflow-hidden">
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Aktif İlan</p>
                  <p className="text-3xl font-bold">{activeProperties.length}</p>
                </div>
                <Eye className="h-12 w-12 text-green-200" />
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-20">
                <Eye className="h-20 w-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white overflow-hidden">
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm">Bekleyen Başvuru</p>
                  <p className="text-3xl font-bold">{pendingApplications.length}</p>
                </div>
                <Users className="h-12 w-12 text-yellow-200" />
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-20">
                <Users className="h-20 w-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white overflow-hidden">
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Aylık Gelir</p>
                  <p className="text-3xl font-bold">₺{(rentedProperties.reduce((sum, p) => sum + p.price, 0)).toLocaleString('tr-TR')}</p>
                </div>
                <DollarSign className="h-12 w-12 text-purple-200" />
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-20">
                <DollarSign className="h-20 w-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-8 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <Plus className="mr-2 h-6 w-6" />
              Hızlı İşlemler
            </h3>
            <div className="flex flex-wrap gap-4">
              <Link to="/create-property">
                <Button variant="secondary" className="bg-white text-indigo-600 hover:bg-gray-100">
                  <Plus className="mr-2 h-4 w-4" />
                  Yeni İlan Ekle
                </Button>
              </Link>
              {pendingApplications.length > 0 && (
                <Button 
                  variant="secondary" 
                  className="bg-yellow-400 text-yellow-900 hover:bg-yellow-300"
                  onClick={() => setSelectedTab("applications")}
                >
                  <Users className="mr-2 h-4 w-4" />
                  {pendingApplications.length} Başvuru Bekliyor
                </Button>
              )}
              <Button 
                variant="secondary" 
                className="bg-white/20 text-white hover:bg-white/30 border border-white/30"
                onClick={() => fetchDashboardData()}
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Verileri Yenile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white shadow-sm">
            <TabsTrigger value="overview" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              <BarChart3 className="mr-2 h-4 w-4" />
              Genel Bakış
            </TabsTrigger>
            <TabsTrigger value="applications" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              <Users className="mr-2 h-4 w-4" />
              Başvurular ({applications.length})
            </TabsTrigger>
            <TabsTrigger value="properties" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              <Building className="mr-2 h-4 w-4" />
              İlanlarım ({properties.length})
            </TabsTrigger>
            <TabsTrigger value="earnings" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              <DollarSign className="mr-2 h-4 w-4" />
              Gelir Raporu
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Recent Applications */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    Son Başvurular
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {applications.slice(0, 3).map((application) => (
                      <div key={application.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-semibold">{application.id.substring(0, 8)}</p>
                          <p className="text-sm text-gray-600">{new Date(application.created_at).toLocaleDateString('tr-TR')}</p>
                        </div>
                        <Badge variant={
                          application.status === 'approved' ? 'default' :
                          application.status === 'pending' ? 'secondary' : 'destructive'
                        }>
                          {application.status === 'pending' ? 'Beklemede' :
                           application.status === 'approved' ? 'Onaylandı' : 
                           application.status === 'rejected' ? 'Reddedildi' : application.status}
                        </Badge>
                      </div>
                    ))}
                    {applications.length === 0 && (
                      <p className="text-gray-500 text-center py-8">Henüz başvuru bulunmuyor</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Property Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="mr-2 h-5 w-5" />
                    İlan Performansı
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Aktif İlanlar</span>
                      <div className="flex items-center">
                        <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                          <div className="bg-green-600 h-2 rounded-full" style={{width: `${properties.length > 0 ? (activeProperties.length / properties.length) * 100 : 0}%`}}></div>
                        </div>
                        <span className="text-sm font-semibold">{activeProperties.length}/{properties.length}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span>Kiralanan</span>
                      <div className="flex items-center">
                        <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                          <div className="bg-blue-600 h-2 rounded-full" style={{width: `${properties.length > 0 ? (rentedProperties.length / properties.length) * 100 : 0}%`}}></div>
                        </div>
                        <span className="text-sm font-semibold">{rentedProperties.length}/{properties.length}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span>Başvuru Oranı</span>
                      <div className="flex items-center">
                        <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                          <div className="bg-purple-600 h-2 rounded-full" style={{width: `${properties.length > 0 ? Math.min((applications.length / properties.length) * 20, 100) : 0}%`}}></div>
                        </div>
                        <span className="text-sm font-semibold">{applications.length} başvuru</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="applications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Users className="mr-2 h-6 w-6" />
                    Gelen Başvurular
                  </div>
                  {pendingApplications.length > 0 && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      {pendingApplications.length} beklemede
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>Kiracı başvurularını inceleyin ve yanıtlayın</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {applications.map((application) => (
                    <Card key={application.id} className="border-l-4 border-indigo-400">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold text-lg">Başvuru #{application.id.substring(0, 8)}</h3>
                            <p className="text-sm text-gray-600">
                              📅 {new Date(application.created_at).toLocaleDateString('tr-TR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                            {application.move_in_date && (
                              <p className="text-sm text-gray-600">
                                🏠 Taşınma: {new Date(application.move_in_date).toLocaleDateString('tr-TR')}
                              </p>
                            )}
                          </div>
                          <Badge variant={
                            application.status === 'approved' ? 'default' :
                            application.status === 'pending' ? 'secondary' : 'destructive'
                          } className="text-sm">
                            {application.status === 'pending' ? '⏳ Beklemede' :
                             application.status === 'approved' ? '✅ Onaylandı' :
                             application.status === 'under_review' ? '👀 İnceleniyor' : 
                             application.status === 'rejected' ? '❌ Reddedildi' : application.status}
                          </Badge>
                        </div>
                        
                        <div className="bg-gray-50 p-4 rounded-lg mb-4">
                          <h4 className="font-medium mb-2">💬 Başvuru Mesajı:</h4>
                          <p className="text-gray-700 italic">"{application.message}"</p>
                        </div>
                        
                        {application.admin_notes && (
                          <div className="bg-blue-50 p-4 rounded-lg mb-4">
                            <h4 className="font-medium mb-2 text-blue-800">📝 Notlar:</h4>
                            <p className="text-blue-700">{application.admin_notes}</p>
                          </div>
                        )}
                        
                        {application.status === 'pending' && (
                          <div className="flex space-x-3">
                            <Button 
                              size="sm" 
                              onClick={() => handleApplicationAction(application.id, 'approved')}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              ✅ Onayla
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                const reason = prompt("Red sebebi (isteğe bağlı):");
                                handleApplicationAction(application.id, 'rejected', reason || 'Owner decision');
                              }}
                              className="border-red-300 text-red-600 hover:bg-red-50"
                            >
                              ❌ Reddet
                            </Button>
                            <Button 
                              size="sm" 
                              variant="secondary"
                              onClick={() => handleApplicationAction(application.id, 'under_review')}
                            >
                              👀 İnceleliyor Olarak İşaretle
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  
                  {applications.length === 0 && (
                    <div className="text-center py-12">
                      <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz başvuru yok</h3>
                      <p className="text-gray-600">İlanlarınızı yayınlayarak kiracı başvuruları almaya başlayın.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="properties">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Building className="mr-2 h-6 w-6" />
                    İlanlarım
                  </div>
                  <Link to="/create-property">
                    <Button className="bg-indigo-600 hover:bg-indigo-700">
                      <Plus className="mr-2 h-4 w-4" />
                      Yeni İlan
                    </Button>
                  </Link>
                </CardTitle>
                <CardDescription>Gayrimenkul ilanlarınızı yönetin</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {properties.map((property) => (
                    <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      {property.images && property.images[0] && (
                        <div className="aspect-video bg-gray-200 relative">
                          <img
                            src={`${BACKEND_URL}${property.images[0]}`}
                            alt={property.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 right-2">
                            <Badge variant={property.status === 'active' ? 'default' : 'secondary'} className="bg-white/90 text-gray-800">
                              {property.status === 'active' ? '🟢 Aktif' : 
                               property.status === 'rented' ? '🔵 Kiralandı' : 
                               property.status === 'draft' ? '⚪ Taslak' : '🔴 Pasif'}
                            </Badge>
                          </div>
                        </div>
                      )}
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-lg mb-2 line-clamp-2">{property.title}</h3>
                        <div className="flex items-center text-gray-600 mb-2">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span className="text-sm">{property.district}, {property.city}</span>
                        </div>
                        
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-2xl font-bold text-indigo-600 flex items-center">
                            <DollarSign className="h-5 w-5 mr-1" />
                            {property.price.toLocaleString('tr-TR')} ₺
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                          <div className="flex items-center">
                            <Bed className="h-4 w-4 mr-1" />
                            <span>{property.rooms}</span>
                          </div>
                          <div className="flex items-center">
                            <Square className="h-4 w-4 mr-1" />
                            <span>{property.area}m²</span>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          {property.status === 'draft' && (
                            <Button 
                              size="sm" 
                              onClick={() => handlePropertyStatusUpdate(property.id, 'active')}
                              className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                              🚀 Yayınla
                            </Button>
                          )}
                          {property.status === 'active' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handlePropertyStatusUpdate(property.id, 'inactive')}
                              className="flex-1"
                            >
                              ⏸️ Durdur
                            </Button>
                          )}
                          {property.status === 'inactive' && (
                            <Button 
                              size="sm" 
                              onClick={() => handlePropertyStatusUpdate(property.id, 'active')}
                              className="flex-1 bg-blue-600 hover:bg-blue-700"
                            >
                              ▶️ Aktifleştir
                            </Button>
                          )}
                          <Link to={`/property/${property.id}`} className="flex-1">
                            <Button size="sm" variant="secondary" className="w-full">
                              👁️ Görüntüle
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {properties.length === 0 && (
                  <div className="text-center py-12">
                    <Building className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz ilanınız yok</h3>
                    <p className="text-gray-600 mb-4">İlk gayrimenkul ilanınızı oluşturarak kiracı bulmaya başlayın.</p>
                    <Link to="/create-property">
                      <Button className="bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="mr-2 h-4 w-4" />
                        İlk İlanınızı Oluşturun
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="earnings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="mr-2 h-6 w-6" />
                  Gelir Raporu ve Komisyon Analizi
                </CardTitle>
                <CardDescription>Platform komisyonu ve kazancınızın detaylı analizi</CardDescription>
              </CardHeader>
              <CardContent>
                {stats && (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-xl">
                      <h3 className="text-xl font-semibold mb-4 flex items-center">
                        <BarChart3 className="mr-2 h-6 w-6" />
                        Komisyon Özeti
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center bg-white p-4 rounded-lg">
                          <div className="text-3xl font-bold text-green-600 mb-2">
                            ₺{stats.total_owner_payments?.toLocaleString('tr-TR') || '0'}
                          </div>
                          <p className="text-sm text-gray-600">Size Ödenen Tutar</p>
                          <p className="text-xs text-green-600 mt-1">(%60 pay)</p>
                        </div>
                        <div className="text-center bg-white p-4 rounded-lg">
                          <div className="text-3xl font-bold text-blue-600 mb-2">
                            ₺{stats.total_commission_collected?.toLocaleString('tr-TR') || '0'}
                          </div>
                          <p className="text-sm text-gray-600">Platform Komisyonu</p>
                          <p className="text-xs text-blue-600 mt-1">(%40 sadece ilk ay)</p>
                        </div>
                        <div className="text-center bg-white p-4 rounded-lg">
                          <div className="text-3xl font-bold text-indigo-600 mb-2">
                            ₺{stats.total_payments?.toLocaleString('tr-TR') || '0'}
                          </div>
                          <p className="text-sm text-gray-600">Toplam İşlem</p>
                          <p className="text-xs text-indigo-600 mt-1">{stats.payment_count || 0} ödeme</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-yellow-50 p-6 rounded-lg">
                        <h4 className="font-semibold text-yellow-800 mb-3 flex items-center">
                          <Eye className="mr-2 h-5 w-5" />
                          💡 Komisyon Bilgisi
                        </h4>
                        <p className="text-yellow-700 text-sm leading-relaxed">
                          Evim Kirada sadece <strong>ilk ay kirasından %40 komisyon</strong> alır. 
                          Sonraki aylar komisyonsuz olarak doğrudan sizinle kiracı arasında gerçekleşir.
                        </p>
                      </div>
                      
                      <div className="bg-blue-50 p-6 rounded-lg">
                        <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                          <BarChart3 className="mr-2 h-5 w-5" />
                          📊 Potansiyel Aylık Gelir
                        </h4>
                        <div className="text-2xl font-bold text-blue-600 mb-2">
                          ₺{rentedProperties.reduce((sum, p) => sum + p.price, 0).toLocaleString('tr-TR')}
                        </div>
                        <p className="text-blue-700 text-sm">
                          {rentedProperties.length} kiralanan ilanınızdan aylık toplam gelir
                        </p>
                      </div>
                    </div>
                    
                    {/* Monthly Performance */}
                    <div className="bg-white border rounded-lg p-6">
                      <h4 className="font-semibold mb-4 flex items-center">
                        <Calendar className="mr-2 h-5 w-5" />
                        📈 Bu Ay Performans
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-gray-700">{applications.length}</div>
                          <p className="text-sm text-gray-600">Toplam Başvuru</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{applications.filter(a => a.status === 'approved').length}</div>
                          <p className="text-sm text-gray-600">Onaylanan</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-yellow-600">{pendingApplications.length}</div>
                          <p className="text-sm text-gray-600">Beklemede</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{activeProperties.length}</div>
                          <p className="text-sm text-gray-600">Aktif İlan</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
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
            <Route path="/" element={
              <div className="min-h-screen bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                <div className="max-w-7xl mx-auto px-4 py-20 text-center">
                  <h1 className="text-6xl font-bold mb-6">Evim Kirada</h1>
                  <p className="text-2xl mb-8">Türkiye'nin Akıllı Kiralama Platformu</p>
                  <div className="flex justify-center gap-4">
                    <Link to="/properties">
                      <Button size="lg" variant="secondary">İlan Ara</Button>
                    </Link>
                    <Link to="/login">
                      <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-indigo-600">Giriş Yap</Button>
                    </Link>
                  </div>
                </div>
              </div>
            } />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/properties" element={<PropertiesPage />} />
            <Route 
              path="/property/:id" 
              element={<PropertyDetailPage />} 
            />
            <Route
              path="/create-property"
              element={
                <ProtectedRoute roles={['owner']}>
                  <CreateProperty />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdminPanel />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner-dashboard"
              element={
                <ProtectedRoute roles={['owner']}>
                  <OwnerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-properties"
              element={
                <ProtectedRoute roles={['owner']}>
                  <OwnerDashboard />
                </ProtectedRoute>
              }
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
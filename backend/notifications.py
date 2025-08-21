import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import os
from datetime import datetime
import logging
from typing import Dict, List, Optional
import requests
import asyncio
from jinja2 import Template

logger = logging.getLogger(__name__)

class NotificationService:
    """
    Professional notification service for Evim Kirada platform
    Supports Email and SMS notifications with templates
    """
    
    def __init__(self):
        # Email configuration
        self.smtp_server = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.environ.get('SMTP_PORT', '587'))
        self.smtp_email = os.environ.get('SMTP_EMAIL', 'noreply@evimkirada.com')
        self.smtp_password = os.environ.get('SMTP_PASSWORD', '')
        
        # SMS configuration (Twilio or mock)
        self.sms_enabled = os.environ.get('SMS_ENABLED', 'false').lower() == 'true'
        self.twilio_sid = os.environ.get('TWILIO_SID', '')
        self.twilio_token = os.environ.get('TWILIO_TOKEN', '')
        self.twilio_from = os.environ.get('TWILIO_FROM', '')
        
        # Base URLs
        self.base_url = os.environ.get('BASE_URL', 'https://evimkirada.com')
        
    async def send_email(
        self, 
        to_email: str, 
        subject: str, 
        html_content: str, 
        text_content: Optional[str] = None
    ) -> bool:
        """Send professional HTML email"""
        try:
            msg = MIMEMultipart('alternative')
            msg['From'] = f"Evim Kirada <{self.smtp_email}>"
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # Add text version
            if text_content:
                text_part = MIMEText(text_content, 'plain', 'utf-8')
                msg.attach(text_part)
            
            # Add HTML version
            html_part = MIMEText(html_content, 'html', 'utf-8')
            msg.attach(html_part)
            
            # Send email
            if self.smtp_password:  # Only send if credentials available
                context = ssl.create_default_context()
                with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                    server.starttls(context=context)
                    server.login(self.smtp_email, self.smtp_password)
                    server.send_message(msg)
            else:
                # Mock email sending for development
                logger.info(f"MOCK EMAIL SENT to {to_email}: {subject}")
                
            return True
            
        except Exception as e:
            logger.error(f"Email sending failed: {str(e)}")
            return False
    
    async def send_sms(self, to_phone: str, message: str) -> bool:
        """Send SMS notification"""
        try:
            if self.sms_enabled and self.twilio_sid and self.twilio_token:
                # Real Twilio implementation
                from twilio.rest import Client
                client = Client(self.twilio_sid, self.twilio_token)
                
                message = client.messages.create(
                    body=message,
                    from_=self.twilio_from,
                    to=to_phone
                )
                return True
            else:
                # Mock SMS for development
                logger.info(f"MOCK SMS SENT to {to_phone}: {message}")
                return True
                
        except Exception as e:
            logger.error(f"SMS sending failed: {str(e)}")
            return False
    
    def _get_base_template(self) -> str:
        """Professional HTML email base template"""
        return '''
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Evim Kirada</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
                .container { max-width: 600px; margin: 0 auto; background-color: white; }
                .header { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 30px 40px; text-align: center; }
                .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
                .header p { margin: 5px 0 0 0; opacity: 0.9; }
                .content { padding: 40px; }
                .footer { background-color: #f1f5f9; padding: 30px 40px; text-align: center; color: #64748b; font-size: 14px; }
                .btn { display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
                .btn:hover { background-color: #4338ca; }
                .highlight { background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0; }
                .success { background-color: #d1fae5; border-left-color: #10b981; }
                .warning { background-color: #fee2e2; border-left-color: #ef4444; }
                .property-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
                .price { font-size: 24px; font-weight: bold; color: #4f46e5; }
                h2 { color: #1f2937; margin-bottom: 16px; }
                p { color: #4b5563; line-height: 1.6; margin-bottom: 16px; }
                .small { font-size: 12px; color: #9ca3af; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Evim Kirada</h1>
                    <p>Türkiye'nin Akıllı Kiralama Platformu</p>
                </div>
                <div class="content">
                    {{ content }}
                </div>
                <div class="footer">
                    <p><strong>Evim Kirada</strong> - Güvenli, Hızlı, Kolay Kiralama Deneyimi</p>
                    <p class="small">Bu e-posta otomatik olarak gönderilmiştir. Lütfen yanıtlamayın.</p>
                    <p class="small">© 2024 Evim Kirada. Tüm hakları saklıdır.</p>
                </div>
            </div>
        </body>
        </html>
        '''
    
    async def send_application_approved(self, user_email: str, user_name: str, property_title: str, property_id: str):
        """Send application approved notification"""
        content = f'''
        <h2>🎉 Tebrikler! Başvurunuz Onaylandı</h2>
        <p>Merhaba <strong>{user_name}</strong>,</p>
        <p>Aşağıdaki gayrimenkul için yaptığınız başvuru <strong>onaylandı</strong>:</p>
        
        <div class="property-card">
            <h3>{property_title}</h3>
            <p>Ev sahibi başvurunuzu inceledi ve onayladı. Artık kira sözleşmesi sürecine geçebilirsiniz.</p>
        </div>
        
        <div class="highlight success">
            <strong>Sonraki Adımlar:</strong><br>
            • Ödeme işlemini tamamlayın<br>
            • Kira sözleşmesini imzalayın<br>
            • Taşınma tarihini planlayın
        </div>
        
        <a href="{self.base_url}/property/{property_id}" class="btn">İlanı Görüntüle</a>
        
        <p>Herhangi bir sorunuz varsa lütfen bizimle iletişime geçin.</p>
        '''
        
        template = Template(self._get_base_template())
        html_content = template.render(content=content)
        
        return await self.send_email(
            to_email=user_email,
            subject="✅ Başvurunuz Onaylandı - Evim Kirada",
            html_content=html_content
        )
    
    async def send_application_rejected(self, user_email: str, user_name: str, property_title: str, reason: str = ""):
        """Send application rejected notification"""
        content = f'''
        <h2>Başvuru Hakkında Bilgilendirme</h2>
        <p>Merhaba <strong>{user_name}</strong>,</p>
        <p>Maalesef aşağıdaki gayrimenkul için yaptığınız başvuru ev sahibi tarafından değerlendirilerek reddedildi:</p>
        
        <div class="property-card">
            <h3>{property_title}</h3>
            {f'<p><strong>Ret Sebebi:</strong> {reason}</p>' if reason else ''}
        </div>
        
        <div class="highlight">
            <strong>Başka Fırsatlar:</strong><br>
            Platformumuzda sizin için uygun olan birçok başka ilan bulunmaktadır.
        </div>
        
        <a href="{self.base_url}/properties" class="btn">Diğer İlanları İncele</a>
        
        <p>Yeni ilanlarımızı takip etmeye devam edin. En uygun seçenekleri size sunmaya devam edeceğiz.</p>
        '''
        
        template = Template(self._get_base_template())
        html_content = template.render(content=content)
        
        return await self.send_email(
            to_email=user_email,
            subject="📋 Başvuru Durumu - Evim Kirada",
            html_content=html_content
        )
    
    async def send_new_application_to_owner(self, owner_email: str, owner_name: str, property_title: str, 
                                           tenant_name: str, application_message: str, application_id: str):
        """Send new application notification to property owner"""
        content = f'''
        <h2>🏠 Yeni Başvuru Aldınız!</h2>
        <p>Merhaba <strong>{owner_name}</strong>,</p>
        <p>İlanınız için yeni bir kiracı başvurusu aldınız:</p>
        
        <div class="property-card">
            <h3>{property_title}</h3>
            <p><strong>Başvuru Sahibi:</strong> {tenant_name}</p>
            <p><strong>Mesaj:</strong></p>
            <p style="font-style: italic; background-color: #f8fafc; padding: 15px; border-radius: 6px;">"{application_message}"</p>
        </div>
        
        <div class="highlight">
            <strong>Başvuruyu İnceleyip:</strong><br>
            • Kiracının profilini gözden geçirin<br>
            • Onay veya ret kararınızı verin<br>
            • Hızlı yanıt vermek başvuru başarısını artırır
        </div>
        
        <a href="{self.base_url}/applications" class="btn">Başvuruları Yönet</a>
        
        <p>Başvuruya en kısa sürede yanıt vermenizi öneririz.</p>
        '''
        
        template = Template(self._get_base_template())
        html_content = template.render(content=content)
        
        return await self.send_email(
            to_email=owner_email,
            subject="🔔 Yeni Kiracı Başvurusu - Evim Kirada",
            html_content=html_content
        )
    
    async def send_payment_successful(self, user_email: str, user_name: str, property_title: str, 
                                    amount: float, commission: float, owner_amount: float):
        """Send payment successful notification"""
        content = f'''
        <h2>✅ Ödeme Başarılı!</h2>
        <p>Merhaba <strong>{user_name}</strong>,</p>
        <p>Kira ödemesi başarıyla tamamlanmıştır:</p>
        
        <div class="property-card">
            <h3>{property_title}</h3>
            <div class="price">₺{amount:,.0f}</div>
            <p><strong>Ödeme Detayları:</strong></p>
            <ul>
                <li>Toplam Tutar: ₺{amount:,.0f}</li>
                <li>Platform Komisyonu (%40): ₺{commission:,.0f}</li>
                <li>Ev Sahibine Aktarılan: ₺{owner_amount:,.0f}</li>
            </ul>
        </div>
        
        <div class="highlight success">
            <strong>✅ Ödeme Tamamlandı</strong><br>
            Artık sözleşme sürecine geçebilirsiniz. Ev sahibiyle iletişime geçerek teslim alma detaylarını planlayın.
        </div>
        
        <div class="highlight">
            <strong>📋 Önemli Bilgi:</strong><br>
            Sonraki ay kiralarınız doğrudan ev sahibiyle gerçekleştirilecek. Platform komisyonu sadece ilk ay için alınmıştır.
        </div>
        '''
        
        template = Template(self._get_base_template())
        html_content = template.render(content=content)
        
        return await self.send_email(
            to_email=user_email,
            subject="💰 Ödeme Başarılı - Evim Kirada",
            html_content=html_content
        )
    
    async def send_welcome_email(self, user_email: str, user_name: str, user_role: str):
        """Send welcome email to new users"""
        role_text = "Ev Sahibi" if user_role == "owner" else "Kiracı" if user_role == "tenant" else "Yönetici"
        role_benefits = {
            "owner": [
                "İlanlarınızı kolayca yönetin",
                "Kiracı başvurularını inceleyin",
                "Güvenli ödeme sistemi",
                "Sadece ilk ay %40 komisyon"
            ],
            "tenant": [
                "Güvenilir ev sahipleri",
                "Kolay başvuru süreci",
                "Güvenli ödeme sistemi",
                "Kimlik doğrulaması"
            ],
            "admin": [
                "Platform yönetimi",
                "Kullanıcı ve ilan moderasyonu",
                "Detaylı raporlama",
                "Sistem yönetimi"
            ]
        }
        
        content = f'''
        <h2>🎉 Hoş Geldiniz!</h2>
        <p>Merhaba <strong>{user_name}</strong>,</p>
        <p>Evim Kirada platformuna <strong>{role_text}</strong> olarak katıldığınız için teşekkürler!</p>
        
        <div class="highlight success">
            <h3>🚀 Size Özel Avantajlar:</h3>
            <ul>
                {''.join([f'<li>{benefit}</li>' for benefit in role_benefits.get(user_role, [])])}
            </ul>
        </div>
        
        <div class="property-card">
            <h3>📋 İlk Adımlar:</h3>
            <p><strong>1.</strong> Profilinizi tamamlayın<br>
            <strong>2.</strong> {"İlanınızı oluşturun" if user_role == "owner" else "İlanları inceleyin"}<br>
            <strong>3.</strong> {"Başvuruları takip edin" if user_role == "owner" else "Başvuru yapın"}<br>
            <strong>4.</strong> Güvenli ödeme sistemimizi kullanın</p>
        </div>
        
        <a href="{self.base_url}" class="btn">Platformu Keşfet</a>
        
        <p>Sorularınız için destek ekibimizle iletişime geçebilirsiniz.</p>
        '''
        
        template = Template(self._get_base_template())
        html_content = template.render(content=content)
        
        return await self.send_email(
            to_email=user_email,
            subject=f"🎉 Hoş Geldiniz - Evim Kirada",
            html_content=html_content
        )
    
    async def send_property_status_change(self, owner_email: str, owner_name: str, property_title: str, 
                                        old_status: str, new_status: str):
        """Send property status change notification"""
        status_messages = {
            "active": "İlanınız yayında ve kiracılar tarafından görülebilir",
            "rented": "İlanınız kiralandı olarak işaretlendi",
            "inactive": "İlanınız pasif duruma getirildi",
            "draft": "İlanınız taslak durumunda"
        }
        
        content = f'''
        <h2>📊 İlan Durumu Güncellendi</h2>
        <p>Merhaba <strong>{owner_name}</strong>,</p>
        <p>İlanınızın durumu güncellendi:</p>
        
        <div class="property-card">
            <h3>{property_title}</h3>
            <p><strong>Önceki Durum:</strong> {old_status.title()}</p>
            <p><strong>Yeni Durum:</strong> {new_status.title()}</p>
            <p>{status_messages.get(new_status, "")}</p>
        </div>
        '''
        
        template = Template(self._get_base_template())
        html_content = template.render(content=content)
        
        return await self.send_email(
            to_email=owner_email,
            subject="📋 İlan Durumu Güncellendi - Evim Kirada",
            html_content=html_content
        )

# Global notification service instance
notification_service = NotificationService()
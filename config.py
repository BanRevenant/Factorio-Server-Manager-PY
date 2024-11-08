import os
import secrets

class Config:
    # Basic Flask config
    SECRET_KEY = os.environ.get('SECRET_KEY', secrets.token_hex(32))
    
    # Session config
    SESSION_TYPE = 'filesystem'
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = 3600  # 1 hour
    
    # CSRF protection
    WTF_CSRF_ENABLED = True
    WTF_CSRF_TIME_LIMIT = 3600
    WTF_CSRF_SSL_STRICT = True
    
    # Socket.IO config
    SOCKETIO_ASYNC_MODE = 'eventlet'
    
    # Security headers
    SECURITY_HEADERS = {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'X-XSS-Protection': '1; mode=block',
    }

    # Factorio server config
    FACTORIO_DIR = os.environ.get('FACTORIO_DIR', '/opt/factorio')
    SAVES_DIR = os.path.join(FACTORIO_DIR, 'saves')
    MODS_DIR = os.path.join(FACTORIO_DIR, 'mods')
    CONFIG_DIR = os.path.join(FACTORIO_DIR, 'config')
    
    # File upload config
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB limit

class DevelopmentConfig(Config):
    DEBUG = True
    DEVELOPMENT = True
    SESSION_COOKIE_SECURE = False
    TEMPLATES_AUTO_RELOAD = True

class ProductionConfig(Config):
    DEBUG = False
    TESTING = False

class TestingConfig(Config):
    TESTING = True
    WTF_CSRF_ENABLED = False
    SESSION_COOKIE_SECURE = False

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
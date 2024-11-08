// Authentication state management
class Auth {
    constructor() {
        this.isAuthenticated = false;
        this.user = null;
        this.checkAuthStatus();
    }

    async checkAuthStatus() {
        try {
            const response = await window.client.get('/api/user/status');
            if (response.username) {
                this.isAuthenticated = true;
                this.user = response;
                
                // Redirect to home if already logged in and on login page
                if (window.location.pathname === '/login') {
                    window.location.href = '/';
                }
            } else if (window.location.pathname !== '/login') {
                // Redirect to login if not authenticated
                window.location.href = '/login';
            }
        } catch (error) {
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
    }

    async login(username, password) {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        
        try {
            const response = await window.client.post('/login', formData);
            if (response.success) {
                this.isAuthenticated = true;
                this.user = {
                    username: response.username
                };
                window.location.href = '/';
            }
        } catch (error) {
            window.flash("Login failed. Username or Password wrong.", "red");
            throw error;
        }
    }

    async logout() {
        try {
            await window.client.get('/logout');
            this.isAuthenticated = false;
            this.user = null;
            window.location.href = '/login';
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
}

// Initialize authentication
const auth = new Auth();

// Setup login form handler
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            try {
                await auth.login(username, password);
            } catch (error) {
                console.error('Login error:', error);
            }
        });
    }

    // Setup logout button handler
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => auth.logout());
    }
});

// Export auth instance
window.auth = auth;

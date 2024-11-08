// Flash message system
const flash = (message, color = "gray-light") => {
    const flashContainer = document.getElementById('flash-messages');
    const flashElement = document.createElement('div');
    
    flashElement.className = `bg-${color} cursor-pointer accentuated rounded px-4 py-2 mb-4 max-w-1/2 lg:max-w-none`;
    flashElement.innerHTML = `<p>${message}</p>`;
    
    // Click to dismiss
    flashElement.addEventListener('click', () => flashElement.remove());
    
    // Auto dismiss after 4 seconds
    setTimeout(() => flashElement.remove(), 4000);
    
    flashContainer.appendChild(flashElement);
};

// HTTP client with CSRF protection
class HTTPClient {
    constructor() {
        this.csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
    }

    async request(method, url, data = null, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            'X-CSRFToken': this.csrfToken
        };

        const config = {
            method,
            headers: { ...headers, ...options.headers },
            credentials: 'same-origin'
        };

        if (data) {
            if (data instanceof FormData) {
                delete config.headers['Content-Type'];
                config.body = data;
            } else {
                config.body = JSON.stringify(data);
            }
        }

        try {
            const response = await fetch(url, config);
            
            // Handle non-JSON responses
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const result = await response.json();
                
                if (!response.ok) {
                    if (response.status === 502) {
                        flash("Service not available", "red");
                    } else if (response.status !== 401) {
                        flash(result.message || "An error occurred", "red");
                    }
                    throw new Error(result.message || 'Network response was not ok');
                }
                
                return result;
            }
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            return response;
            
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }

    get(url, options = {}) {
        return this.request('GET', url, null, options);
    }

    post(url, data, options = {}) {
        return this.request('POST', url, data, options);
    }
}

// WebSocket connection manager
class WSManager {
    constructor() {
        this.ws = null;
        this.subscribers = new Map();
        this.reconnectTimer = null;
        this.wsScheme = window.location.protocol === "https:" ? "wss" : "ws";
        this.wsUrl = `${this.wsScheme}://${window.location.host}/ws`;
    }

    connect() {
        if (this.ws?.readyState === WebSocket.OPEN) return;

        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
            console.log('WebSocket connected');
            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
                this.reconnectTimer = null;
            }
            
            // Resubscribe to previous rooms
            this.subscribers.forEach((callbacks, room) => {
                this.subscribe(room);
            });
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.reconnectTimer = setTimeout(() => this.connect(), 5000);
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            const callbacks = this.subscribers.get(data.room_name);
            if (callbacks) {
                callbacks.forEach(callback => callback(data.message));
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.ws.close();
        };
    }

    subscribe(room, callback) {
        if (!this.subscribers.has(room)) {
            this.subscribers.set(room, new Set());
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    room_name: room,
                    controls: {
                        type: "subscribe",
                        value: room
                    }
                }));
            }
        }
        if (callback) {
            this.subscribers.get(room).add(callback);
        }
    }

    unsubscribe(room, callback) {
        if (callback && this.subscribers.has(room)) {
            const callbacks = this.subscribers.get(room);
            callbacks.delete(callback);
            if (callbacks.size === 0) {
                this.subscribers.delete(room);
                if (this.ws?.readyState === WebSocket.OPEN) {
                    this.ws.send(JSON.stringify({
                        room_name: room,
                        controls: {
                            type: "unsubscribe",
                            value: room
                        }
                    }));
                }
            }
        }
    }

    sendCommand(command) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                room_name: "",
                controls: {
                    type: "command",
                    value: command
                }
            }));
        }
    }
}

// Export utilities
window.flash = flash;
window.client = new HTTPClient();
window.wsManager = new WSManager();

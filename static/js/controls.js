class ServerControls {
    constructor() {
        this.statusElement = document.getElementById('server-status');
        this.serverInfoElement = document.getElementById('server-info');
        this.serverControlsElement = document.getElementById('server-controls');
        this.controlForm = document.getElementById('server-control-form');
        
        this.serverStatus = null;
        this.factorioVersion = null;
        
        this.initialize();
    }

    async initialize() {
        // Get initial server status
        await this.updateStatus();
        
        // Setup WebSocket for real-time updates
        window.wsManager.connect();
        window.wsManager.subscribe('server_status', (status) => {
            this.serverStatus = JSON.parse(status);
            this.updateStatusDisplay();
        });

        // Setup form submit handler
        if (this.controlForm) {
            this.controlForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }
    }

    async updateStatus() {
        try {
            const status = await window.client.get('/api/server/status');
            const version = await window.client.get('/api/server/facVersion');
            
            this.serverStatus = status;
            this.factorioVersion = version.base_mod_version;
            
            this.updateStatusDisplay();
        } catch (error) {
            console.error('Error fetching server status:', error);
            window.flash('Error fetching server status', 'red');
        }
    }

    updateStatusDisplay() {
        // Update status indicator in sidebar
        if (this.statusElement) {
            const statusClass = this.serverStatus.running ? 'bg-green' : 'bg-red';
            const statusText = this.serverStatus.running ? 'Running' : 'Stopped';
            this.statusElement.className = `${statusClass} accentuated rounded px-2 py-1 text-black`;
            this.statusElement.textContent = statusText;
        }

        // Update main status panel
        if (this.serverInfoElement) {
            if (this.serverStatus.running) {
                this.serverInfoElement.innerHTML = `
                    <div class="lg:w-1/5 mb-2">
                        <div class="font-bold">Status</div>
                        <div>Running</div>
                    </div>
                    <div class="lg:w-1/5 mb-2">
                        <div class="font-bold">IP</div>
                        <div>${this.serverStatus.bindip}</div>
                    </div>
                    <div class="lg:w-1/5 mb-2">
                        <div class="font-bold">Port</div>
                        <div>${this.serverStatus.port}</div>
                    </div>
                    <div class="lg:w-1/5 mb-2">
                        <div class="font-bold">Factorio Version</div>
                        <div>${this.factorioVersion || 'Unknown'}</div>
                    </div>
                    <div class="lg:w-1/5 mb-2">
                        <div class="font-bold">Save</div>
                        <div>${this.serverStatus.savefile}</div>
                    </div>
                `;
            } else {
                this.serverInfoElement.innerHTML = `
                    <div class="lg:w-1/5 mb-2">
                        <div class="font-bold">Status</div>
                        <div>Stopped</div>
                    </div>
                    <div class="lg:w-1/5 mb-2 mr-0 lg:mr-4">
                        <div class="font-bold">IP</div>
                        <input type="text" name="ip" 
                               class="shadow appearance-none border w-full py-2 px-3 text-black"
                               value="0.0.0.0" pattern="^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"
                               required>
                        <span class="text-red hidden">IP is required and must be valid.</span>
                    </div>
                    <div class="lg:w-1/5 mb-2 mr-0 lg:mr-4">
                        <div class="font-bold">Port</div>
                        <input type="number" name="port"
                               class="shadow appearance-none border w-full py-2 px-3 text-black"
                               value="34197" min="1" max="65535" required>
                        <span class="text-red hidden">Port is required within range 1-65535</span>
                    </div>
                    <div class="lg:w-1/5 mb-2 mr-0 lg:mr-4">
                        <div class="font-bold">Factorio Version</div>
                        <div>${this.factorioVersion || 'Unknown'}</div>
                    </div>
                    <div class="lg:w-1/5 mb-2">
                        <div class="font-bold">Save</div>
                        <div class="relative">
                            <select name="save" required
                                    class="shadow appearance-none border w-full py-2 px-3 text-black">
                                <option value="">Loading saves...</option>
                            </select>
                            <span class="text-red hidden">Save is required</span>
                        </div>
                    </div>
                `;
                
                // Load saves list
                this.loadSaves();
            }
        }

        // Update controls
        if (this.serverControlsElement) {
            if (this.serverStatus.running) {
                this.serverControlsElement.innerHTML = `
                    <button type="button" class="w-full md:w-auto mb-2 md:mb-0 md:mr-2 py-1 px-2 bg-gray-light hover:glow-orange hover:bg-orange accentuated text-black font-bold" 
                            onclick="serverControls.stopServer()">
                        Save & Stop Server
                    </button>
                    <button type="button" class="w-full md:w-auto py-1 px-2 bg-red hover:glow-red hover:bg-red-light accentuated text-black font-bold"
                            onclick="serverControls.killServer()">
                        Kill Server
                    </button>
                `;
            } else {
                this.serverControlsElement.innerHTML = `
                    <button type="submit" class="w-full md:w-auto py-1 px-2 bg-green hover:glow-green hover:bg-green-light accentuated text-black font-bold">
                        Start Server
                    </button>
                `;
            }
        }
    }

    async loadSaves() {
        try {
            const saves = await window.client.get('/api/saves/list');
            const selectElement = this.serverInfoElement.querySelector('select[name="save"]');
            
            if (selectElement && saves.length > 0) {
                selectElement.innerHTML = saves
                    .map(save => `<option value="${save.name}">${save.name}</option>`)
                    .join('');
            }
        } catch (error) {
            console.error('Error loading saves:', error);
            window.flash('Error loading saves list', 'red');
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        // Validate form
        const form = e.target;
        if (!form.checkValidity()) {
            // Show validation messages
            const inputs = form.querySelectorAll('input, select');
            inputs.forEach(input => {
                const errorSpan = input.nextElementSibling;
                if (errorSpan && errorSpan.classList.contains('text-red')) {
                    errorSpan.classList.toggle('hidden', input.validity.valid);
                }
            });
            return;
        }

        // Get form data
        const formData = new FormData(form);
        const data = {
            bindip: formData.get('ip'),
            port: parseInt(formData.get('port')),
            savefile: formData.get('save')
        };

        try {
            await window.client.post('/api/server/start', data);
            window.flash('Server started successfully', 'green');
            await this.updateStatus();
        } catch (error) {
            console.error('Error starting server:', error);
            window.flash('Error starting server', 'red');
        }
    }

    async stopServer() {
        try {
            await window.client.get('/api/server/stop');
            window.flash('Server stopped successfully', 'green');
            await this.updateStatus();
        } catch (error) {
            console.error('Error stopping server:', error);
            window.flash('Error stopping server', 'red');
        }
    }

    async killServer() {
        if (confirm('Are you sure you want to kill the server? This may cause data loss.')) {
            try {
                await window.client.get('/api/server/kill');
                window.flash('Server killed successfully', 'green');
                await this.updateStatus();
            } catch (error) {
                console.error('Error killing server:', error);
                window.flash('Error killing server', 'red');
            }
        }
    }
}

// Initialize server controls
const serverControls = new ServerControls();
window.serverControls = serverControls;

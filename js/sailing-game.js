// Sailing Game - 2D JavaScript sailing simulation using Pixi.js
// Controls: A/D = rudder, W/S = row forwards/backwards, Q = raise/lower sail, Left/Right mouse = sail angle

class SailingGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.width = canvas.width;
        this.height = canvas.height;
        this.globalTransform = {
            scale: 1,
            x: this.width / 2,
            y: this.height / 2
        };

        // Coastline configuration
        this.coastline = {
            scaleFactor: 2.0,
            chunks: new Map(),
            chunkIndex: [],
            poiIndex: [],
            chunkPixelSize: 1800,
            chunkSize: 0.5,
            loadDistance: 2,
            indexLoaded: false,
            poiIndexLoaded: false,
            graphics: new Map(),
            poiInteractionRadius: 80, // Max distance for POI interaction in world units
        };
        
        // Pre-calculate squared radius for distance comparisons (performance optimization)
        this.coastline.poiInteractionRadiusSquared = this.coastline.poiInteractionRadius * this.coastline.poiInteractionRadius;
        
        // Boat state
        this.boat = {
            x: 5.6 * this.coastline.chunkPixelSize / this.coastline.chunkSize,
            y: -59.3 * this.coastline.chunkPixelSize / this.coastline.chunkSize,
            angle: 0,
            speed: 0,
            maxSpeed: 15,
            rudderAngle: 0,
            sailAngle: 0,
            sailHeight: 0,
            length: 40,
            width: 15
        };
        
        // Wind
        this.wind = {
            angle: Math.random() * Math.PI * 2,
            speed: 3.0,
            changeRate: 0.0005,
            targetAngle: null,
            targetThreshold: 0.01,
            rootPos: {
                x: 0,
                y: 0
            }
        };
        
        this.wind.targetAngle = this.generateWindTargetAngle();
        
        // Ocean animation
        this.waveOffset = 0;
        this.time = 0;
        this.lastFrameTime = Date.now();
        
        // Controls
        this.keys = {};
        this.keyPressTime = {};
        this.mouseDown = { left: false, right: false };
        this.buttonPressTime = {};
        
        // Initialize the game asynchronously
        this.init();
    }
    
    async init() {
        // Initialize Pixi.js Application
        this.app = new PIXI.Application();
        await this.app.init({
            canvas: this.canvas,
            width: this.width,
            height: this.height,
            background: 0x1a5f7a,
            antialias: true
        });

        // Create containers for different layers
        this.oceanContainer = new PIXI.Container();
        this.coastlineContainer = new PIXI.Container();
        this.boatContainer = new PIXI.Container();
        this.windContainer = new PIXI.Container();
        this.worldContainer = new PIXI.Container();

        this.worldContainer.addChild(this.coastlineContainer);
        this.worldContainer.addChild(this.boatContainer);
        this.app.stage.addChild(this.oceanContainer);
        this.app.stage.addChild(this.worldContainer);
        this.app.stage.addChild(this.windContainer);

        this.worldContainer.x = this.width / 2;
        this.worldContainer.y = this.height / 2;
        
        // Create graphics objects
        this.oceanGraphics = new PIXI.Graphics();
        this.oceanContainer.addChild(this.oceanGraphics);
        
        this.boatGraphics = new PIXI.Graphics();
        this.boatContainer.addChild(this.boatGraphics);
        
        this.windGraphics = new PIXI.Graphics();
        this.windContainer.addChild(this.windGraphics);
        
        // Initialize graphics renderers
        this.oceanRenderer = new OceanGraphics(this.oceanGraphics, this.width, this.height);
        this.boatRenderer = new BoatGraphics(this.boatGraphics, this.boatContainer);
        this.windRenderer = new WindGraphics(this.windGraphics, this.windContainer);
        
        // Cache reference to text panel element
        this.textPanel = document.getElementById('textPanel');
        this.isPanelOpen = false;
        this.currentPoi = null;
        
        this.setupControls();
        this.setupCloseButton();
        this.loadChunkIndex();
        this.loadPoiIndex();
        this.gameLoop();
    }
    
    loadChunkIndex() {
        fetch('map/chunks/index.csv')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(csvText => {
                const lines = csvText.trim().split('\n');
                this.coastline.chunkIndex = lines.map(line => {
                    const [x, y, fileName] = line.split(',');
                    return {
                        x: parseFloat(x),
                        y: parseFloat(y),
                        fileName: fileName.trim()
                    };
                });
                this.coastline.indexLoaded = true;
            })
            .catch(error => {
                console.error('Failed to load chunk index:', error);
            });
    }

    loadPoiIndex() {
        fetch('pois/chunks/index.csv')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(csvText => {
                const lines = csvText.trim().split('\n');
                this.coastline.poiIndex = lines.map(line => {
                    const [x, y, fileName] = line.split(',');
                    return {
                        x: parseFloat(x),
                        y: parseFloat(y),
                        fileName: fileName.trim()
                    };
                });
                this.coastline.poiIndexLoaded = true;
            })
            .catch(error => {
                console.error('Failed to load POI index:', error);
            });
    }
    
    getChunkKey(chunkX, chunkY) {
        return `${chunkX},${chunkY}`;
    }
    
    getChunkCoordsFromWorldPos(worldX, worldY) {
        const scale = this.coastline.scaleFactor;
        const chunkX = Math.floor(worldX / this.coastline.chunkPixelSize) * this.coastline.chunkSize;
        const chunkY = -Math.floor(worldY / this.coastline.chunkPixelSize) * this.coastline.chunkSize;
        return { chunkX, chunkY };
    }
    
    loadChunk(chunkX, chunkY) {
        const key = this.getChunkKey(chunkX, chunkY);
        
        if (this.coastline.chunks.has(key)) {
            return;
        }
        
        const chunkData = this.coastline.chunkIndex.find(c => c.x === chunkX && c.y === chunkY);
        if (!chunkData) {
            return;
        }
        
        this.coastline.chunks.set(key, {
            x: chunkX,
            y: chunkY,
            texture: null,
            loaded: false,
            pois: []
        });
        
        PIXI.Assets.load(`map/${chunkData.fileName}`)
            .then(texture => {
                const chunk = this.coastline.chunks.get(key);
                if (chunk) {
                    chunk.texture = texture;
                    chunk.loaded = true;
                }
            })
            .catch(error => {
                console.error(`Failed to load chunk ${key} from ${chunkData.fileName}:`, error);
                this.coastline.chunks.delete(key);
            });

        this.loadPois(chunkX, chunkY);
    }

    loadPois(chunkX, chunkY) {
        const key = this.getChunkKey(chunkX, chunkY);
        
        if (!this.coastline.chunks.has(key)) {
            return;
        }
        
        const poiData = this.coastline.poiIndex.find(c => c.x === chunkX && c.y === chunkY);
        if (!poiData) {
            return;
        }

        fetch(`pois/${poiData.fileName}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(pois => {
                this.coastline.chunks.get(key).pois = pois;
            })
            .catch(error => {
                console.error('Failed to load POIs:', error);
            });
    }
    
    updateChunks() {
        if (!this.coastline.indexLoaded) {
            return;
        }
        
        const { chunkX, chunkY } = this.getChunkCoordsFromWorldPos(this.boat.x, this.boat.y);
        
        const loadDist = this.coastline.loadDistance;
        for (let dx = -loadDist; dx <= loadDist; dx++) {
            for (let dy = -loadDist; dy <= loadDist; dy++) {
                const targetChunkX = chunkX + dx * this.coastline.chunkSize;
                const targetChunkY = chunkY + dy * this.coastline.chunkSize;
                this.loadChunk(targetChunkX, targetChunkY);
            }
        }
        
        const unloadDist = (loadDist + 1) * this.coastline.chunkSize;
        const chunksToRemove = [];
        for (const [key, chunk] of this.coastline.chunks.entries()) {
            const dx = Math.abs(chunk.x - chunkX);
            const dy = Math.abs(chunk.y - chunkY);
            if (dx > unloadDist || dy > unloadDist) {
                chunksToRemove.push(key);
                const graphics = this.coastline.graphics.get(key);
                if (graphics) {
                    this.coastlineContainer.removeChild(graphics);
                    this.coastline.graphics.delete(key);
                }
            }
        }
        chunksToRemove.forEach(key => this.coastline.chunks.delete(key));
    }
    
    setupControls() {
        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if (!this.keys[key]) {
                this.keys[key] = true;
                this.keyPressTime[key] = Date.now();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            this.keys[key] = false;
            delete this.keyPressTime[key];
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) this.mouseDown.left = true;
            if (e.button === 2) this.mouseDown.right = true;
            e.preventDefault();
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.mouseDown.left = false;
            if (e.button === 2) this.mouseDown.right = false;
        });
        
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
        
        this.setupMobileControls();
    }
    
    setupMobileControls() {
        const addButtonListeners = (buttonId, actionType, actionKey) => {
            const button = document.getElementById(buttonId);
            if (!button) return;
            
            const startAction = (e) => {
                e.preventDefault();
                if (actionType === 'key') {
                    this.keys[actionKey] = true;
                    this.keyPressTime[actionKey] = Date.now();
                } else if (actionType === 'mouse') {
                    this.mouseDown[actionKey] = true;
                } else if (actionType === 'button') {
                    this.buttonPressTime[actionKey] = Date.now();
                }
            };
            
            const stopAction = (e) => {
                e.preventDefault();
                if (actionType === 'key') {
                    this.keys[actionKey] = false;
                    delete this.keyPressTime[actionKey];
                } else if (actionType === 'mouse') {
                    this.mouseDown[actionKey] = false;
                } else if (actionType === 'button') {
                    delete this.buttonPressTime[actionKey];
                }
            };
            
            const leaveAction = () => {
                if (actionType === 'key') {
                    this.keys[actionKey] = false;
                    delete this.keyPressTime[actionKey];
                } else if (actionType === 'mouse') {
                    this.mouseDown[actionKey] = false;
                } else if (actionType === 'button') {
                    delete this.buttonPressTime[actionKey];
                }
            };
            
            button.addEventListener('touchstart', startAction);
            button.addEventListener('touchend', stopAction);
            button.addEventListener('touchcancel', stopAction);
            button.addEventListener('mousedown', startAction);
            button.addEventListener('mouseup', stopAction);
            button.addEventListener('mouseleave', leaveAction);
        };
        
        addButtonListeners('rudderLeftBtn', 'key', 'a');
        addButtonListeners('rudderRightBtn', 'key', 'd');
        addButtonListeners('sailInBtn', 'mouse', 'left');
        addButtonListeners('sailOutBtn', 'mouse', 'right');
        addButtonListeners('forwardBtn', 'button', 'forward');
        addButtonListeners('sailBtn', 'button', 'sail');
    }
    
    createPoiButton(x, y, poiData) {
        // Create the button graphics directly in coastlineContainer
        const buttonGraphics = new PIXI.Graphics();
        
        // Initialize button renderer
        const button = new ButtonGraphics(
            buttonGraphics, 
            this.coastlineContainer, 
            x,
            y,
            () => {
                this.zoomToPoiBox(poiData, button);
                this.openPoiPanel(poiData);
            }
        );
        
        // Store reference to button in poiData for later access
        poiData.button = button;
        
        return button;
    }
    
    zoomToPoiBox(poiData, button) {
        if (!poiData.zoomBox || poiData.zoomBox.length !== 4) {
            return;
        }
        
        // Convert zoomBox coordinates from lat/lon to pixels
        // zoomBox format: [minLon, minLat, maxLon, maxLat]
        const [minLon, minLat, maxLon, maxLat] = poiData.zoomBox;
        
        const minX = minLon * this.coastline.chunkPixelSize / this.coastline.chunkSize;
        const minY = -maxLat * this.coastline.chunkPixelSize / this.coastline.chunkSize; // Note: Y is inverted
        const maxX = maxLon * this.coastline.chunkPixelSize / this.coastline.chunkSize;
        const maxY = -minLat * this.coastline.chunkPixelSize / this.coastline.chunkSize; // Note: Y is inverted
        
        // Calculate the width and height of the zoomBox in pixels
        const boxWidth = maxX - minX;
        const boxHeight = maxY - minY;
        
        // Calculate the scale needed to fit the zoomBox in the viewport
        const scaleX = this.width / boxWidth / this.coastline.scaleFactor;
        const scaleY = this.height / boxHeight  / this.coastline.scaleFactor;
        
        // Use the smaller scale to ensure the entire box fits
        const newScale = Math.min(scaleX, scaleY);

        // Calculate the center of the zoomBox
        const centerX = this.width / 2 + (this.boat.x - (minX + maxX) / 2) * newScale * this.coastline.scaleFactor;
        const centerY = this.height / 2 + (this.boat.y - (minY + maxY) / 2) * newScale * this.coastline.scaleFactor;
        
        // Use GSAP to tween the zoom over 0.5 seconds
        this.globalZoom(newScale,centerX,centerY).eventCallback("onComplete", () => {
            button.hide();
        });
    }

    globalZoom(scale,x,y) {
        return gsap.to(this.globalTransform, {
            scale: scale,
            x: x,
            y: y,
            duration: 0.5,
            ease: "power2.inOut",
            onUpdate: () => {
                this.worldContainer.x = this.globalTransform.x;
                this.worldContainer.y = this.globalTransform.y;
                this.worldContainer.scale.set(this.globalTransform.scale);
            }
        });
    }
    
    restoreOriginalZoom() {
        this.globalZoom(1,this.width/2,this.height/2);
    }
    
    openPoiPanel(poiData) {
        if (this.textPanel) {
            this.currentPoi = poiData;
            this.updatePanelContent(poiData);
            this.textPanel.classList.add('open');
            this.isPanelOpen = true;
        }
    }
    
    toggleTextPanel() {
        if (this.textPanel) {
            this.textPanel.classList.toggle('open');
            this.isPanelOpen = this.textPanel.classList.contains('open');
            
            // If panel is being closed, restore original zoom and show the POI button
            if (!this.isPanelOpen) {
                this.restoreOriginalZoom();
                if (this.currentPoi && this.currentPoi.button) {
                    this.currentPoi.button.show();
                }
            }
        }
    }
    
    updatePanelContent(poiData, subtitle = null) {
        // Update the panel title
        const titleElement = this.textPanel.querySelector('h2');
        if (titleElement) {
            titleElement.textContent = poiData.name;
            
            // Handle subtitle (add or remove)
            let subtitleElement = this.textPanel.querySelector('.panel-subtitle');
            if (subtitle) {
                if (!subtitleElement && titleElement.parentNode) {
                    subtitleElement = document.createElement('div');
                    subtitleElement.className = 'panel-subtitle';
                    titleElement.parentNode.insertBefore(subtitleElement, titleElement.nextSibling);
                }
                if (subtitleElement) {
                    subtitleElement.textContent = this.toTitleCase(subtitle);
                }
            } else if (subtitleElement) {
                subtitleElement.remove();
            }
        }
        
        // Clear and update the panel content
        const contentElement = this.textPanel.querySelector('.panel-content');
        if (contentElement) {
            contentElement.innerHTML = '';
            
            // Add actions section
            if (poiData.actions && poiData.actions.length > 0) {
                poiData.actions.forEach(action => {
                    const actionRow = document.createElement('div');
                    actionRow.className = 'panel-row';
                    const icon = this.getActionIcon(action);
                    actionRow.innerHTML = `
                        <span class="panel-icon">${icon}</span>
                        <span class="panel-text">${this.toTitleCase(action)}</span>
                    `;
                    actionRow.addEventListener('click', () => this.showDetail(action));
                    contentElement.appendChild(actionRow);
                });
            }
            
            // Add characters section
            if (poiData.characters && poiData.characters.length > 0) {
                const peopleHeader = document.createElement('div');
                peopleHeader.className = 'panel-section-header';
                peopleHeader.textContent = 'People';
                contentElement.appendChild(peopleHeader);
                
                poiData.characters.forEach(character => {
                    const characterRow = document.createElement('div');
                    characterRow.className = 'panel-row';
                    characterRow.innerHTML = `
                        <span class="panel-text">${this.toTitleCase(character)}</span>
                    `;
                    characterRow.addEventListener('click', () => this.showDetail(character));
                    contentElement.appendChild(characterRow);
                });
            }
        }
    }
    
    getActionIcon(action) {
        const iconMap = {
            'trade': '💰',
            'rest': '🛏️',
        };
        return iconMap[action.toLowerCase()] || '📍';
    }
    
    showDetail(name) {
        // Update the panel to show detail view with POI name as title and character/action as subtitle
        if (this.currentPoi) {
            this.updatePanelContent(this.currentPoi, name);
        }
        
        const contentElement = this.textPanel.querySelector('.panel-content');
        if (contentElement) {
            contentElement.innerHTML = '';
            
            // Create back button
            const backBtn = document.createElement('button');
            backBtn.className = 'back-btn';
            backBtn.textContent = '← Back';
            backBtn.addEventListener('click', () => {
                if (this.currentPoi) {
                    this.updatePanelContent(this.currentPoi);
                }
            });
            contentElement.appendChild(backBtn);
            
            // Create detail content area
            const detailDiv = document.createElement('div');
            detailDiv.className = 'detail-content';
            contentElement.appendChild(detailDiv);
        }
    }
    
    toTitleCase(str) {
        if (!str) return '';
        return str.replace(/\w\S*/g, (txt) => {
            return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase();
        });
    }
    
    setupCloseButton() {
        const closeBtn = document.getElementById('closePanelBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (this.isPanelOpen) {
                    this.toggleTextPanel();
                }
            });
        }
    }
    
    updateControls() {
        // Skip controls when panel is open
        if (this.isPanelOpen) {
            return;
        }
        
        const now = Date.now();
        const LONG_PRESS_DURATION = 3000;
        const SHORT_PRESS_DURATION = 1000;
        const SAIL_THRESHOLD = 0.5;
        
        if (this.keys['a']) {
            this.boat.rudderAngle = Math.max(-30, this.boat.rudderAngle - 2);
        } else if (this.keys['d']) {
            this.boat.rudderAngle = Math.min(30, this.boat.rudderAngle + 2);
        } else {
            this.boat.rudderAngle *= 0.95;
        }
        
        if (this.keys['w']) {
            this.applyRowingForce();
        }
        
        if (this.keys['s']) {
            this.applyRowingForce(false);
            const pressDuration = this.keyPressTime['s'] !== undefined ? now - this.keyPressTime['s'] : 0;
            if (pressDuration >= SHORT_PRESS_DURATION) {
                this.boat.sailHeight = 0;
            }
        }

        if (this.keys['q']) {
            const pressDuration = this.keyPressTime['q'] !== undefined ? now - this.keyPressTime['q'] : 0;
            if (pressDuration >= SHORT_PRESS_DURATION) {
                if (this.boat.sailHeight > SAIL_THRESHOLD) {
                    this.boat.sailHeight = 0;
                } else {
                    this.boat.sailHeight = 1.0;
                }
                this.keyPressTime['q'] = now;
            }
        }
        
        if (this.buttonPressTime['sail'] !== undefined) {
            const pressDuration = now - this.buttonPressTime['sail'];
            if (pressDuration >= SHORT_PRESS_DURATION) {
                if (this.boat.sailHeight > SAIL_THRESHOLD) {
                    this.boat.sailHeight = 0;
                } else {
                    this.boat.sailHeight = 1.0;
                }
                this.buttonPressTime['sail'] = now;
            }
        }

        if (this.buttonPressTime['forward'] !== undefined) {
            this.applyRowingForce();
        }
        
        if (this.mouseDown.left) {
            this.boat.sailAngle = Math.max(-180, this.boat.sailAngle - 2);
        }
        if (this.mouseDown.right) {
            this.boat.sailAngle = Math.min(0, this.boat.sailAngle + 2);
        }
    }
    
    applyRowingForce(forwards = true) {
        const rowingForce = 0.05;
        const maxForwardsRowSpeed = 0.6;
        const maxBackwardsRowSpeed = -0.2;
        if (forwards)
            this.boat.speed = Math.min(maxForwardsRowSpeed, this.boat.speed + rowingForce);
        else
            this.boat.speed = Math.max(maxBackwardsRowSpeed, this.boat.speed - rowingForce);
    }
    
    generateWindTargetAngle() {
        // Wind should point between north (3π/2), east (0/2π), and south (π/2)
        // This is the range from -π/2 to π/2, favoring angles closer to east (0)
        // Using power distribution to strongly favor center (east)
        const rand = Math.random(); // 0 to 1
        const centered = rand - 0.5; // -0.5 to 0.5
        // Use power of 3 to create strong bias toward center
        const biased = Math.sign(centered) * Math.pow(Math.abs(centered) * 2, 3) / 2;
        
        // Map to range [-π/2, π/2], biased toward 0 (east)
        const angle = biased * Math.PI;
        
        // Normalize to [0, 2π]
        return (angle + 2 * Math.PI) % (2 * Math.PI);
    }
    
    updateWind() {
        let angleDiff = this.wind.targetAngle - this.wind.angle;
        angleDiff = ((angleDiff + Math.PI) % (2 * Math.PI)) - Math.PI;
        
        if (Math.abs(angleDiff) > this.wind.targetThreshold) {
            this.wind.angle += Math.sign(angleDiff) * this.wind.changeRate;
        } else {
            this.wind.targetAngle = this.generateWindTargetAngle();
        }
        
        this.wind.angle = ((this.wind.angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    }
    
    updatePhysics() {
        // Skip physics when panel is open
        if (this.isPanelOpen) {
            return;
        }
        
        const boatAngle = this.boat.angle;
        const windAngle = this.wind.angle;
        const sailAngleRad = (this.boat.sailAngle * Math.PI) / 180;
        const waveMultiplier = 0.15;
        const tidalMultiplier = 1;
        const pullOffset = 0.7;
        const windwardAllowance = 0.5;
        
        let relativeWindAngle = windAngle - boatAngle;
        
        while (relativeWindAngle > Math.PI) relativeWindAngle -= 2 * Math.PI;
        while (relativeWindAngle < -Math.PI) relativeWindAngle += 2 * Math.PI;
        
        let sailEfficiency = Math.abs(Math.cos(relativeWindAngle - sailAngleRad)) * (Math.cos(relativeWindAngle) + windwardAllowance);
        
        const force = this.wind.speed * sailEfficiency * this.boat.sailHeight * 0.3;
        
        this.boat.speed += force * 0.05;
        this.boat.speed *= 0.98;
        this.boat.speed = Math.min(this.boat.maxSpeed, this.boat.speed);
        
        const turnRate = (this.boat.rudderAngle / 30) * 0.02 * this.boat.speed;
        this.boat.angle += turnRate;
        
        let waveSpeed = Math.max(0, Math.sin(this.time) + 2 * Math.sin(this.time / 2)) - pullOffset;
        waveSpeed = waveMultiplier * (waveSpeed > 0 ? waveSpeed * tidalMultiplier : waveSpeed / tidalMultiplier);
        
        this.boat.x += Math.cos(this.boat.angle) * this.boat.speed + waveSpeed;
        this.boat.y += Math.sin(this.boat.angle) * this.boat.speed;
    }
    
    drawOcean() {
        this.oceanRenderer.draw(this.waveOffset);
    }
    
    drawCoastline() {
        if (!this.coastline.indexLoaded || this.coastline.chunks.size === 0) {
            return;
        }
        
        const scale = this.coastline.scaleFactor;
        
        // Update coastline container position
        this.coastlineContainer.x = -this.boat.x * scale;
        this.coastlineContainer.y = -this.boat.y * scale;
        this.coastlineContainer.scale.set(scale);
        
        // Draw each loaded chunk
        for (const [key, chunk] of this.coastline.chunks.entries()) {
            if (!chunk.loaded || !chunk.texture) {
                continue;
            }
            
            // Create graphics if not already created
            if (!this.coastline.graphics.has(key)) {
                const chunkContainer = new PIXI.Container();
                const g = new PIXI.Graphics();

                const chunkX = chunk.x * this.coastline.chunkPixelSize / this.coastline.chunkSize;
                const chunkY = -chunk.y * this.coastline.chunkPixelSize / this.coastline.chunkSize;
                g.x = chunkX;
                g.y = chunkY;

                g.texture(chunk.texture);

                chunkContainer.addChild(g);
                this.coastlineContainer.addChild(chunkContainer);
                this.coastline.graphics.set(key, chunkContainer);
            }

            // Add POIs
            for (const poi of chunk.pois) {
                if (!poi.renderer) {
                    poi.renderer = this.createPoiButton(
                        poi.x * this.coastline.chunkPixelSize / this.coastline.chunkSize, 
                        -poi.y * this.coastline.chunkPixelSize / this.coastline.chunkSize,
                        poi
                    );
                }
                
                // Calculate distance from boat to POI
                const poiWorldX = poi.x * this.coastline.chunkPixelSize / this.coastline.chunkSize;
                const poiWorldY = -poi.y * this.coastline.chunkPixelSize / this.coastline.chunkSize;
                const dx = poiWorldX - this.boat.x;
                const dy = poiWorldY - this.boat.y;
                const distanceSquared = dx * dx + dy * dy;
                
                // Update button interactivity only when state changes (avoiding sqrt for performance)
                const isInRange = distanceSquared <= this.coastline.poiInteractionRadiusSquared;
                if (poi.renderer.isInteractive !== isInRange) {
                    poi.renderer.setInteractive(isInRange);
                }
            }
        }
    }
    
    drawWind() {
        this.windRenderer.draw(this.wind);
    }
    
    drawBoat() {
        this.boatRenderer.draw(this.boat);
    }
    
    updateUI() {
        const speedEl = document.getElementById('speed');
        const headingEl = document.getElementById('heading');
        const sailPosEl = document.getElementById('sailPos');
        
        if (speedEl) {
            speedEl.textContent = `Speed: ${this.boat.speed.toFixed(1)} knots`;
        }
        if (headingEl) {
            headingEl.textContent = `Heading: ${Math.round((this.boat.angle * 180 / Math.PI + 360) % 360)}°`;
        }
        if (sailPosEl) {
            sailPosEl.textContent = `Sail Height: ${Math.round(this.boat.sailHeight * 100)}%`;
        }
    }
    
    gameLoop() {
        // Wait for app to be initialized
        if (!this.app || !this.oceanGraphics) {
            requestAnimationFrame(() => this.gameLoop());
            return;
        }
        
        // Calculate delta time
        const currentTime = Date.now();
        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;
        
        this.updateControls();
        this.updateWind();
        this.updatePhysics();
        this.updateChunks();
        
        // Draw
        this.drawOcean();
        this.drawCoastline();
        this.drawWind();
        this.drawBoat();
        
        this.updateUI();
        
        // Update animation variables
        this.waveOffset += 0.02;
        this.time += 0.05;
        
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        window.game = new SailingGame(canvas);
    }
});

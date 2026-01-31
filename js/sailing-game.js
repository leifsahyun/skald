// Sailing Game - 2D JavaScript sailing simulation using Pixi.js
// Controls: A/D = rudder, W/S = row forwards/backwards, Q = raise/lower sail, Left/Right mouse = sail angle

class SailingGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.width = canvas.width;
        this.height = canvas.height;

        // Coastline configuration
        this.coastline = {
            scaleFactor: 2.0,
            chunks: new Map(),
            chunkIndex: [],
            chunkPixelSize: 1800,
            chunkSize: 0.5,
            loadDistance: 2,
            indexLoaded: false,
            graphics: new Map()
        };
        
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
        
        this.wind.targetAngle = Math.random() * Math.PI * 2;
        
        // Ocean animation
        this.waveOffset = 0;
        this.time = 0;
        
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
        
        this.app.stage.addChild(this.oceanContainer);
        this.app.stage.addChild(this.coastlineContainer);
        this.app.stage.addChild(this.boatContainer);
        this.app.stage.addChild(this.windContainer);
        
        // Create graphics objects
        this.oceanGraphics = new PIXI.Graphics();
        this.oceanContainer.addChild(this.oceanGraphics);
        
        this.boatGraphics = new PIXI.Graphics();
        this.boatContainer.addChild(this.boatGraphics);
        this.boatContainer.x = this.width / 2;
        this.boatContainer.y = this.height / 2;
        
        this.windGraphics = new PIXI.Graphics();
        this.windContainer.addChild(this.windGraphics);
        
        // Cache reference to text panel element
        this.textPanel = document.getElementById('textPanel');
        this.isPanelOpen = false;
        
        this.setupControls();
        this.setupCloseButton();
        this.createCircularButton();
        this.loadChunkIndex();
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
            loaded: false
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
    
    createCircularButton() {
        // Button position in world coordinates (near the boat starting position)
        this.buttonWorldX = this.boat.x - 50;
        this.buttonWorldY = this.boat.y - 50;
        
        // Create the circular button graphics directly in coastlineContainer
        this.buttonGraphics = new PIXI.Graphics();
        
        // Helper function to draw button with specified colors
        const drawButton = (outerColor, middleColor, innerColor) => {
            this.buttonGraphics.clear();
            this.buttonGraphics.zIndex = 1;
            this.buttonGraphics.setTransform((new PIXI.Matrix()).translate(this.buttonWorldX, this.buttonWorldY));
            // Outer white ring
            this.buttonGraphics.circle(0, 0, 10);
            this.buttonGraphics.stroke({width: 2, color: outerColor});
            
            // White middle circle
            this.buttonGraphics.circle(0, 0, 7);
            this.buttonGraphics.fill(middleColor);
            // Black inner circle
            this.buttonGraphics.circle(0, 0, 3);
            this.buttonGraphics.fill(innerColor);
        };
        
        // Draw initial button state
        drawButton(0xffffff, 0xffffff, 0x000000);
        
        // Add button directly to coastlineContainer
        this.coastlineContainer.addChild(this.buttonGraphics);
        
        // Make button interactive
        this.buttonGraphics.eventMode = 'static';
        this.buttonGraphics.cursor = 'pointer';
        
        // Add hover effect
        this.buttonGraphics.on('pointerover', () => {
            drawButton(0xe0e0e0, 0xe0e0e0, 0x333333);
        });
        
        this.buttonGraphics.on('pointerout', () => {
            drawButton(0xffffff, 0xffffff, 0x000000);
        });
        
        // Add click handler
        this.buttonGraphics.on('pointerdown', () => {
            this.toggleTextPanel();
        });
    }
    
    toggleTextPanel() {
        if (this.textPanel) {
            this.textPanel.classList.toggle('open');
            this.isPanelOpen = this.textPanel.classList.contains('open');
        }
    }
    
    setupCloseButton() {
        const closeBtn = document.getElementById('closePanelBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (this.textPanel && this.isPanelOpen) {
                    this.textPanel.classList.remove('open');
                    this.isPanelOpen = false;
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
    
    updateWind() {
        let angleDiff = this.wind.targetAngle - this.wind.angle;
        angleDiff = ((angleDiff + Math.PI) % (2 * Math.PI)) - Math.PI;
        
        if (Math.abs(angleDiff) > this.wind.targetThreshold) {
            this.wind.angle += Math.sign(angleDiff) * this.wind.changeRate;
        } else {
            this.wind.targetAngle = Math.random() * Math.PI * 2;
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
        const g = this.oceanGraphics;
        g.clear();
        
        // Draw gradient background (using multiple rectangles)
        const steps = 50;
        for (let i = 0; i < steps; i++) {
            const t = i / steps;
            let r, gr, b;
            if (t < 0.5) {
                const localT = t * 2;
                r = Math.floor(26 + (45 - 26) * localT);
                gr = Math.floor(95 + (125 - 95) * localT);
                b = Math.floor(122 + (165 - 122) * localT);
            } else {
                const localT = (t - 0.5) * 2;
                r = Math.floor(45 + (26 - 45) * localT);
                gr = Math.floor(125 + (79 - 125) * localT);
                b = Math.floor(165 + (106 - 165) * localT);
            }
            const color = (r << 16) | (gr << 8) | b;
            g.rect(0, i * this.height / steps, this.width, this.height / steps);
            g.fill(color);
        }
        
        // Draw animated waves
        for (let layer = 0; layer < 3; layer++) {
            const waveY = layer * 150;
            const waveSpeed = 0.5 + layer * 0.3;
            const waveHeight = 8 - layer * 2;
            const waveFreq = 0.015 + layer * 0.005;
            const alpha = 0.15 - layer * 0.04;
            
            for (let y = waveY; y < this.height; y += 40) {
                const points = [];
                for (let x = 0; x <= this.width; x += 5) {
                    const wave = Math.sin((x * waveFreq) + (-this.waveOffset * waveSpeed) + (y * 0.01)) * waveHeight;
                    points.push(x, y + wave);
                }
                g.moveTo(points[0], points[1]);
                for (let i = 2; i < points.length; i += 2) {
                    g.lineTo(points[i], points[i + 1]);
                }
                g.stroke({ width: 2, color: 0xffffff, alpha: alpha });
            }
        }
    }
    
    drawCoastline() {
        if (!this.coastline.indexLoaded || this.coastline.chunks.size === 0) {
            return;
        }
        
        const scale = this.coastline.scaleFactor;
        
        // Update coastline container position
        this.coastlineContainer.x = this.width / 2 - this.boat.x * scale;
        this.coastlineContainer.y = this.height / 2 - this.boat.y * scale;
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

                g.texture(chunk.texture);

                chunkContainer.addChild(g);
                this.coastlineContainer.addChild(chunkContainer);
                this.coastline.graphics.set(key, chunkContainer);
            }
            
            const chunkX = chunk.x * this.coastline.chunkPixelSize / this.coastline.chunkSize;
            const chunkY = -chunk.y * this.coastline.chunkPixelSize / this.coastline.chunkSize;
            this.coastline.graphics.get(key).x = chunkX;
            this.coastline.graphics.get(key).y = chunkY;
        }
    }
    
    drawWind() {
        const g = this.windGraphics;
        g.clear();
        
        const centerX = 100;
        const centerY = 100;
        
        // Wind indicator background
        g.circle(centerX, centerY, 50);
        g.fill({ color: 0xffffff, alpha: 0.9 });
        g.circle(centerX, centerY, 50);
        g.stroke({ width: 2, color: 0x2c3e50 });
        
        // Create text for compass directions (using PIXI.Text)
        if (!this.windText) {
            this.windText = {
                n: new PIXI.Text({ text: 'N', style: { fontFamily: 'Arial', fontSize: 14, fill: 0x2c3e50, align: 'center' } }),
                s: new PIXI.Text({ text: 'S', style: { fontFamily: 'Arial', fontSize: 14, fill: 0x2c3e50, align: 'center' } }),
                e: new PIXI.Text({ text: 'E', style: { fontFamily: 'Arial', fontSize: 14, fill: 0x2c3e50, align: 'center' } }),
                w: new PIXI.Text({ text: 'W', style: { fontFamily: 'Arial', fontSize: 14, fill: 0x2c3e50, align: 'center' } }),
                label: new PIXI.Text({ text: 'WIND', style: { fontFamily: 'Arial', fontSize: 12, fill: 0x2c3e50, align: 'center' } })
            };
            
            this.windText.n.anchor.set(0.5);
            this.windText.s.anchor.set(0.5);
            this.windText.e.anchor.set(0.5);
            this.windText.w.anchor.set(0.5);
            this.windText.label.anchor.set(0.5);
            
            this.windContainer.addChild(this.windText.n);
            this.windContainer.addChild(this.windText.s);
            this.windContainer.addChild(this.windText.e);
            this.windContainer.addChild(this.windText.w);
            this.windContainer.addChild(this.windText.label);
        }
        
        this.windText.n.x = centerX;
        this.windText.n.y = centerY - 35;
        this.windText.s.x = centerX;
        this.windText.s.y = centerY + 35;
        this.windText.e.x = centerX + 35;
        this.windText.e.y = centerY;
        this.windText.w.x = centerX - 35;
        this.windText.w.y = centerY;
        this.windText.label.x = centerX;
        this.windText.label.y = centerY + 70;
        
        // Wind arrow
        const arrowLength = 30;
        const arrowEndX = centerX + Math.cos(this.wind.angle) * arrowLength;
        const arrowEndY = centerY + Math.sin(this.wind.angle) * arrowLength;
        
        g.moveTo(centerX, centerY);
        g.lineTo(arrowEndX, arrowEndY);
        g.stroke({ width: 3, color: 0xe74c3c });
        
        // Arrow head
        const headAngle = this.wind.angle;
        const headSize = 10;
        g.moveTo(arrowEndX, arrowEndY);
        g.lineTo(
            arrowEndX - headSize * Math.cos(headAngle - Math.PI / 6),
            arrowEndY - headSize * Math.sin(headAngle - Math.PI / 6)
        );
        g.lineTo(
            arrowEndX - headSize * Math.cos(headAngle + Math.PI / 6),
            arrowEndY - headSize * Math.sin(headAngle + Math.PI / 6)
        );
        g.closePath();
        g.fill(0xe74c3c);
    }
    
    drawBoat() {
        const g = this.boatGraphics;
        g.clear();
        
        const boat = this.boat;
        
        // Set boat rotation
        this.boatContainer.rotation = boat.angle;
        
        // Boat hull - filled
        g.poly([
            boat.length / 2, 0,
            -boat.length / 2, boat.width / 2,
            -boat.length / 2, -boat.width / 2
        ]);
        g.fill(0x8b4513);
        
        // Boat hull - stroke
        g.poly([
            boat.length / 2, 0,
            -boat.length / 2, boat.width / 2,
            -boat.length / 2, -boat.width / 2
        ]);
        g.stroke({ width: 2, color: 0x654321 });
        
        // Deck detail
        g.poly([
            boat.length / 4, 0,
            -boat.length / 3, boat.width / 3,
            -boat.length / 3, -boat.width / 3
        ]);
        g.fill(0xa0522d);
        
        // Sail
        const mastHeight = 60 * this.boat.sailHeight;
        if (this.boat.sailHeight > 0.1) {
            const sailAngleRad = (boat.sailAngle * Math.PI) / 180;
            const cos = Math.cos(sailAngleRad);
            const sin = Math.sin(sailAngleRad);
            
            // Sail shadow
            const shadow = [
                {x: 2, y: -2},
                {x: 32 * this.boat.sailHeight, y: -mastHeight * 0.7},
                {x: 2, y: -mastHeight + 2}
            ];
            const shadowPoints = [];
            shadow.forEach(p => {
                const rx = p.x * cos - p.y * sin;
                const ry = p.x * sin + p.y * cos;
                shadowPoints.push(rx, ry);
            });
            g.poly(shadowPoints);
            g.fill({ color: 0x000000, alpha: 0.2 });
            
            // Main sail - fill
            const sail = [
                {x: 0, y: 0},
                {x: 30 * this.boat.sailHeight, y: -mastHeight * 0.7},
                {x: 0, y: -mastHeight}
            ];
            const sailPoints = [];
            sail.forEach(p => {
                const rx = p.x * cos - p.y * sin;
                const ry = p.x * sin + p.y * cos;
                sailPoints.push(rx, ry);
            });
            g.poly(sailPoints);
            g.fill(0xf0f0f0);
            
            // Main sail - stroke
            g.poly(sailPoints);
            g.stroke({ width: 1, color: 0x333333 });
            
            // Sail details (seams)
            const seam1 = {x: 0, y: -mastHeight * 0.3};
            const seam2 = {x: 20 * this.boat.sailHeight, y: -mastHeight * 0.5};
            const rx1 = seam1.x * cos - seam1.y * sin;
            const ry1 = seam1.x * sin + seam1.y * cos;
            const rx2 = seam2.x * cos - seam2.y * sin;
            const ry2 = seam2.x * sin + seam2.y * cos;
            g.moveTo(rx1, ry1);
            g.lineTo(rx2, ry2);
            g.stroke({ width: 1, color: 0x000000, alpha: 0.2 });
        }
        
        // Rudder indicator
        const rudderAngleRad = -(boat.rudderAngle * Math.PI) / 180;
        const rudderX = -boat.length / 2;
        const rudderEndX = rudderX + (-8) * Math.cos(rudderAngleRad);
        const rudderEndY = (-8) * Math.sin(rudderAngleRad);
        g.moveTo(rudderX, 0);
        g.lineTo(rudderEndX, rudderEndY);
        g.stroke({ width: 2, color: 0x333333 });
        
        // Wake effect
        if (boat.speed > 0.6) {
            for (let i = 0; i < 3; i++) {
                g.moveTo(-boat.length / 2 - i * 5, boat.width / 4);
                g.lineTo(-boat.length / 2 - i * 10, boat.width / 2 + i * 3);
                g.stroke({ width: 1, color: 0xffffff, alpha: 0.4 });
                g.moveTo(-boat.length / 2 - i * 5, -boat.width / 4);
                g.lineTo(-boat.length / 2 - i * 10, -boat.width / 2 - i * 3);
                g.stroke({ width: 1, color: 0xffffff, alpha: 0.4 });
            }
        }
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

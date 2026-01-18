// Sailing Game - 2D JavaScript sailing simulation
// Controls: A/D = rudder, W/S = raise/lower sail, Left/Right mouse = sail angle

class SailingGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        
        // Boat state
        this.boat = {
            x: this.width / 2,
            y: this.height / 2,
            angle: 0,           // Direction boat is facing (radians)
            speed: 0,
            rudderAngle: 0,     // Current rudder angle (-30 to 30 degrees)
            sailAngle: 0,       // Sail angle relative to boat (-90 to 90 degrees)
            sailHeight: 1.0,    // 0 to 1, how much sail is raised
            length: 40,
            width: 15
        };
        
        // Wind
        this.wind = {
            angle: Math.random() * Math.PI * 2,  // Wind direction (radians) - starts at random angle
            speed: 3.0,
            changeRate: 0.0005,  // How fast the wind angle changes (radians per frame)
            targetAngle: null,   // Target angle for wind to shift towards
            targetThreshold: 0.01  // How close to target before picking new target (radians)
        };
        
        // Initialize first target wind angle
        this.wind.targetAngle = Math.random() * Math.PI * 2;
        
        // Ocean animation
        this.waveOffset = 0;
        this.time = 0;
        
        // Controls
        this.keys = {};
        this.mouseDown = { left: false, right: false };
        
        this.setupControls();
        this.gameLoop();
    }
    
    setupControls() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        // Mouse controls for sail angle
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
        
        // Mobile control buttons
        this.setupMobileControls();
    }
    
    setupMobileControls() {
        // Helper function to add button event listeners
        const addButtonListeners = (buttonId, actionType, actionKey) => {
            const button = document.getElementById(buttonId);
            if (!button) return;
            
            const startAction = (e) => {
                e.preventDefault();
                if (actionType === 'key') {
                    this.keys[actionKey] = true;
                } else if (actionType === 'mouse') {
                    this.mouseDown[actionKey] = true;
                }
            };
            
            const stopAction = (e) => {
                e.preventDefault();
                if (actionType === 'key') {
                    this.keys[actionKey] = false;
                } else if (actionType === 'mouse') {
                    this.mouseDown[actionKey] = false;
                }
            };
            
            const leaveAction = () => {
                if (actionType === 'key') {
                    this.keys[actionKey] = false;
                } else if (actionType === 'mouse') {
                    this.mouseDown[actionKey] = false;
                }
            };
            
            button.addEventListener('touchstart', startAction);
            button.addEventListener('touchend', stopAction);
            button.addEventListener('mousedown', startAction);
            button.addEventListener('mouseup', stopAction);
            button.addEventListener('mouseleave', leaveAction);
        };
        
        // Rudder controls (equivalent to A/D keys)
        addButtonListeners('rudderLeftBtn', 'key', 'a');
        addButtonListeners('rudderRightBtn', 'key', 'd');
        
        // Sail angle controls (equivalent to left/right mouse buttons)
        addButtonListeners('sailInBtn', 'mouse', 'left');
        addButtonListeners('sailOutBtn', 'mouse', 'right');
    }
    
    updateControls() {
        // Rudder control (A/D keys)
        if (this.keys['a']) {
            this.boat.rudderAngle = Math.max(-30, this.boat.rudderAngle - 2);
        } else if (this.keys['d']) {
            this.boat.rudderAngle = Math.min(30, this.boat.rudderAngle + 2);
        } else {
            // Return to center
            this.boat.rudderAngle *= 0.95;
        }
        
        // Sail height (W/S keys)
        if (this.keys['w']) {
            this.boat.sailHeight = Math.min(1.0, this.boat.sailHeight + 0.02);
        }
        if (this.keys['s']) {
            this.boat.sailHeight = Math.max(0.0, this.boat.sailHeight - 0.02);
        }
        
        // Sail angle (Mouse buttons)
        if (this.mouseDown.left) {
            this.boat.sailAngle = Math.max(-180, this.boat.sailAngle - 2);
        }
        if (this.mouseDown.right) {
            this.boat.sailAngle = Math.min(0, this.boat.sailAngle + 2);
        }
    }
    
    updateWind() {
        // Gradually shift wind angle towards target angle
        let angleDiff = this.wind.targetAngle - this.wind.angle;
        
        // Normalize angle difference to -PI to PI (shortest path)
        angleDiff = ((angleDiff + Math.PI) % (2 * Math.PI)) - Math.PI;
        
        // Move wind angle towards target
        if (Math.abs(angleDiff) > this.wind.targetThreshold) {
            this.wind.angle += Math.sign(angleDiff) * this.wind.changeRate;
        } else {
            // Close enough to target, pick a new target angle
            this.wind.targetAngle = Math.random() * Math.PI * 2;
        }
        
        // Normalize wind angle to 0 to 2PI
        this.wind.angle = ((this.wind.angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    }
    
    updatePhysics() {
        // Calculate wind effectiveness based on sail angle and position
        const boatAngle = this.boat.angle;
        const windAngle = this.wind.angle;
        const sailAngleRad = (this.boat.sailAngle * Math.PI) / 180;
        const waveMultiplier = 0.15;
        const tidalMultiplier = 1;
        const pullOffset = 0.7;
        
        // Relative wind angle to boat
        let relativeWindAngle = windAngle - boatAngle;
        
        // Normalize to -PI to PI
        while (relativeWindAngle > Math.PI) relativeWindAngle -= 2 * Math.PI;
        while (relativeWindAngle < -Math.PI) relativeWindAngle += 2 * Math.PI;
        
        // Calculate how aligned the sail is with the wind
        const sailEfficiency = Math.max(Math.cos(relativeWindAngle - sailAngleRad), 0);
        
        // Apply force based on sail height and efficiency
        const force = this.wind.speed * sailEfficiency * this.boat.sailHeight * 0.3;
        
        // Update speed (with drag)
        this.boat.speed += force * 0.05;
        this.boat.speed *= 0.97; // Drag
        this.boat.speed = Math.max(0, Math.min(5, this.boat.speed));
        
        // Turn based on rudder (only when moving)
        if (this.boat.speed > 0.1) {
            const turnRate = (this.boat.rudderAngle / 30) * 0.02 * this.boat.speed;
            this.boat.angle += turnRate;
        }
        
        // Apply speed from waves
        let waveSpeed = Math.max(0, Math.sin(this.time) + 2 * Math.sin(this.time / 2)) - pullOffset;
        waveSpeed = waveMultiplier * (waveSpeed > 0 ? waveSpeed * tidalMultiplier : waveSpeed / tidalMultiplier);
        
        // Move boat
        this.boat.x += Math.cos(this.boat.angle) * this.boat.speed + waveSpeed;
        this.boat.y += Math.sin(this.boat.angle) * this.boat.speed;
        
        // Keep boat in bounds
        this.boat.x = Math.max(50, Math.min(this.width-50, this.boat.x));
        this.boat.y = Math.max(50, Math.min(this.height-50, this.boat.y));
    }
    
    drawOcean() {
        const ctx = this.ctx;
        
        // Base ocean color
        const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#1a5f7a');
        gradient.addColorStop(0.5, '#2d7da5');
        gradient.addColorStop(1, '#1a4f6a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw animated waves
        ctx.save();
        for (let layer = 0; layer < 3; layer++) {
            const waveY = layer * 150;
            const waveSpeed = 0.5 + layer * 0.3;
            const waveHeight = 8 - layer * 2;
            const waveFreq = 0.015 + layer * 0.005;
            
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 - layer * 0.04})`;
            ctx.lineWidth = 2;
            
            for (let y = waveY; y < this.height; y += 40) {
                ctx.beginPath();
                for (let x = 0; x <= this.width; x += 5) {
                    const wave = Math.sin((x * waveFreq) + (this.waveOffset * waveSpeed) + (y * 0.01)) * waveHeight;
                    if (x === 0) {
                        ctx.moveTo(x, y + wave);
                    } else {
                        ctx.lineTo(x, y + wave);
                    }
                }
                ctx.stroke();
            }
        }
        ctx.restore();
        
        // Draw wind sparkles on waves
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        for (let i = 0; i < 100; i++) {
            const x = (this.waveOffset * 50 * Math.sin(this.wind.angle) + i * 123) % this.width;
            const y = (this.waveOffset * 50 * Math.cos(this.wind.angle) + i * 87) % this.height;
            const size = Math.sin(this.time * 0.1 + i) * 1.5 + 2;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    drawWind() {
        const ctx = this.ctx;
        const centerX = 100;
        const centerY = 100;
        
        // Wind indicator background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 50, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Compass directions
        ctx.fillStyle = '#2c3e50';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('N', centerX, centerY - 35);
        ctx.fillText('S', centerX, centerY + 35);
        ctx.fillText('E', centerX + 35, centerY);
        ctx.fillText('W', centerX - 35, centerY);
        
        // Wind arrow
        const arrowLength = 30;
        const arrowEndX = centerX + Math.cos(this.wind.angle) * arrowLength;
        const arrowEndY = centerY + Math.sin(this.wind.angle) * arrowLength;
        
        ctx.strokeStyle = '#e74c3c';
        ctx.fillStyle = '#e74c3c';
        ctx.lineWidth = 3;
        
        // Arrow shaft
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(arrowEndX, arrowEndY);
        ctx.stroke();
        
        // Arrow head
        const headAngle = this.wind.angle;
        const headSize = 10;
        ctx.beginPath();
        ctx.moveTo(arrowEndX, arrowEndY);
        ctx.lineTo(
            arrowEndX - headSize * Math.cos(headAngle - Math.PI / 6),
            arrowEndY - headSize * Math.sin(headAngle - Math.PI / 6)
        );
        ctx.lineTo(
            arrowEndX - headSize * Math.cos(headAngle + Math.PI / 6),
            arrowEndY - headSize * Math.sin(headAngle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
        
        // Label
        ctx.fillStyle = '#2c3e50';
        ctx.font = '12px Arial';
        ctx.fillText('WIND', centerX, centerY + 70);
    }
    
    drawBoat() {
        const ctx = this.ctx;
        const boat = this.boat;
        
        ctx.save();
        ctx.translate(boat.x, boat.y);
        ctx.rotate(boat.angle);
        
        // Boat hull (simple triangle shape)
        ctx.fillStyle = '#8b4513';
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(boat.length / 2, 0);  // Bow (front)
        ctx.lineTo(-boat.length / 2, boat.width / 2);  // Stern port (back left)
        ctx.lineTo(-boat.length / 2, -boat.width / 2); // Stern starboard (back right)
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Deck detail
        ctx.fillStyle = '#a0522d';
        ctx.beginPath();
        ctx.moveTo(boat.length / 4, 0);
        ctx.lineTo(-boat.length / 3, boat.width / 3);
        ctx.lineTo(-boat.length / 3, -boat.width / 3);
        ctx.closePath();
        ctx.fill();
        
        // Mast
        const mastHeight = 60 * this.boat.sailHeight;
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -mastHeight);
        ctx.stroke();
        
        // Sail (triangle)
        if (this.boat.sailHeight > 0.1) {
            ctx.save();
            ctx.rotate((boat.sailAngle * Math.PI) / 180);
            
            // Sail shadow/depth
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.beginPath();
            ctx.moveTo(2, -2);
            ctx.lineTo(32 * this.boat.sailHeight, -mastHeight * 0.7);
            ctx.lineTo(2, -mastHeight + 2);
            ctx.closePath();
            ctx.fill();
            
            // Main sail
            ctx.fillStyle = '#f0f0f0';
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(30 * this.boat.sailHeight, -mastHeight * 0.7);
            ctx.lineTo(0, -mastHeight);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Sail details (seams)
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, -mastHeight * 0.3);
            ctx.lineTo(20 * this.boat.sailHeight, -mastHeight * 0.5);
            ctx.stroke();
            
            ctx.restore();
        }
        
        // Rudder indicator (small line at stern)
        ctx.save();
        ctx.translate(-boat.length / 2, 0);
        ctx.rotate(-(boat.rudderAngle * Math.PI) / 180);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-8, 0);
        ctx.stroke();
        ctx.restore();
        
        // Wake/trail effect when moving
        if (boat.speed > 0.5) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(-boat.length / 2 - i * 5, boat.width / 4);
                ctx.lineTo(-boat.length / 2 - i * 10, boat.width / 2 + i * 3);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(-boat.length / 2 - i * 5, -boat.width / 4);
                ctx.lineTo(-boat.length / 2 - i * 10, -boat.width / 2 - i * 3);
                ctx.stroke();
            }
        }
        
        ctx.restore();
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
        this.updateControls();
        this.updateWind();
        this.updatePhysics();
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw
        this.drawOcean();
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
        new SailingGame(canvas);
    }
});

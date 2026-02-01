// Button Graphics - Renders circular interactive button with hover effects

class ButtonGraphics {
    constructor(graphics, coastlineContainer, buttonWorldX, buttonWorldY, onClickCallback) {
        this.graphics = graphics;
        this.coastlineContainer = coastlineContainer;
        this.buttonWorldX = buttonWorldX;
        this.buttonWorldY = buttonWorldY;
        this.onClickCallback = onClickCallback;
        
        // Color constants
        this.COLOR_NORMAL_OUTER = 0xffffff;
        this.COLOR_NORMAL_MIDDLE = 0xffffff;
        this.COLOR_NORMAL_INNER = 0x000000;
        this.COLOR_HOVER_OUTER = 0xe0e0e0;
        this.COLOR_HOVER_MIDDLE = 0xe0e0e0;
        this.COLOR_HOVER_INNER = 0x333333;
        
        // Animation state for inner circle
        this.innerCircleOffsetX = 0;
        this.innerCircleOffsetY = 0;
        this.innerCircleTargetX = 0;
        this.innerCircleTargetY = 0;
        this.animationTimer = 0;
        this.nextAnimationTime = this.getRandomAnimationDelay();
        this.isAnimating = false;
        this.maxOffset = 3; // Maximum distance inner circle can move from center
        this.animationSpeed = 0.005; // Speed per millisecond for frame-rate independence
        
        // Track hover state
        this.isHovered = false;
        
        this.setupButton();
    }
    
    drawButton(outerColor, middleColor, innerColor) {
        this.graphics.clear();
        this.graphics.zIndex = 1;
        this.graphics.setTransform((new PIXI.Matrix()).translate(this.buttonWorldX, this.buttonWorldY));
        // Outer white ring
        this.graphics.circle(0, 0, 10);
        this.graphics.stroke({width: 2, color: outerColor});
        
        // White middle circle
        this.graphics.circle(0, 0, 7);
        this.graphics.fill(middleColor);
        // Black inner circle - with animated offset
        this.graphics.circle(this.innerCircleOffsetX, this.innerCircleOffsetY, 3);
        this.graphics.fill(innerColor);
    }
    
    setupButton() {
        // Draw initial button state
        this.drawButton(this.COLOR_NORMAL_OUTER, this.COLOR_NORMAL_MIDDLE, this.COLOR_NORMAL_INNER);
        
        // Add button directly to coastlineContainer
        this.coastlineContainer.addChild(this.graphics);
        
        // Make button interactive
        this.graphics.eventMode = 'static';
        this.graphics.cursor = 'pointer';
        
        // Add hover effect
        this.graphics.on('pointerover', () => {
            this.isHovered = true;
            this.drawButton(this.COLOR_HOVER_OUTER, this.COLOR_HOVER_MIDDLE, this.COLOR_HOVER_INNER);
        });
        
        this.graphics.on('pointerout', () => {
            this.isHovered = false;
            this.drawButton(this.COLOR_NORMAL_OUTER, this.COLOR_NORMAL_MIDDLE, this.COLOR_NORMAL_INNER);
        });
        
        // Add click handler
        this.graphics.on('pointerdown', () => {
            this.onClickCallback();
        });
    }
    
    getRandomAnimationDelay() {
        // Random delay between 2-5 seconds
        return 2000 + Math.random() * 3000;
    }
    
    getRandomTarget() {
        // Generate random position within maxOffset radius
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * this.maxOffset;
        return {
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance
        };
    }
    
    update(deltaTime) {
        this.animationTimer += deltaTime;
        
        // Check if it's time to start a new animation
        if (!this.isAnimating && this.animationTimer >= this.nextAnimationTime) {
            this.isAnimating = true;
            const target = this.getRandomTarget();
            this.innerCircleTargetX = target.x;
            this.innerCircleTargetY = target.y;
            this.animationTimer = 0;
        }
        
        // Animate towards target
        if (this.isAnimating) {
            const dx = this.innerCircleTargetX - this.innerCircleOffsetX;
            const dy = this.innerCircleTargetY - this.innerCircleOffsetY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 0.1) {
                // Reached target
                this.innerCircleOffsetX = this.innerCircleTargetX;
                this.innerCircleOffsetY = this.innerCircleTargetY;
                this.isAnimating = false;
                this.nextAnimationTime = this.getRandomAnimationDelay();
                this.animationTimer = 0;
            } else {
                // Move towards target with frame-rate independent speed
                const speed = this.animationSpeed * deltaTime;
                const moveAmount = Math.min(speed * distance, distance);
                this.innerCircleOffsetX += (dx / distance) * moveAmount;
                this.innerCircleOffsetY += (dy / distance) * moveAmount;
            }
            
            // Redraw button with new position, maintaining hover state
            if (this.isHovered) {
                this.drawButton(this.COLOR_HOVER_OUTER, this.COLOR_HOVER_MIDDLE, this.COLOR_HOVER_INNER);
            } else {
                this.drawButton(this.COLOR_NORMAL_OUTER, this.COLOR_NORMAL_MIDDLE, this.COLOR_NORMAL_INNER);
            }
        }
    }
}

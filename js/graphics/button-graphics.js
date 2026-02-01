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
        this.maxOffset = 3; // Maximum distance inner circle can move from center
        
        // Track hover state
        this.isHovered = false;
        
        this.setupButton();
        this.setupAnimation();
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
    
    setupAnimation() {
        // Generate random keyframe positions for smooth organic movement
        const generateKeyframes = () => {
            const keyframes = [0]; // Start at center
            for (let i = 0; i < 4; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * this.maxOffset;
                keyframes.push(Math.cos(angle) * distance);
            }
            keyframes.push(0); // Return to center
            return keyframes;
        };
        
        // Use GSAP to animate the inner circle with keyframes
        gsap.to(this, {
            keyframes: {
                innerCircleOffsetX: generateKeyframes(),
                innerCircleOffsetY: generateKeyframes(),
                ease: 'none',
                easeEach: 'power2.inOut',
            },
            duration: 5,
            repeat: -1,
            yoyo: true,
            onUpdate: () => {
                // Redraw button with new position, maintaining hover state
                if (this.isHovered) {
                    this.drawButton(this.COLOR_HOVER_OUTER, this.COLOR_HOVER_MIDDLE, this.COLOR_HOVER_INNER);
                } else {
                    this.drawButton(this.COLOR_NORMAL_OUTER, this.COLOR_NORMAL_MIDDLE, this.COLOR_NORMAL_INNER);
                }
            }
        });
    }
}

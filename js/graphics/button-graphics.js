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
        const animations = [
            [
                [0,0],[0,4],[0,0],[0,-4],[0,0]
            ],
            [
                [0,0],[4,0],[0,0],[-4,0],[0,0]
            ],
            [
                [0,0],[2.8,2.8],[2.8,2.8],[2.8,-2.8],[2.8,-2.8],[4,0],[2.8,2.8],[0,4],[-2.8,2.8],[-4,0],[-2.8,-2.8],[0,-4],[0,0]
            ],
            [
                [0,0],[-2.8,-2.8],[-2.8,-2.8],[2.8,-2.8],[2.8,-2.8],[0,-4],[-2.8,-2.8],[-4,0],[-2.8,2.8],[0,4],[2.8,2.8],[4,0],[0,0]
            ],
        ];

        const anim = animations[Math.floor(Math.random() * animations.length)];
        
        // Use GSAP to animate the inner circle with keyframes
        gsap.to(this, {
            keyframes: {
                innerCircleOffsetX: anim.map((a) => a[0]),
                innerCircleOffsetY: anim.map((a) => a[1]),
                ease: 'none',
                easeEach: 'sine.out',
            },
            duration: 5,
            onUpdate: () => {
                // Redraw button with new position, maintaining hover state
                if (this.isHovered) {
                    this.drawButton(this.COLOR_HOVER_OUTER, this.COLOR_HOVER_MIDDLE, this.COLOR_HOVER_INNER);
                } else {
                    this.drawButton(this.COLOR_NORMAL_OUTER, this.COLOR_NORMAL_MIDDLE, this.COLOR_NORMAL_INNER);
                }
            },
            onComplete: () => {
                // Do a new animation after a delay
                setTimeout(this.setupAnimation, 2000 + Math.random() * 3000);
            }
        });
    }
}

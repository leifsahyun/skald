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

        // Radii
        this.radiusOuter = 8;
        this.radiusMiddle = 5;
        this.radiusInner = 3;
        
        // Animation state for inner circle
        this.innerCircleOffsetX = 0;
        this.innerCircleOffsetY = 0;
        this.pupilAngle = 0;
        this.maxOffset = 3; // Maximum distance inner circle can move from center

        this.blinkTime = 80;
        this.blink = Date.now() - this.blinkTime;
        
        // Track hover state
        this.isHovered = false;
        
        // Track interaction state
        this.isInteractive = true;
        
        this.setupButton();
        this.setupAnimation();
    }
    
    drawButton(outerColor, middleColor, innerColor) {
        this.graphics.clear();
        this.graphics.zIndex = 1;
        this.graphics.setTransform((new PIXI.Matrix()).rotate(this.pupilAngle).translate(this.buttonWorldX, this.buttonWorldY));

        if(Date.now() - this.blink < this.blinkTime)
        {
            this.graphics.rect(-this.radiusOuter, -2, this.radiusOuter * 2, 4);
            this.graphics.fill(outerColor);
            return;
        }
        
        // Outer white ring
        this.graphics.circle(0, 0, this.radiusOuter);
        this.graphics.stroke({width: 2, color: outerColor});
        
        // White middle circle
        this.graphics.circle(0, 0, this.radiusMiddle);
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
            if (!this.isInteractive) return;
            this.isHovered = true;
            this.drawButton(this.COLOR_HOVER_OUTER, this.COLOR_HOVER_MIDDLE, this.COLOR_HOVER_INNER);
        });
        
        this.graphics.on('pointerout', () => {
            if (!this.isInteractive) return;
            this.isHovered = false;
            this.drawButton(this.COLOR_NORMAL_OUTER, this.COLOR_NORMAL_MIDDLE, this.COLOR_NORMAL_INNER);
        });
        
        // Add click handler
        this.graphics.on('pointerdown', () => {
            if (!this.isInteractive) return;
            this.blinkNow();
            this.onClickCallback();
        });
    }

    draw() {
        // Redraw button with new position, maintaining hover state
        if (this.isHovered) {
            this.drawButton(this.COLOR_HOVER_OUTER, this.COLOR_HOVER_MIDDLE, this.COLOR_HOVER_INNER);
        } else {
            this.drawButton(this.COLOR_NORMAL_OUTER, this.COLOR_NORMAL_MIDDLE, this.COLOR_NORMAL_INNER);
        }
    }
    
    setInteractive(isInteractive) {
        // Update interactive state
        this.isInteractive = isInteractive;
        
        if (isInteractive) {
            this.graphics.eventMode = 'static';
            this.graphics.cursor = 'pointer';
        } else {
            this.graphics.eventMode = 'none';
            this.graphics.cursor = 'default';
            // Reset hover state when disabling interaction
            if (this.isHovered) {
                this.isHovered = false;
                this.drawButton(this.COLOR_NORMAL_OUTER, this.COLOR_NORMAL_MIDDLE, this.COLOR_NORMAL_INNER);
            }
        }
    }
    
    blinkNow() {
        this.blink = Date.now();
        this.draw();
        setTimeout(this.draw.bind(this), this.blinkTime);
    }
    
    setupAnimation() {
        const animations = [
            [
                [0,0,0]
            ],
            [
                [0,0,0],[0,0,0],[0,1.5,0],[0,-1.5,0],[0,0,0],[0,0,0]
            ],
            [
                [0,0,0],[0,0,0],[1.5,0,0],[-1.5,0,0],[0,0,0],[0,0,0]
            ],
            [
                [0,0,Math.PI/4],[2,0,Math.PI/4],[0,-2,Math.PI/4],[0,-2,Math.PI],[0,-2,2*Math.PI],[0,0,2*Math.PI],[0,0,0]
            ],
            [
                [0,0,Math.PI/4],[-2,0,Math.PI/4],[0,-2,Math.PI/4],[0,-2,-Math.PI],[0,-2,-2*Math.PI],[0,0,-2*Math.PI],[0,0,0]
            ],
        ];

        const anim = animations[Math.floor(Math.random() * animations.length)];

        const onComplete = () => {
            this.blinkNow();
            // Do a new animation after a delay
            setTimeout(this.setupAnimation.bind(this), 10000 + Math.random() * 20000);
        };
        
        // Use GSAP to animate the inner circle with keyframes
        gsap.to(this, {
            keyframes: {
                innerCircleOffsetX: anim.map((a) => a[0]),
                innerCircleOffsetY: anim.map((a) => a[1]),
                pupilAngle: anim.map((a) => a[2]),
                ease: 'none',
                easeEach: 'sine.out',
            },
            duration: 3,
            onUpdate: this.draw.bind(this),
            onComplete: onComplete
        });
    }
    
    hide() {
        this.graphics.visible = false;
    }
    
    show() {
        this.graphics.visible = true;
    }
}

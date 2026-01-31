// Button Graphics - Renders circular interactive button with hover effects

class ButtonGraphics {
    constructor(graphics, coastlineContainer, buttonWorldX, buttonWorldY, onClickCallback) {
        this.graphics = graphics;
        this.coastlineContainer = coastlineContainer;
        this.buttonWorldX = buttonWorldX;
        this.buttonWorldY = buttonWorldY;
        this.onClickCallback = onClickCallback;
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
        // Black inner circle
        this.graphics.circle(0, 0, 3);
        this.graphics.fill(innerColor);
    }
    
    setupButton() {
        // Draw initial button state
        this.drawButton(0xffffff, 0xffffff, 0x000000);
        
        // Add button directly to coastlineContainer
        this.coastlineContainer.addChild(this.graphics);
        
        // Make button interactive
        this.graphics.eventMode = 'static';
        this.graphics.cursor = 'pointer';
        
        // Add hover effect
        this.graphics.on('pointerover', () => {
            this.drawButton(0xe0e0e0, 0xe0e0e0, 0x333333);
        });
        
        this.graphics.on('pointerout', () => {
            this.drawButton(0xffffff, 0xffffff, 0x000000);
        });
        
        // Add click handler
        this.graphics.on('pointerdown', () => {
            this.onClickCallback();
        });
    }
}

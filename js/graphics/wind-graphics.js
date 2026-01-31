// Wind Graphics - Renders wind indicator compass with arrow

class WindGraphics {
    constructor(graphics, windContainer) {
        this.graphics = graphics;
        this.windContainer = windContainer;
        this.windText = null;
    }
    
    draw(wind) {
        const g = this.graphics;
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
        const arrowEndX = centerX + Math.cos(wind.angle) * arrowLength;
        const arrowEndY = centerY + Math.sin(wind.angle) * arrowLength;
        
        g.moveTo(centerX, centerY);
        g.lineTo(arrowEndX, arrowEndY);
        g.stroke({ width: 3, color: 0xe74c3c });
        
        // Arrow head
        const headAngle = wind.angle;
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
}

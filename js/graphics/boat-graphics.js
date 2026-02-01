// Boat Graphics - Renders the sailing boat with hull, deck, sail, rudder, and wake

class BoatGraphics {
    constructor(graphics, boatContainer) {
        this.graphics = graphics;
        this.boatContainer = boatContainer;
    }
    
    draw(boat) {
        const g = this.graphics;
        g.clear();
        
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
        const mastHeight = 60 * boat.sailHeight;
        if (boat.sailHeight > 0.1) {
            const sailAngleRad = (boat.sailAngle * Math.PI) / 180;
            const cos = Math.cos(sailAngleRad);
            const sin = Math.sin(sailAngleRad);
            
            // Sail shadow
            const shadow = [
                {x: 2, y: -2},
                {x: 32 * boat.sailHeight, y: -mastHeight * 0.7},
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
                {x: 30 * boat.sailHeight, y: -mastHeight * 0.7},
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
            const seam2 = {x: 20 * boat.sailHeight, y: -mastHeight * 0.5};
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
}

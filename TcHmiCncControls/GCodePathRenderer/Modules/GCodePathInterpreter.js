// Keep these lines for a best effort IntelliSense of Visual Studio 2017 and higher.
/// <reference path="./../../../Packages/Beckhoff.TwinCAT.HMI.Framework.12.760.59/runtimes/native1.12-tchmi/TcHmi.d.ts" />

//const BABYLON = require('../lib/babylonjs');

class GCodePathInterpreter {

    constructor(scene) {
        this.scene = null;
        this.multiplier = 1.0;
        this.relative = false;
        this.prevPoint = { x: 0, y: 0, z: 0 };

    }

    // creates a path from
    // parsed GCode object array
    trace(gcode, scene) {
        if (scene)
            this.scene = scene;

        const parser = new GCodeParser();
        const parsed = parser.Parse(gcode);
        
        const parent = this;
        parsed.forEach(x => {
            // exists method for gcode
            const code = x.code.toLowerCase();
            if (parent[code]) {
                parent[code](x.args, x.line);
            }
        });
    }

    getScaledPoint(args) {
        let ret = {};
        if (args.X !== undefined) {
            ret.x = args.X * this.multiplier;
            ret.y = args.Y * this.multiplier || 0;
            ret.z = args.Z * this.multiplier || 0;
            if (args.I !== undefined) {
                ret.i = args.I * this.multiplier;
                ret.j = args.J * this.multiplier;
            }
            return ret;
        }
    }

    g0(args, lineNum) { this.g00(args, lineNum) }
    g00(args, lineNum) {
        this.g01(args, lineNum);
    }

    g1(args, lineNum) { this.g01(args, lineNum) }
    g01(args, lineNum) {
        const point = this.getScaledPoint(args);
        if (point) {
            console.log({ prev: this.prevPoint, cur: point });
            BABYLON.MeshBuilder.CreateLines(lineNum.toString(), { points: [this.prevPoint, point] }, this.scene);
            this.prevPoint = point;
        }
    }

    g2(args, lineNum) { this.g02(args, lineNum) }
    g02(args, lineNum) {
        const dest = this.getScaledPoint(args);
        const step = Math.PI / 22.5;
        const points = this.calculateArcPoints(
            this.prevPoint.x, this.prevPoint.y, this.prevPoint.z,
            dest.x, dest.y, dest.i, dest.j,
            true, step);
        BABYLON.MeshBuilder.CreateLines(lineNum.toString(), { points: points }, this.scene);
        this.prevPoint = points[points.length - 1];
    }

    g3(args, lineNum) { this.g03(args, lineNum) }
    g03(args, lineNum) {
        const dest = this.getScaledPoint(args);
        const step = Math.PI / 22.5;
        const points = this.calculateArcPoints(
            this.prevPoint.x, this.prevPoint.y, this.prevPoint.z,
            dest.x, dest.y, dest.i, dest.j,
            false, step);

        console.log(points);
        BABYLON.MeshBuilder.CreateLines(lineNum.toString(), { points: points }, this.scene);
        this.prevPoint = points[points.length - 1];
    }

    g17(args, lineNum) { }
    g28(args, lineNum) { }

    // 1-to-1 mm units in rendering
    g70(args, lineNum) { this.multiplier = 25.4 }
    g71(args, lineNum) { this.multiplier = 1.0 }

    g90(args, lineNum) { this.relative = false }
    g91(args, lineNum) { this.relative = true }

    // calculate g2 and g3 arcs
    calculateArcPoints(X0, Y0, Z0, X1, Y1, I, J, isClockwise, stepSize) {
        const Xc = X0 + I;
        const Yc = Y0 + J;
        const R = Math.sqrt(I * I + J * J);

        let theta0 = Math.atan2(Y0 - Yc, X0 - Xc);
        let theta1 = Math.atan2(Y1 - Yc, X1 - Xc);

        // Normalize angles to ensure proper direction
        if (isClockwise) {
            if (theta1 >= theta0) theta1 -= 2 * Math.PI;
        } else {
            if (theta1 <= theta0) theta1 += 2 * Math.PI;
        }

        const points = [];
        const totalSteps = Math.abs((theta1 - theta0) / stepSize);
        for (let step = 0; step <= totalSteps; step++) {
            const theta = theta0 + step * stepSize * (isClockwise ? -1 : 1);
            const X = Xc + R * Math.cos(theta);
            const Y = Yc + R * Math.sin(theta);
            points.push({ x: X, y: Y, z: Z0 });

            // Break condition to avoid drawing a full circle
            if ((isClockwise && theta <= theta1) || (!isClockwise && theta >= theta1)) {
                break;
            }
        }

        // Add the end point to ensure accuracy
        points.push({ x: X1, y: Y1, z: Z0 });

        return points;
    }

    /*
    public void DrawArcBetweenTwoPoints(Graphics g, Pen pen,  PointF a, PointF b, float radius, bool flip = false)
    {
        if (flip)
        {
            PointF temp = b;
            b =a;
            a = temp;
        }

        // get distance components
        double x = b.X-a.X, y = b.Y-a.Y;
        // get orientation angle
        var θ = Math.Atan2(y, x);
        // length between A and B
        var l = Math.Sqrt(x*x+y*y);
        if (2*radius>=l)
        {
            // find the sweep angle (actually half the sweep angle)
            var φ = Math.Asin(l/(2*radius));
            // triangle height from the chord to the center
            var h = radius*Math.Cos(φ);
            // get center point. 
            // Use sin(θ)=y/l and cos(θ)=x/l
            PointF C = new PointF(
                (float)(a.X + x/2 - h*(y/l)),
                (float)(a.Y + y/2 + h*(x/l)));

            g.DrawLine(Pens.DarkGray, C, a);
            g.DrawLine(Pens.DarkGray, C, b);
            DrawPoint(g, Brushes.Orange, C);

            // Conversion factor between radians and degrees
            const double to_deg = 180/Math.PI;

            // Draw arc based on square around center and start/sweep angles
            g.DrawArc(pen, C.X-radius, C.Y-radius, 2*radius, 2*radius,
                (float)((θ-φ)*to_deg)-90, (float)(2*φ*to_deg));
        }
    }
    */

       //getCurvePoints(args, origin) {
    //    const dest = {
    //        x: args.X,
    //        y: args.Y,
    //        z: args.Z
    //    };

    //    // bezier curves toward point, gcode curves away from point
    //    // so we must invert point
    //    const invert = ((dest.x - origin.x > 0) === (dest.y - origin.y > 0));

    //    return [
    //        {
    //            x: origin.x + ((!invert) ? -(args?.J) : args?.J || 0),
    //            y: origin.y + ((!invert) ? -(args?.I) : args?.I || 0),
    //            z: origin.z + (args?.K || 0)
    //        },
    //        dest
    //    ];
    //}
}

// export for testing
try {
    if (process.env.NODE_ENV === 'test') {
        module.exports = GCodePathInterpreter;
    }
} catch (e) {
    // do nothing
}
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
            const line = BABYLON.MeshBuilder.CreateLines(lineNum.toString(), { points: [this.prevPoint, point] }, this.scene);
            line.color = new BABYLON.Color3(0, 0, 1)
            this.prevPoint = point;
        }
    }

    g2(args, lineNum) { this.g02(args, lineNum) }
    g02(args, lineNum) {
        const dest = this.getScaledPoint(args);
        const step = Math.PI / 90;
        const points = this.calculateArcPoints2(
            this.prevPoint.x, this.prevPoint.y, this.prevPoint.z,
            dest.x, dest.y, dest.z, dest.i, dest.j,
            true, 30);
        const line = BABYLON.MeshBuilder.CreateLines(lineNum.toString(), { points: points }, this.scene);
        line.color = new BABYLON.Color3(1, 0, 0)
        this.prevPoint = dest;
    }

    g3(args, lineNum) { this.g03(args, lineNum) }
    g03(args, lineNum) {
        const dest = this.getScaledPoint(args);
        const step = Math.PI / 90;
        const points = this.calculateArcPoints2(
            this.prevPoint.x, this.prevPoint.y, this.prevPoint.z,
            dest.x, dest.y, dest.z, dest.i, dest.j,
            true, 30);
        const line = BABYLON.MeshBuilder.CreateLines(lineNum.toString(), { points: points }, this.scene);
        line.color = new BABYLON.Color3(0, 1, 0)
        this.prevPoint = dest;
    }

    g17(args, lineNum) { }
    g28(args, lineNum) { }

    // 1-to-1 mm units in rendering
    g70(args, lineNum) { this.multiplier = 25.4 }
    g71(args, lineNum) { this.multiplier = 1.0 }

    g90(args, lineNum) { this.relative = false }
    g91(args, lineNum) { this.relative = true }


    calculateArcPoints2(x0, y0, z0, x1, y1, z1, i, j, isClockwise, numPoints) {
        // Calculate the radius (distance from center to start point)
        const radius = Math.sqrt((x0 - i) ** 2 + (y0 - j) ** 2);

        // Calculate the angle between start and end points
        const startAngle = Math.atan2(y0 - j, x0 - i);
        const endAngle = Math.atan2(y1 - j, x1 - i);

        // Ensure angle range is within [0, 2π]
        const fullCircle = 2 * Math.PI;
        const adjustedEndAngle = endAngle < startAngle ? endAngle + fullCircle : endAngle;

        // Determine the direction
        const angleDirection = isClockwise ? 1 : -1;
        const stepAngle = angleDirection * (adjustedEndAngle - startAngle) / numPoints;

        // Generate points along the arc
        const arcPoints = [];
        for (let t = 0; t <= numPoints; t++) {
            const angle = startAngle + t * stepAngle;
            const x = i + radius * Math.cos(angle);
            const y = j + radius * Math.sin(angle);
            arcPoints.push({ x: x, y: y, z: z0 });
        }

        return arcPoints;
    }

    // calculate g2 and g3 arcs
    calculateArcPoints(X0, Y0, Z0, X1, Y1, Z1, I, J, isClockwise, stepSize) {
        // center point
        const Xc = X0 + I;
        const Yc = Y0 + J;
        const R = Math.sqrt(I * I + J * J);

        let theta0 = Math.atan2(Y0 - Yc, X0 - Xc);
        let theta1 = Math.atan2(Y1 - Yc, X1 - Xc);

        // Calculate the sweep angle
        let deltaTheta = theta1 - theta0;

        // Normalize deltaTheta for proper direction
        //if (isClockwise) {
        //    if (deltaTheta >= 0) deltaTheta -= 2 * Math.PI;
        //} else {
        //    if (deltaTheta <= 0) deltaTheta += 2 * Math.PI;
        //}

        const points = [];
        const totalSteps = Math.abs(deltaTheta / stepSize);

        for (let step = 0; step <= totalSteps; step++) {
            const theta = theta0 + step * stepSize * (isClockwise ? -1 : 1);
            const X = Xc + R * Math.cos(theta);
            const Y = Yc + R * Math.sin(theta);
            points.push({ x: X, y: Y, z: Z0 });
        }

        //console.log({
        //    x0: X0,
        //    y0: Y0,
        //    x1: X1,
        //    y1: Y1,
        //    i: I,
        //    j: J,
        //    xc: Xc,
        //    yc: Yc,
        //    radius: R,
        //    theta0: theta0,
        //    theta1: theta1,
        //    stepSize: stepSize,
        //    cw: isClockwise,
        //    steps: totalSteps
        //});

        // Add the end point to ensure accuracy
        points.push({ x: X1, y: Y1, z: Z0 });

        return points;
    }
}

// export for testing
try {
    if (process.env.NODE_ENV === 'test') {
        module.exports = GCodePathInterpreter;
    }
} catch (e) {
    // do nothing
}

/*let currX = X0,
    currY = Y0,
    currZ = Z0;

let x = X1,
    y = Y1,
    z = Z1,
    i = I,
    j = J,
    cw = isClockwise;

let wholeCircle = currX == i && currY == y;
let centerX = currX + i;
let centerY = currY + j;

let arcRadius = Math.sqrt(i * i + j * j);
let arcCurrentAngle = Math.atan2(-j, -i);
let finalTheta = Math.atan2(y - centerY, x - centerX);

let totalArc;
if (wholeCircle) {
    totalArc = 2 * Math.PI;
}
else {
    totalArc = cw ? arcCurrentAngle - finalTheta : finalTheta - arcCurrentAngle;
    if (totalArc < 0.0) {
        totalArc += 2 * Math.PI;
    }
}

//let arcSegmentLength = this.; //hard coding this to 1mm segment for now

let totalSegments = (arcRadius * totalArc) / stepSize + 0.8;
if (totalSegments < 1) {
    totalSegments = 1;
}

let arcAngleIncrement = totalArc / totalSegments;
arcAngleIncrement *= cw ? -1 : 1;

let points = new Array();

let zDist = currZ - z;
let zStep = zDist / totalSegments;

//get points for the arc
let px = currX;
let py = currY;
let pz = currZ;
//calculate segments
let currentAngle = arcCurrentAngle;
for (let moveIdx = 0; moveIdx < totalSegments - 1; moveIdx++) {
    currentAngle += arcAngleIncrement;
    px = centerX + arcRadius * Math.cos(currentAngle);
    py = centerY + arcRadius * Math.sin(currentAngle);
    pz += zStep;
    points.push({ x: px, y: py, z: pz });
}

points.push({ x: x, y: y, z: z });

return points;
*/
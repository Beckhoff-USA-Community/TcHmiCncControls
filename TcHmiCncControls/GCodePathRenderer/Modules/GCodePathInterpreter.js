// Keep these lines for a best effort IntelliSense of Visual Studio 2017 and higher.
/// <reference path="./../../../Packages/Beckhoff.TwinCAT.HMI.Framework.12.760.59/runtimes/native1.12-tchmi/TcHmi.d.ts" />

class GCodePathInterpreter {

    constructor(scene) {
        this.scene = null;
        this.multiplier = 1.0;
        this.relative = false;
        this.prevPoint = { x: 0, y: 0, z: 0, i: 0, j: 0, k: 0 };
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

        if (args.X === undefined && args.Y === undefined && args.Z === undefined) {
            return;
        }
        ret.x = (args.X) ? Math.round(args.X * this.multiplier * 10000) / 10000 : this.prevPoint.x;
        ret.y = (args.Y) ? Math.round(args.Y * this.multiplier * 10000) / 10000 : this.prevPoint.y;
        ret.z = (args.Z) ? Math.round(args.Z * this.multiplier * 10000) / 10000 : this.prevPoint.z;
        ret.i = (args.I) ? Math.round(args.I * this.multiplier * 10000) / 10000 : this.prevPoint.i;
        ret.j = (args.J) ? Math.round(args.J * this.multiplier * 10000) / 10000 : this.prevPoint.j;
        ret.k = (args.K) ? Math.round(args.K * this.multiplier * 10000) / 10000 : this.prevPoint.k;

        return ret;
    }

    g0(args, lineNum) { this.g00(args, lineNum) }
    g00(args, lineNum) {
        this.g01(args, lineNum);
    }

    g1(args, lineNum) { this.g01(args, lineNum) }
    g01(args, lineNum) {
        const dest = this.getScaledPoint(args);
        if (dest) {
            const line = BABYLON.MeshBuilder.CreateLines(lineNum.toString(), { points: [this.prevPoint, dest] }, this.scene);
            line.color = new BABYLON.Color3(0, 0, 1)
            this.prevPoint = dest;
;
        }
    }

    g2(args, lineNum) { this.g02(args, lineNum) }
    g02(args, lineNum) {
        const dest = this.getScaledPoint(args);
        const points = this.calculateArcPoints(
            this.prevPoint,
            dest,
            { x: dest.i, y: dest.j, z: dest.k },
            true
        );

        const line = BABYLON.MeshBuilder.CreateLines(lineNum.toString(), { points: points }, this.scene);
        line.color = new BABYLON.Color3(1, 0, 0);
        this.prevPoint = dest;
    }

    g3(args, lineNum) { this.g03(args, lineNum) }
    g03(args, lineNum) {
        const dest = this.getScaledPoint(args);
        const points = this.calculateArcPoints(
            this.prevPoint,
            dest,
            { x: dest.i, y: dest.j, z: dest.k },
            false
        );

        const line = BABYLON.MeshBuilder.CreateLines(lineNum.toString(), { points: points }, this.scene);
        line.color = new BABYLON.Color3(0, 1, 0);
        this.prevPoint = dest;
;
    }

    g17(args, lineNum) { }
    g28(args, lineNum) { }

    // 1-to-1 mm units in rendering
    g70(args, lineNum) { this.multiplier = 25.4 }
    g71(args, lineNum) { this.multiplier = 1.0 }

    g90(args, lineNum) { this.relative = false }
    g91(args, lineNum) { this.relative = true }

    // algorithm reference:
    // https://github.com/NCalu/NCneticNpp/blob/main/NCneticCore/FAO.cs#L101
    calculateArcPoints(startPoint, endPoint, centerPoint, clockwise) {

        function Vec(p0, p1) {
            return { x: p1.x - p0.x, y: p1.y - p0.y, z: p1.z - p0.z };
        }

        function CrossProduct(v0, v1) {
            return {
                x: v0.y * v1.z - v0.z * v1.y,
                y: -v0.x * v1.z + v0.z * v1.x,
                z: v0.x * v1.y - v0.y * v1.x
            };
        }

        function MatProduct(m, v) {
            return {
                x: m[0][0] * v.x + m[0][1] * v.y + m[0][2] * v.z,
                y: m[1][0] * v.x + m[1][1] * v.y + m[1][2] * v.z,
                z: m[2][0] * v.x + m[2][1] * v.y + m[2][2] * v.z,
            };
        }

        function MatInverse(m) {

            let iv = new Array(3);
            iv[0] = new Array(3); iv[1] = new Array(3); iv[2] = new Array(3);

            const det = MatDet(m);

            iv[0][0] = (m[1][1] * m[2][2] - m[1][2] * m[2][1]) / det;
            iv[0][1] = -(m[0][1] * m[2][2] - m[0][2] * m[2][1]) / det;
            iv[0][2] = (m[0][1] * m[1][2] - m[0][2] * m[1][1]) / det;
                  
            iv[1][0] = -(m[1][0] * m[2][2] - m[1][2] * m[2][0]) / det;
            iv[1][1] = (m[0][0] * m[2][2] - m[0][2] * m[2][0]) / det;
            iv[1][2] = -(m[0][0] * m[1][2] - m[0][2] * m[1][0]) / det;
                  
            iv[2][0] = (m[1][0] * m[2][1] - m[1][1] * m[2][0]) / det;
            iv[2][1] = -(m[0][0] * m[2][1] - m[0][1] * m[2][0]) / det;
            iv[2][2] = (m[0][0] * m[1][1] - m[0][1] * m[1][0]) / det;

            return iv;
        }

        function MatDet(m) {
            return m[0][0] * m[1][1] * m[2][2] + m[0][1] * m[1][2] * m[2][0] +
                m[0][2] * m[1][0] * m[2][1] - m[0][2] * m[1][1] * m[2][0] -
                m[0][1] * m[1][0] * m[2][2] - m[0][0] * m[1][2] * m[2][1];
        }

        function DotProduct(v0, v1) {
            return v0.x * v1.x + v0.y * v1.y + v0.z * v1.z;
        }

        function VecNorm(v) {
            return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        }

        function Normalize(v) {
            const norm = VecNorm(v);
            return { x: v.x / norm, y: v.y / norm, z: v.z / norm };
        }

        let points = [];

        let v0 = Vec(centerPoint, startPoint);
        let v1 = Vec(centerPoint, endPoint);
        let v2 = CrossProduct(v0, v1);

        // TODO: XZ / YZ working planes
        // XY plane
        if (true) {
            v0 = Vec({ x: centerPoint.x, y: centerPoint.y, z: startPoint.z }, startPoint);
            v1 = Vec(
                { x: centerPoint.x, y: centerPoint.y, z: startPoint.z },
                { x: endPoint.x, y: endPoint.y, z: startPoint.z }
            );
            v2 = CrossProduct(v0, v1);
        }

        v2 = Normalize(v2);

        let transformMatrix = [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]];

        // TODO: XZ / YZ working planes
        // XY plane
        if (true) {
            v2 = Vec({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 });
        }

        if (VecNorm(Normalize(v2)) !== 0) {

            let xt = Normalize(v0);
            let zt = Normalize(v2);
            let dir = DotProduct({ x: 1, y: 1, z: 1 }, v2);
            let yt = CrossProduct(zt, xt);

            transformMatrix[0][0] = xt.x;
            transformMatrix[0][1] = xt.y;
            transformMatrix[0][2] = xt.z;

            transformMatrix[1][0] = yt.x;
            transformMatrix[1][1] = yt.y;
            transformMatrix[1][2] = yt.z;

            transformMatrix[2][0] = zt.x;
            transformMatrix[2][1] = zt.y;
            transformMatrix[2][2] = zt.z;
        } else {
            // return original move
        }

        let v0t = MatProduct(transformMatrix, v0);
        let v1t = MatProduct(transformMatrix, v1);

        let radius = VecNorm(v0t);
        let a0 = Math.atan2(v0t.y, v0t.x);
        let a1 = Math.atan2(v1t.y, v1t.x);

        if (Math.abs(a1) < 1E-6) {
            if (clockwise)
                a1 = -2 * Math.PI;
            else
                a1 = 2 * Math.PI;
        } else if (Math.abs(a1 - Math.PI) < 1E-6) {
            if (clockwise)
                a1 = -Math.PI;
            else
                a1 = Math.PI;
        } else {
            if (clockwise) {
                if (a1 > 0)
                    a1 = a1 - 2 * Math.PI;
            } else {
                if (a1 < 0)
                    a1 = a1 + 2 * Math.PI;
            }
        }

        // TODO: hardcoded segment count
        let da = 2 * Math.PI / 64;
        let nseg = parseInt(Math.ceil(Math.abs(a1 - a0) / da));
        let p0 = { x: startPoint.x, y: startPoint.y, z: startPoint.z };
        let invTransform = MatInverse(transformMatrix);

        points.push(startPoint);
        for (let i = 1; i <= nseg; i++) {
            let coords = {};
            // TODO: XZ / YZ working planes
            // XY plane
            if (true) {
                coords = {
                    x: invTransform[0][0] * (radius * Math.cos(a0 + i * (a1 - a0) / nseg)) + invTransform[0][1] * (radius * Math.sin(a0 + i * (a1 - a0) / nseg)) + centerPoint.x,
                    y: invTransform[1][0] * (radius * Math.cos(a0 + i * (a1 - a0) / nseg)) + invTransform[1][1] * (radius * Math.sin(a0 + i * (a1 - a0) / nseg)) + centerPoint.y,
                    z: startPoint.z + i * (endPoint.z - startPoint.z ) / nseg
                };
                points.push(coords);
            }
        }

        return points;
    }

    arcMidpoint3D(startPoint, endPoint, centerPoint, clockwise) {
        // Helper function to subtract two vectors
        function subtractVectors(a, b) {
            return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
        }

        // Helper function to add two vectors
        function addVectors(a, b) {
            return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
        }

        // Helper function to scale a vector by a scalar
        function scaleVector(v, s) {
            return { x: v.x * s, y: v.y * s, z: v.z * s };
        }

        // Helper function to compute the cross product of two vectors
        function crossProduct(a, b) {
            return {
                x: a.y * b.z - a.z * b.y,
                y: a.z * b.x - a.x * b.z,
                z: a.x * b.y - a.y * b.x
            };
        }

        // Helper function to compute the dot product of two vectors
        function dotProduct(a, b) {
            return a.x * b.x + a.y * b.y + a.z * b.z;
        }

        // Helper function to compute the magnitude of a vector
        function magnitude(v) {
            return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        }

        // Helper function to normalize a vector
        function normalize(v) {
            const mag = magnitude(v);
            return { x: v.x / mag, y: v.y / mag, z: v.z / mag };
        }

        // Find vectors from center to start and end points
        const startVector = subtractVectors(startPoint, centerPoint);
        const endVector = subtractVectors(endPoint, centerPoint);

        // Find the normal to the plane of the arc (cross product of start and end vectors)
        const normal = normalize(crossProduct(startVector, endVector));

        // Helper function to project a vector onto a plane defined by its normal
        function projectOntoPlane(vector, planeNormal) {
            const dot = dotProduct(vector, planeNormal);
            const projection = subtractVectors(vector, scaleVector(planeNormal, dot));
            return projection;
        }

        // Project the start and end vectors onto the plane
        const projectedStart = normalize(projectOntoPlane(startVector, normal));
        const projectedEnd = normalize(projectOntoPlane(endVector, normal));

        // Helper function to calculate the angle between two vectors in the plane
        function angleBetweenVectorsInPlane(v1, v2, planeNormal) {
            const dot = dotProduct(v1, v2);
            const cross = crossProduct(v1, v2);
            const angle = Math.atan2(dotProduct(cross, planeNormal), dot);
            return angle;
        }

        // Calculate the angle of the start and end vectors
        const startAngle = Math.atan2(projectedStart.y, projectedStart.x);
        const endAngle = Math.atan2(projectedEnd.y, projectedEnd.x);

        // Normalize angles to be between 0 and 2 * PI
        const twoPi = 2 * Math.PI;
        let normalizedStartAngle = startAngle >= 0 ? startAngle : twoPi + startAngle;
        let normalizedEndAngle = endAngle >= 0 ? endAngle : twoPi + endAngle;

        // Calculate the midpoint angle
        let midpointAngle;
        if (clockwise) {
            if (normalizedStartAngle < normalizedEndAngle) {
                normalizedStartAngle += twoPi;
            }
            midpointAngle = (normalizedStartAngle + normalizedEndAngle) / 2;
        } else {
            if (normalizedEndAngle < normalizedStartAngle) {
                normalizedEndAngle += twoPi;
            }
            midpointAngle = (normalizedStartAngle + normalizedEndAngle) / 2;
        }

        // Ensure the midpoint angle is within the range [0, 2 * PI]
        midpointAngle = midpointAngle % twoPi;

        // Convert the midpoint angle back to Cartesian coordinates on the plane
        const radius = magnitude(startVector);
        const midpoint2D = {
            x: radius * Math.cos(midpointAngle),
            y: radius * Math.sin(midpointAngle)
        };

        // Convert the 2D midpoint back to 3D coordinates
        const midpointVector = addVectors(
            centerPoint,
            addVectors(
                scaleVector(projectedStart, Math.cos(midpointAngle)),
                scaleVector(crossProduct(normal, projectedStart), Math.sin(midpointAngle))
            )
        );

        return midpointVector;
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
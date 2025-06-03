// Keep these lines for a best effort IntelliSense of Visual Studio 2017 and higher.
/// <reference path="./../../../Packages/Beckhoff.TwinCAT.HMI.Framework.12.760.59/runtimes/native1.12-tchmi/TcHmi.d.ts" />


class GCodeTracedPath {
    constructor(code, id, points) {
        this.code = code;
        this.id = id;
        this.points = points;
    }
}

class GCodePathInterpreter {

    constructor(config) {
        this.unitScaling = 1.0;
        this.relative = false;
        this.prevPoint = { x: 0, y: 0, z: 0, i: 0, j: 0, k: 0 };
        this.ijkRelative = config.ijkRelative;
        this.maxArcPoints = config.maxArcRenderingPoints || 32;
        this.workOffsets = config.workOffsets;
        this.activeWorkOffset = { x: 0.0, y: 0.0, z: 0.0 };
    }

    // takes raw gcode string
    // parses and traces points for rendering
    // returns array of GCodeTracedPath
    Trace(gcode) {

        // parse
        const parser = new GCodeParser();
        const parsedLines = parser.Parse(gcode);

        const fns = this;

        // trace paths
        const points = parsedLines.reduce((arr, g) => {
            const code = g.code?.toLowerCase();
            if (fns[code]) {
                // call code function
                const path = fns[code](g.args);
                if (path)
                    arr.push(new GCodeTracedPath(code, g.line, path));
            }
            return arr;
        }, []);

        return points;
    }

    // processes code arguments, applies
    // unit scaling, relative positioning, active work offset
    // returns scaled { x, y, z, i, j, k, r } values
    getScaledPoint(args) {

        if (args.x === undefined && args.y === undefined && args.z === undefined) {
            return;
        }

        let x, y, z, i, j, k, r;

        if (args.x === undefined) {
            x = this.prevPoint.x;
        } else {
            const scaledX = args.x * this.unitScaling;
            x = ((this.relative) ? this.prevPoint.x + scaledX : this.activeWorkOffset.x + scaledX);
        }

        if (args.y === undefined) {
            y = this.prevPoint.y;
        } else {
            const scaledY = args.y * this.unitScaling;
            y = ((this.relative) ? this.prevPoint.y + scaledY : this.activeWorkOffset.y + scaledY);
        }

        if (args.z === undefined) {
            z = this.prevPoint.z;
        } else {
            const scaledZ = args.z * this.unitScaling;
            z = ((this.relative) ? this.prevPoint.z + scaledZ : this.activeWorkOffset.z + scaledZ);
        }

        i = (args.i !== undefined) ? ((args.i + this.activeWorkOffset.x) * this.unitScaling) : this.prevPoint.i;
        j = (args.j !== undefined) ? ((args.j + this.activeWorkOffset.y) * this.unitScaling) : this.prevPoint.j;
        k = (args.k !== undefined) ? ((args.k + this.activeWorkOffset.z) * this.unitScaling) : this.prevPoint.k;
        r = (args.r !== undefined) ? args.r : undefined;

        return { x: x, y: y, z: z, i: i, j: j, k: k, r: r };
    }

    g0(args) { return this.g00(args) }
    g00(args) {
        return this.g01(args);
    }

    g1(args) { return this.g01(args) }
    g01(args) {
        const dest = this.getScaledPoint(args);
        if (dest) {
            const ret = [this.prevPoint, dest];
            this.prevPoint = dest;
            return ret;
        }
    }

    g2(args) { return this.g02(args) }
    g02(args) {
        const dest = this.getScaledPoint(args);
        const center = this.calculateCenterPoint(this.prevPoint, dest, true);
        const points = this.calculateArcPoints(
            this.prevPoint,
            dest,
            center,
            true
        );

        this.prevPoint = dest;
        return points;
    }

    g3(args) { return this.g03(args) }
    g03(args) {
        const dest = this.getScaledPoint(args);
        const center = this.calculateCenterPoint(this.prevPoint, dest, false);
        const points = this.calculateArcPoints(
            this.prevPoint,
            dest,
            center,
            false
        );

        this.prevPoint = dest;
        return points;
    }

    g17(args) { }
    g28(args) { }

    // 1-to-1 inch units in rendering
    // CNC machines use 70 (inch) & 71 (mm) for units
    g70(args) { this.unitScaling = 1.0 }
    g71(args) { this.unitScaling = 1.0 / 25.4 }

    // 3D printers use 20/21 codes for units
    g20(args) { this.unitScaling = 1.0 }
    g21(args) { this.unitScaling = 1.0 / 25.4 }

    g90(args) { this.relative = false }
    g91(args) { this.relative = true }

    // work offsets
    g53(args) { 
        this.activeWorkOffset = {
            x: args.x || 0.0,
            y: args.y || 0.0,
            z: args.z || 0.0,
        };
    }
    g54(args) { this.activeWorkOffset = this.workOffsets.g54 }
    g55(args) { this.activeWorkOffset = this.workOffsets.g55 }
    g56(args) { this.activeWorkOffset = this.workOffsets.g56 }
    g57(args) { this.activeWorkOffset = this.workOffsets.g57 }
    g58(args) { this.activeWorkOffset = this.workOffsets.g58 }
    g59(args) { this.activeWorkOffset = this.workOffsets.g59 }

    // calculate center point for radius arcs (2D only)
    calculateCenterPoint(start, end, clockwise) {

        if (end.r) {
            const midpoint = {
                x: (start.x + end.x) / 2,
                y: (start.y + end.y) / 2
            };

            const halfLength = Math.sqrt(Math.pow(midpoint.x - end.x, 2) + Math.pow(midpoint.y - end.y, 2));
            const distanceToCenter = Math.sqrt(Math.pow(end.r, 2) - Math.pow(halfLength, 2));
            const angle = Math.atan2(end.y - start.y, end.x - start.x) + (clockwise ? -Math.PI / 2 : Math.PI / 2);

            return {
                x: midpoint.x + (distanceToCenter || 0) * Math.cos(angle),
                y: midpoint.y + (distanceToCenter || 0) * Math.sin(angle),
                z: start.z
            };
        } else {
            if (this.ijkRelative) {
                return { x: start.x + end.i, y: start.y + end.j, z: start.z + end.k };
            } else {
                return { x: end.i, y: end.j, z: end.k };
            }
        }
        
    }

    // Generate points along an arc given start, end, center points
    // algorithm reference:
    // https://github.com/NCalu/NCneticNpp/blob/main/NCneticCore/FAO.cs#L101
    calculateArcPoints(startPoint, endPoint, centerPoint, clockwise) {

        const m = this.MathHelpers;
        let points = [];

        let v0 = m.Vector(centerPoint, startPoint);
        let v1 = m.Vector(centerPoint, endPoint);
        let v2 = m.VectorCrossProduct(v0, v1);

        // TODO: XZ / YZ working planes
        // XY plane
        if (true) {
            v0 = m.Vector({ x: centerPoint.x, y: centerPoint.y, z: startPoint.z }, startPoint);
            v1 = m.Vector(
                { x: centerPoint.x, y: centerPoint.y, z: startPoint.z },
                { x: endPoint.x, y: endPoint.y, z: startPoint.z }
            );
            v2 = m.VectorCrossProduct(v0, v1);
        }

        v2 = m.VectorNormalize(v2);

        let transformMatrix = [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]];

        // TODO: XZ / YZ working planes
        // XY plane
        if (true) {
            v2 = m.Vector({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 });
        }

        if (m.VectorNormal(m.VectorNormalize(v2)) !== 0) {

            let xt = m.VectorNormalize(v0);
            let zt = m.VectorNormalize(v2);
            let dir = m.VectorDotProduct({ x: 1, y: 1, z: 1 }, v2);
            let yt = m.VectorCrossProduct(zt, xt);

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
            
            points.push(startPoint);
            return points;
        }

        let v0t = m.MatrixVectorProduct(transformMatrix, v0);
        let v1t = m.MatrixVectorProduct(transformMatrix, v1);

        let radius = m.VectorNormal(v0t);
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

        let da = 2 * Math.PI / this.maxArcPoints;
        let nseg = parseInt(Math.ceil(Math.abs(a1 - a0) / da));
        let p0 = { x: startPoint.x, y: startPoint.y, z: startPoint.z };
        let invTransform = m.MatrixInverse(transformMatrix);

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

    // Vector and matrix math helper functions
    MathHelpers = {
        Vector: function(p0, p1) {
            return { x: p1.x - p0.x, y: p1.y - p0.y, z: p1.z - p0.z };
        },
        VectorCrossProduct: function(v0, v1) {
            return {
                x: v0.y * v1.z - v0.z * v1.y,
                y: -v0.x * v1.z + v0.z * v1.x,
                z: v0.x * v1.y - v0.y * v1.x
            };
        },
        MatrixVectorProduct: function(m, v) {
            return {
                x: m[0][0] * v.x + m[0][1] * v.y + m[0][2] * v.z,
                y: m[1][0] * v.x + m[1][1] * v.y + m[1][2] * v.z,
                z: m[2][0] * v.x + m[2][1] * v.y + m[2][2] * v.z,
            };
        },
        MatrixInverse: function(m) {

            let iv = new Array(3);
            iv[0] = new Array(3); iv[1] = new Array(3); iv[2] = new Array(3);

            const det = this.MatrixDet(m);

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
        },
        MatrixDet: function(m) {
            return m[0][0] * m[1][1] * m[2][2] + m[0][1] * m[1][2] * m[2][0] +
                m[0][2] * m[1][0] * m[2][1] - m[0][2] * m[1][1] * m[2][0] -
                m[0][1] * m[1][0] * m[2][2] - m[0][0] * m[1][2] * m[2][1];
        },
        VectorDotProduct: function(v0, v1) {
            return v0.x * v1.x + v0.y * v1.y + v0.z * v1.z;
        },
        VectorNormal: function(v) {
            return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        },
        VectorNormalize: function(v) {
            const norm = this.VectorNormal(v);
            return { x: v.x / norm, y: v.y / norm, z: v.z / norm };
        }
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
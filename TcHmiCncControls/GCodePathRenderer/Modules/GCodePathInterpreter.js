// Keep these lines for a best effort IntelliSense of Visual Studio 2017 and higher.
/// <reference path="./../../../Packages/Beckhoff.TwinCAT.HMI.Framework.12.760.59/runtimes/native1.12-tchmi/TcHmi.d.ts" />

class GCodeInterpreterConfig {
    constructor(ijkRelative, arcSegmentCount, workOffsets) {
        this.ijkRelative = ijkRelative || false;
        this.arcSegmentCount = arcSegmentCount || 32;
        this.workOffsets = {
            g54: workOffsets?.g54 || { x: 0.0, y: 0.0, z: 0.0 },
            g55: workOffsets?.g55 || { x: 0.0, y: 0.0, z: 0.0 },
            g56: workOffsets?.g56 || { x: 0.0, y: 0.0, z: 0.0 },
            g57: workOffsets?.g57 || { x: 0.0, y: 0.0, z: 0.0 },
            g58: workOffsets?.g58 || { x: 0.0, y: 0.0, z: 0.0 },
            g59: workOffsets?.g59 || { x: 0.0, y: 0.0, z: 0.0 }
        };
    }
}

class GCodeTracedPath {
    constructor(code, id, points) {
        this.code = code;
        this.id = id;
        this.points = points;
    }
}

WorkingPlane = Object.freeze({
    XY: 0,
    XZ: 1,
    YZ: 2
});

class GCodePathInterpreter {
    constructor(config) {
        // init
        this.unitScaling = 1.0;
        this.relative = false;
        this.prevPoint = { x: 0, y: 0, z: 0, i: 0, j: 0, k: 0 };
        this.activeWorkOffset = { x: 0.0, y: 0.0, z: 0.0 };
        this.coordRotation = {
            enabled: false, offset: { x: 0.0, y: 0.0, r: 0.0 }
        };
        this.workingPlane = WorkingPlane.XY;

        // config
        this.ijkRelative = config.ijkRelative;
        this.arcSegmentCount = config.arcSegmentCount;
        this.workOffsets = config.workOffsets;   
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

    // processes code arguments 
    // applies unit scaling, relative positioning, active work offset
    // returns scaled gcode argument { x, y, z, i, j, k, r } values
    getScaledPoint(args, unitScaling, relative, prevPoint, workOffset) {

        if (args.x === undefined && args.y === undefined && args.z === undefined) {
            return;
        }

        let x, y, z, i, j, k, r;

        // x, y, z scaling & transformations
        if (args.x === undefined) {
            x = prevPoint.x;
        } else {
            const scaledX = args.x * unitScaling;
            x = ((relative) ? prevPoint.x + scaledX : workOffset.x + scaledX);
        }

        if (args.y === undefined) {
            y = prevPoint.y;
        } else {
            const scaledY = args.y * unitScaling;
            y = ((relative) ? prevPoint.y + scaledY : workOffset.y + scaledY);
        }

        if (args.z === undefined) {
            z = prevPoint.z;
        } else {
            const scaledZ = args.z * unitScaling;
            z = ((relative) ? prevPoint.z + scaledZ : workOffset.z + scaledZ);
        }

        // i, j, k scaling & transformations
        i = (args.i !== undefined) ? ((args.i + workOffset.x) * unitScaling) : prevPoint.i;
        j = (args.j !== undefined) ? ((args.j + workOffset.y) * unitScaling) : prevPoint.j;
        k = (args.k !== undefined) ? ((args.k + workOffset.z) * unitScaling) : prevPoint.k;
        r = (args.r !== undefined) ? args.r : undefined;

        return { x: x, y: y, z: z, i: i, j: j, k: k, r: r };
    }

    // generates path points from gcode type and args
    // returns array of Vector3
    getPathPoints(args, isArc, clockwise) {

        // get scaled destination point
        const dest = this.getScaledPoint(args, this.unitScaling, this.relative, this.prevPoint, this.activeWorkOffset);
        if (!dest) return;
        let points = [];

        // arc line - calculate intermediate path points
        if (isArc && clockwise != undefined) {
            const center = this.calculateCenterPoint(this.prevPoint, dest, clockwise, this.ijkRelative);
            points = this.calculateArcPoints(
                this.prevPoint,
                dest,
                center,
                clockwise,
                this.arcSegmentCount
            );
        } else {
            // straight line
            points = [this.prevPoint, dest];
        }

        this.prevPoint = dest;

        // apply g68 coord rotation
        if (this.coordRotation.enabled) {
            points = points.map(p => {
                const rotated = t.calculateCoordRotation(
                    p.x,
                    p.y,
                    this.coordRotation.offset.x + this.activeWorkOffset.x,
                    this.coordRotation.offset.y + this.activeWorkOffset.y,
                    this.coordRotation.offset.r
                );
                return { ...p, x: rotated.x, y: rotated.y };
            });
        }

        return points;
    }

    g00(args) {
        return this.g01(args);
    }

    g01(args) {
        return this.getPathPoints(args, false);
    }

    g02(args) {
        return this.getPathPoints(args, true, true);
    }

    g03(args) {
        return this.getPathPoints(args, true, false);
    }

    g17(args) { this.workingPlane = WorkingPlane.XY; }
    g18(args) { this.workingPlane = WorkingPlane.XZ; }
    g19(args) { this.workingPlane = WorkingPlane.YZ; }

    g28(args) { }

    g68(args) {
        if (!args.r) return;
        this.coordRotation.enabled = true;
        this.coordRotation.offset = { x: args.x || 0.0, y: args.y || 0.0, r: args.r };
    }
    g69(args) {
        this.coordRotation.enabled = false;
    }

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
    // returns vector3
    calculateCenterPoint(start, end, clockwise, ijkRelative) {

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
            if (ijkRelative) {
                return { x: start.x + end.i, y: start.y + end.j, z: start.z + end.k };
            } else {
                return { x: end.i, y: end.j, z: end.k };
            }
        }
        
    }

     // rotate point (x, y) around a center (cx, cy) by angle r (degrees)
    calculateCoordRotation(x, y, cx, cy, r) {

        const radians = (r * Math.PI) / 180;

        const dx = x - cx;
        const dy = y - cy;

        const xRot = dx * Math.cos(radians) - dy * Math.sin(radians);
        const yRot = dx * Math.sin(radians) + dy * Math.cos(radians);

        const offsetX = cx + xRot;
        const offsetY = cy + yRot;

        return {
            x: offsetX,
            y: offsetY
        };
    }

    // Generate points along an arc given start, end, center points
    // returns array[segmentCount + 1] of vector3
    calculateArcPoints(startPoint, endPoint, centerPoint, isClockwise, segmentCount, plane = WorkingPlane.XY) {

        let points = [];

        const planeMap = {
            [WorkingPlane.XY]: [startPoint.x, startPoint.y, endPoint.x, endPoint.y, centerPoint.x, centerPoint.y],
            [WorkingPlane.XZ]: [startPoint.x, startPoint.z, endPoint.x, endPoint.z, centerPoint.x, centerPoint.z],
            [WorkingPlane.YZ]: [startPoint.y, startPoint.z, endPoint.y, endPoint.z, centerPoint.y, centerPoint.z]
        };

        const [sx, sy, ex, ey, cx, cy] = planeMap[plane];

        const radius = Math.sqrt((sx - cx) * (sx - cx) + (sy - cy) * (sy - cy));
        let a0 = Math.atan2(sy - cy, sx - cx);
        let a1 = Math.atan2(ey - cy, ex - cx);

        // Adjust angle direction for CW/CCW
        if (isClockwise && a1 > a0) a1 -= 2 * Math.PI;
        if (!isClockwise && a1 < a0) a1 += 2 * Math.PI;

        const step = (a1 - a0) / segmentCount;

        for (let i = 0; i <= segmentCount; i++)
        {
            const angle = a0 + step * i;
            const px = cx + radius * Math.cos(angle);
            const py = cy + radius * Math.sin(angle);

            // Map back to 3D coords based on plane
            const point = (() => {
                switch (plane) {
                    case WorkingPlane.XY:
                        return { x: px, y: py, z: startPoint.z + (endPoint.z - startPoint.z) * i / segmentCount };
                    case WorkingPlane.XZ:
                        return { x: px, y: startPoint.y + (endPoint.y - startPoint.y) * i / segmentCount, z: py };
                    case WorkingPlane.YZ:
                        return { x: startPoint.X + (endPoint.x - startPoint.x) * i / segmentCount, y: px, z: py };
                }
            })();

            points.push(point);
        }

        return points;
    }
}

// export for testing
try {
    if (process.env.NODE_ENV === 'test') {
        module.exports = { GCodePathInterpreter, GCodeInterpreterConfig };
    }
} catch (e) {
    // do nothing
}
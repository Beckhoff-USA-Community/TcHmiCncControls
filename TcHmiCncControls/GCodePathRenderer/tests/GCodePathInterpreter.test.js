// Keep these lines for a best effort IntelliSense of Visual Studio 2017 and higher.
/// <reference path="./../../../Packages/Beckhoff.TwinCAT.HMI.Framework.14.2.110/runtimes/native1.12-tchmi/TcHmi.d.ts" />

const imports = require('../Modules/GCodePathInterpreter');
const interpreter = new imports.GCodePathInterpreter(new imports.GCodeInterpreterConfig());

test("GCodeInterpreter.calculateArcPoints() generated output - clockwise", () => {
    const mock = {
        start: { x: -1, y: 0, z: 0 },
        end: { x: 0, y: 1, z: 0 },
        center: { x: 0, y: 0, z: 0 },
        isClockwise: true,
        segments: 4
    };
    const expected = [
        { x: -1, y: 0, z: 0 },
        { x: -0.92387, y: 0.38268, z: 0 },
        { x: -0.70710, y: 0.70710, z: 0 },
        { x: -0.38268, y: 0.92387, z: 0 },
        { x: 0, y: 1, z: 0 },
    ];
    const actual = interpreter.calculateArcPoints(
        mock.start,
        mock.end,
        mock.center,
        mock.isClockwise,
        mock.segments
    );

    expect(actual.length).toBe(mock.segments + 1);

    actual.forEach((act, i) => {
        expect(vectEquals(act, expected[i])).toBe(true);
    });
});

test("GCodeInterpreter.calculateArcPoints() generated output - counter-clockwise", () => {
    const mock = {
        start: { x: 1, y: 0, z: 0 },
        end: { x: 0, y: 1, z: 0 },
        center: { x: 0, y: 0, z: 0 },
        isClockwise: false,
        segments: 4
    };
    const expected = [
        { x: 1, y: 0, z: 0 },
        { x: 0.92387, y: 0.38268, z: 0 },
        { x: 0.70710, y: 0.70710, z: 0 },
        { x: 0.38268, y: 0.92387, z: 0 },
        { x: 0, y: 1, z: 0 },
    ];
    const actual = interpreter.calculateArcPoints(
        mock.start,
        mock.end,
        mock.center,
        mock.isClockwise,
        mock.segments
    );

    expect(actual.length).toBe(mock.segments + 1);

    actual.forEach((act, i) => {
        expect(vectEquals(act, expected[i])).toBe(true);
    });
});

test("GCodeInterpreter.calculateArcSegmentCount() adapts to arc size", () => {
    const tolerant = new imports.GCodePathInterpreter(new imports.GCodeInterpreterConfig(false, 32, null, 0.001));
    const center = { x: 0, y: 0, z: 0 };

    // quarter arc, r = 10: step = 2 * acos(1 - 0.0001) ~ 0.02828 rad -> ceil(1.5708 / 0.02828) = 56, capped at 32
    expect(tolerant.calculateArcSegmentCount({ x: 10, y: 0, z: 0 }, { x: 0, y: 10, z: 0 }, center, false)).toBe(32);

    // quarter arc, r = 0.1: step = 2 * acos(1 - 0.01) ~ 0.2830 rad -> ceil(1.5708 / 0.2830) = 6
    expect(tolerant.calculateArcSegmentCount({ x: 0.1, y: 0, z: 0 }, { x: 0, y: 0.1, z: 0 }, center, false)).toBe(6);

    // radius within tolerance -> single segment
    expect(tolerant.calculateArcSegmentCount({ x: 0.0005, y: 0, z: 0 }, { x: 0, y: 0.0005, z: 0 }, center, false)).toBe(1);

    // clockwise sweep direction is respected (3/4 arc)
    expect(tolerant.calculateArcSegmentCount({ x: 0.1, y: 0, z: 0 }, { x: 0, y: 0.1, z: 0 }, center, true)).toBe(17);
});

test("GCodeInterpreter.calculateArcSegmentCount() uses fixed count when tolerance disabled", () => {
    const fixed = new imports.GCodePathInterpreter(new imports.GCodeInterpreterConfig(false, 16, null, 0));
    expect(fixed.calculateArcSegmentCount({ x: 0.1, y: 0, z: 0 }, { x: 0, y: 0.1, z: 0 }, { x: 0, y: 0, z: 0 }, false)).toBe(16);
});

test("GCodeInterpreter.Trace() arc point count follows tolerance", () => {
    global.GCodeParser = require('../Modules/GCodeParser');
    const gcode = "G90\nG0 X0.1 Y0\nG3 X0 Y0.1 I-0.1 J0";

    const tolerant = new imports.GCodePathInterpreter(new imports.GCodeInterpreterConfig(true, 32, null, 0.001));
    const fixed = new imports.GCodePathInterpreter(new imports.GCodeInterpreterConfig(true, 32, null, 0));

    expect(tolerant.Trace(gcode)[1].points.length).toBe(7);
    expect(fixed.Trace(gcode)[1].points.length).toBe(33);
});

test("GCodeInterpreter.Trace() G18 (XZ) clockwise arc", () => {
    global.GCodeParser = require('../Modules/GCodeParser');
    const fixed = new imports.GCodePathInterpreter(new imports.GCodeInterpreterConfig(true, 32, null, 0));

    // viewed from +Y (Z right, X up), CW from X+ to Z+ is a quarter arc
    const arc = fixed.Trace("G90\nG0 X1 Y0 Z0\nG18\nG2 X0 Z1 I-1 K0")[1].points;

    expect(arc.length).toBe(33);
    expect(vectEquals(arc[0], { x: 1, y: 0, z: 0 })).toBe(true);
    expect(vectEquals(arc[16], { x: Math.SQRT1_2, y: 0, z: Math.SQRT1_2 })).toBe(true);
    expect(vectEquals(arc[32], { x: 0, y: 0, z: 1 })).toBe(true);
});

test("GCodeInterpreter.Trace() G19 (YZ) clockwise arc", () => {
    global.GCodeParser = require('../Modules/GCodeParser');
    const fixed = new imports.GCodePathInterpreter(new imports.GCodeInterpreterConfig(true, 32, null, 0));

    // viewed from +X (Y right, Z up), CW from Z+ to Y+ is a quarter arc
    const arc = fixed.Trace("G90\nG0 X0.5 Y0 Z1\nG19\nG2 Y1 Z0 J0 K-1")[1].points;

    expect(arc.length).toBe(33);
    expect(vectEquals(arc[0], { x: 0.5, y: 0, z: 1 })).toBe(true);
    expect(vectEquals(arc[16], { x: 0.5, y: Math.SQRT1_2, z: Math.SQRT1_2 })).toBe(true);
    expect(vectEquals(arc[32], { x: 0.5, y: 1, z: 0 })).toBe(true);
});

function vectEquals(v1, v2) {
    return (
        Math.abs(v1.x - v2.x) < 1e-5 &&
        Math.abs(v1.y - v2.y) < 1e-5 &&
        Math.abs(v1.z - v2.z) < 1e-5
    );
}
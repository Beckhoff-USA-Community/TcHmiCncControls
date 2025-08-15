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

function vectEquals(v1, v2) {
    return (
        Math.abs(v1.x - v2.x) < 1e-5 &&
        Math.abs(v1.y - v2.y) < 1e-5 &&
        Math.abs(v1.z - v2.z) < 1e-5
    );
}
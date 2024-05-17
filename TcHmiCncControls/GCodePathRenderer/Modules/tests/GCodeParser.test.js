// Keep these lines for a best effort IntelliSense of Visual Studio 2017 and higher.
/// <reference path="./../../../Packages/Beckhoff.TwinCAT.HMI.Framework.12.760.59/runtimes/native1.12-tchmi/TcHmi.d.ts" />

const GCodeParser = require('../GCodeParser');
const parser = new GCodeParser();

// clean method tests
test("clean() removes '/' comment", () => {
    expect(parser.clean('/#SUPPRESS OFFSETS G0 Z0 W0')).toBe('');
});

test("clean() removes ';' comment and line number", () => {
    expect(parser.clean('N112 G1 G193 X1.308309 Y1.62311 Z0 F6.54 ;LINE COMMENT'))
        .toBe('G1 G193 X1.308309 Y1.62311 Z0 F6.54 ');
});

test("clean removes inline '()' comment and line number", () => {
    expect(parser.clean('N562 G0 (RAPID MOVE) X1.466066 Y0.427592 Z0.25 F500'))
        .toBe('G0  X1.466066 Y0.427592 Z0.25 F500');
});

// tokenize method tests
test("tokenize() generates correct array length", () => {
    expect(parser.tokenize('G0 X1.466066 Y0.427592 Z0.25 F500').length).toBe(5);
});

test("tokenize() generates correct token array", () => {
    expect(parser.tokenize('G1 G193 X1.308309 Y1.62311 Z0 F6.54'))
        .toEqual(['G1', 'G193', 'X1.308309', 'Y1.62311', 'Z0', 'F6.54']);
});

test("tokenize() generates correct token array (no spaces)", () => {
    expect(parser.tokenize('G1G193X1.308309Y1.62311Z0F6.54'))
        .toEqual(['G1', 'G193', 'X1.308309', 'Y1.62311', 'Z0', 'F6.54']);
});

// full parse test
const gcode = `
N100 G70
N101 G90 G17 G161
N102 (M50) (ALL JET ON)
N103 G0 X1.42 Y1.62 Z0.25 F500
N104 G1 X1.3225 Y1.6231 Z0 F4.97 G91 G28 X0 Y0
N105 G2 G193 X1.336982 Y2.749007 I1.254028 J2.541072 A-12.361 C101.388 Z0 F6.12
`;

const expected = [
    { code: 'G70', line: 2, args: {} },
    { code: 'G90', line: 3, args: {} },
    { code: 'G17', line: 3, args: { G: 161 } },
    { code: 'G0', line: 5, args: { X: 1.42, Y: 1.62, Z: 0.25, F: 500 } },
    { code: 'G1', line: 6, args: { X: 1.3225, Y: 1.6231, Z: 0, F: 4.97 } },
    { code: 'G91', line: 6, args: {} },
    { code: 'G28', line: 6, args: { X: 0, Y: 0 } },
    { code: 'G2', line: 7, args: { G: 193, X: 1.336982, Y: 2.749007, I: 1.254028, J: 2.541072, A: -12.361, C: 101.388, Z:0, F: 6.12 } }
];

test("parse() returns the correct object array", () => {
    expect(parser.Parse(gcode)).toEqual(expected);
});

// Keep these lines for a best effort IntelliSense of Visual Studio 2017 and higher.
/// <reference path="./../../../Packages/Beckhoff.TwinCAT.HMI.Framework.12.760.59/runtimes/native1.12-tchmi/TcHmi.d.ts" />

const GCodeParser = require('../Modules/GCodeParser');
const parser = new GCodeParser();

// clean method tests
test("GCodeParser.clean() removes '/' comment", () => {
    expect(parser.clean('/#SUPPRESS OFFSETS G0 Z0 W0')).toBe('');
});

test("GCodeParser.clean() removes ';' comment and line number", () => {
    expect(parser.clean('N112 G1 G193 X1.308309 Y1.62311 Z0 F6.54 ;LINE COMMENT'))
        .toBe('G1 G193 X1.308309 Y1.62311 Z0 F6.54 ');
});

test("GCodeParser.clean removes inline '()' comment and line number", () => {
    expect(parser.clean('N562 G0 (RAPID MOVE) X1.466066 Y0.427592 Z0.25 F500'))
        .toBe('G0  X1.466066 Y0.427592 Z0.25 F500');
});

// tokenize method tests
test("GCodeParser.tokenize() generates correct array length", () => {
    expect(parser.tokenize('G0 X1.466066 Y0.427592 Z0.25 F500').length).toBe(5);
});

test("GCodeParser.tokenize() generates correct token array", () => {
    expect(parser.tokenize('G1 G193 X1.308309 Y1.62311 Z0 F6.54'))
        .toEqual(['G1', 'G193', 'X1.308309', 'Y1.62311', 'Z0', 'F6.54']);
});

test("GCodeParser.tokenize() generates correct token array (no spaces)", () => {
    expect(parser.tokenize('G1G193X1.308309Y1.62311Z0F6.54'))
        .toEqual(['G1', 'G193', 'X1.308309', 'Y1.62311', 'Z0', 'F6.54']);
});

const  gcodemodal = `
G0 X-3.184 Z2.0 A0.0
G1 X-3.184 Z-2.0 A0.0 F225
G21
X-3.184 Z-0.978 A0.0
X-2.184 Z-0.978 A0.0
X-2.184 Z-1.702 A0.0
`;

const expectedmodal = [
    { code: 'g0', line: 2, args: { x: -3.184, z: 2.0, a: 0.0 } },
    { code: 'g1', line: 3, args: { x: -3.184, z: -2.0, a: 0.0 } },
    { code: 'g21', line: 4, args: {} },
    { code: 'g1', line: 5, args: { x: -3.184, z: -0.978, a: 0.0 } },
    { code: 'g1', line: 6, args: { x: -2.184, z: -0.978, a: 0.0 } },
    { code: 'g1', line: 7, args: { x: -2.184, z: -1.702, a: 0.0 } }
];

test("GCodeParser.parse() parses modal codes properly", () => {
    const res = parser.Parse(gcodemodal);
    expect(parser.Parse(gcodemodal)).toEqual(expectedmodal);
});

// full parse test
gcodefull = `
N100 G70
N101 G90 G17 G161
N102 (M50) (ALL JET ON)
N103 G4 X100 G0 X1.42 Y1.62 Z0.25 F500
N104 G1 X1.3225 Y1.6231 Z0 F4.97 G91 G28 Z0 ; multi-code line
N105 G2 G193 X1.336982 Y2.749007 I1.254028 J2.541072 A-12.361 C101.388 Z0 F6.12
`;

const expectedfull = [
    { code: 'g70', line: 2, args: {} },
    { code: 'g90', line: 3, args: {} },
    { code: 'g17', line: 3, args: {} },
    { code: 'g0', line: 5, args: { x: 1.42, y: 1.62, z: 0.25 } },
    { code: 'g91', line: 6, args: {} },
    { code: 'g1', line: 6, args: { x: 1.3225, y: 1.6231, z: 0 } },
    { code: 'g28', line: 6, args: { z: 0 } },
    { code: 'g2', line: 7, args: { x: 1.336982, y: 2.749007, i: 1.254028, j: 2.541072, a: -12.361, c: 101.388, z:0 } }
];

test("GCodeParser.parse() returns the correct object array", () => {
    expect(parser.Parse(gcodefull)).toEqual(expectedfull);
});

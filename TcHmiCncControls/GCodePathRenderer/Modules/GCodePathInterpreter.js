// Keep these lines for a best effort IntelliSense of Visual Studio 2017 and higher.
/// <reference path="./../../../Packages/Beckhoff.TwinCAT.HMI.Framework.12.760.59/runtimes/native1.12-tchmi/TcHmi.d.ts" />

class GCodePathInterpreter {

    constructor() {
        this.multiplier = 1.0;
        this.relative = false;
        this.prevPoint = null;
    }

    // creates a path of points from
    // parsed GCode object array
    trace(gcode) {
        const parser = new GCodeParser();
        const parsed = parser.Parse(gcode);
        console.log(parsed);
    }

    g0(val) { return g00(val) }
    g00(val) { }

    g1(val) { return g01(val) }
    g01(val) { }

    g2(val) { return g02(val) }
    g02(val) { }

    g3(val) { return g03(val) }
    g03(val) { }

    g17(val) { }
    g28(val) { }

    // 1-to-1 mm units in rendering
    g70(val) { this.multiplier = 25.4 }
    g71(val) { this.multiplier = 1.0 }

    g90(val) { this.relative = false }
    g91(val) { this.relative = true }
}
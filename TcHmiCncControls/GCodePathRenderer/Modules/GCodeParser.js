// Keep these lines for a best effort IntelliSense of Visual Studio 2017 and higher.
/// <reference path="./../../../Packages/Beckhoff.TwinCAT.HMI.Framework.12.760.59/runtimes/native1.12-tchmi/TcHmi.d.ts" />

const GCodeParser = function () {
    this.relative = false;
    this.multiplier = 1;
};

GCodeParser.prototype.Parse = function(gcode) {
    const lines = gcode.split("\n");
    lines.forEach((line, i) => {
        // remove line number and comments
        const clean = line.replace(/^(?:N\d+\s+)|;.*$|\(.*?\)|\/.*$/gm, "");
        // separate commands and parameters
        const tokens = clean.match(/[A-Z]-?[0-9]*\.?[0-9]+/gi);
        if (tokens && tokens.length) {
            const cmds = this.parseLine(tokens, i);
            //if (cmds) commands.push(...cmds);
        } else {
            // empty line
        }
    });
}

GCodeParser.prototype.parseLine = function(tokens, lineNum) {

    let commands = [];

    // gcodes that we care about
    const GCodes = Object.fromEntries(Object.entries({
        G0: this.gPath, G00: this.gPath,
        G1: this.gPath, G01: this.gPath,
        G2: this.gPath, G02: this.gPath,
        G3: this.gPath, G03: this.gPath,
        G70: this.g70,
        G71: this.g71,
        G90: this.g90,
        G91: this.g91
    }).map(([k, v]) => [k, v.bind(this)]));
    // bind methods to maintain 'this' scope

    // other instructions we may care about?
    // G04 - dwell/pause
    // G40 - cutcomp
    // G17/18/19 - XY, XZ, YZ plane
    // G161 - home

    // find G cmd + params
    const gcodes = Object.keys(GCodes);
    for (let i = 0; i < tokens.length; i++) {
        // new instruction
        if (gcodes.includes(tokens[i].toUpperCase())) {
            // get params
            let j = i + 1;
            let args = [];
            while (tokens[j] && !gcodes.includes(tokens[j].toUpperCase())) {
                args.push(tokens[j]);
                j++;
            }
            // invoke method by token name
            GCodes[tokens[i]](tokens[i], args, lineNum);
            i = j + i;
        }
    }
}

GCodeParser.prototype.gPath = function(code, args, lineNum) {

    const mult = this.multiplier;
    
    const gObj = args.reduce((obj, arg) => {
        // get key name
        const name = arg[0];
        // get key value
        let value = parseFloat(arg.substring(1));
        // apply unit sclaing
        value = (['X', 'Y', 'Z', 'I', 'J'].includes(name)) ? (value * mult) : value;
        obj[name] = value;
        return obj;
    }, {});

    // TODO
    if (this.relative) {
        // offset x/y/z
    }

    // set g code and line number
    gObj.code = code;
    gObj.line = lineNum;
}

GCodeParser.prototype.g70 = function() {
    this.multiplier = 25.4;
}

GCodeParser.prototype.g71 = function() {
    this.multiplier = 1;
}

GCodeParser.prototype.g90 = function() {
    this.relative = false;
}

GCodeParser.prototype.g91 = function() {
    this.relative = true;
}

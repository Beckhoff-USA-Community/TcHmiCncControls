// Keep these lines for a best effort IntelliSense of Visual Studio 2017 and higher.
/// <reference path="./../../../Packages/Beckhoff.TwinCAT.HMI.Framework.12.760.59/runtimes/native1.12-tchmi/TcHmi.d.ts" />

class GCodeParsedLine {
    constructor(code, lineNumber) {
        this.code = code;
        this.line = lineNumber;
        this.args = {};
    }
    AddArg(arg) {
        const name = arg[0].toLowerCase();
        const value = parseFloat(arg.substring(1));
        this.args[name] = value;
    }
}

class GCodeParser {

    constructor() { }

    // takes raw GCode string
    // returns array of GCodeParsedLine
    Parse(gcode) {

        const lines = gcode.split("\n");
        let prevMotionCode;
        const parsed = [];

        lines.forEach((line, i) => {
            const tokens = this.tokenize(this.clean(line));
            if (!tokens?.length) return;
            let activeMotion;
            for (let j = 0; j < tokens.length; j++) {
                const token = tokens[j].toLowerCase();
                const type = this.getTokenType(token);
                switch (type) {
                    case 'effect':
                        parsed.push(new GCodeParsedLine(token, i + 1));
                        break;
                    case 'arg':
                        if (activeMotion)
                            activeMotion.AddArg(token);
                        else {
                            activeMotion = new GCodeParsedLine(prevMotionCode, i + 1);
                            activeMotion.AddArg(token);
                        }
                        break;
                    case 'motion':
                        if (activeMotion !== undefined)
                            parsed.push(activeMotion);

                        activeMotion = new GCodeParsedLine(token, i + 1);
                        prevMotionCode = token;
                        break;
                    default:
                        break;
                }
                j += this.skipArgs(token);
            }
            if (activeMotion) parsed.push(activeMotion);
        });

        return parsed;
    }

    // removes line numbers and comments
    clean(line) {
        return line.replace(/^(?:N\d+\s+)|;.*$|\(.*?\)|\/.*$/gm, "");
    }

    // separates gcodes and arguments into array
    tokenize(line) {
        return line.match(/[a-zA-Z]-?[0-9]*\.?[0-9]+/gi);
    }

    // returns GCode token type
    getTokenType(token) {

        const Gcodes = {
            motion: [
                'g0', 'g00',
                'g1', 'g01',
                'g2', 'g02',
                'g3', 'g03',
                'g28', 'g53'
            ],
            effect: [
                'g17', 'g18', 'g19',
                'g20', 'g21',
                'g70', 'g71',
                'g90', 'g91'
            ],
            arg: [
                'x', 'y', 'z',
                'a', 'b', 'c',
                'i', 'j', 'k', 'r'
            ],
            ignore: [
                'g4', 'g04',
                'm', 's'
            ]
        };

        if (Gcodes.motion.includes(token))
            return 'motion';
        else if (Gcodes.effect.includes(token))
            return 'effect';
        else if (Gcodes.arg.some(x => token.startsWith(x)))
            return 'arg';
        else if (Gcodes.ignore.some(x => token.startsWith(x)))
            return 'ignore';
        else return 'unknown';
    }

    // returns number of arguments to skip
    skipArgs(token) {

        // G04 sometimes receives 'X' param which should be skipped
        const skipCodes = [
            {
                code: 'g4',
                argCount: 1
            },
            {
                code: 'g04',
                argCount: 1
            }
        ];

        const skip = skipCodes.find(x => x.code === token);
        return skip?.argCount || 0;
    }
}

// export for testing
try {
    if (process.env.NODE_ENV === 'test') {
        module.exports = GCodeParser;
    }
} catch (e) {
    // do nothing
}



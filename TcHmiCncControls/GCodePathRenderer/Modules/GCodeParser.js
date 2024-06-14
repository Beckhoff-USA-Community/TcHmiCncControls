// Keep these lines for a best effort IntelliSense of Visual Studio 2017 and higher.
/// <reference path="./../../../Packages/Beckhoff.TwinCAT.HMI.Framework.12.760.59/runtimes/native1.12-tchmi/TcHmi.d.ts" />

class GCodeParser {

    constructor() {

        this.Gcodes = {
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

        // G04 sometimes receives 'X' param
        this.skipArgs = [
            {
                code: 'g4',
                argCount: 1
            },
            {
                code: 'g04',
                argCount: 1
            }
        ];
    }

    Parse(gcode) {

        const lines = gcode.split("\n");
        
        const getTokenType = (t) => {
            if (this.Gcodes.motion.includes(t))
                return 'motion';
            else if (this.Gcodes.effect.includes(t))
                return 'effect';
            else if (this.Gcodes.arg.some(x => t.startsWith(x)))
                return 'arg';
            else if (this.Gcodes.ignore.some(x => t.startsWith(x)))
                return 'ignore';
            else return 'unknown';
        }

        let prevMotionCode;
        const parsed = [];
        for (let i = 0; i < lines.length; i++) {
            const tokens = this.tokenize(this.clean(lines[i]));
            if (!tokens?.length) continue;
            let activeMotion;
            for (let j = 0; j < tokens.length; j++) {
                const token = tokens[j].toLowerCase();
                const type = getTokenType(token);
                switch (type) {
                    case 'effect':
                        parsed.push(new GCodeParseStruct(token, i + 1));
                        break;
                    case 'arg':
                        if (activeMotion)
                            activeMotion.AddArg(token);
                        else {
                            activeMotion = new GCodeParseStruct(prevMotionCode, i + 1);
                            activeMotion.AddArg(token);
                        }
                        break;
                    case 'motion':
                        if (activeMotion !== undefined)
                            parsed.push(activeMotion);

                        activeMotion = new GCodeParseStruct(token, i + 1);
                        prevMotionCode = token;
                        
                        break;
                    default:
                        break;
                }
                const skip = this.skipArgs.find(x => x.code === token);
                if (skip !== undefined) {
                    j += skip?.argCount;
                }
            }
            if (activeMotion) parsed.push(activeMotion);
        }

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
}

class GCodeParseStruct {
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

// export for testing
try {
    if (process.env.NODE_ENV === 'test') {
        module.exports = GCodeParser;
    }
} catch (e) {
    // do nothing
}



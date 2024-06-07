// Keep these lines for a best effort IntelliSense of Visual Studio 2017 and higher.
/// <reference path="./../../../Packages/Beckhoff.TwinCAT.HMI.Framework.12.760.59/runtimes/native1.12-tchmi/TcHmi.d.ts" />

class GCodeParser {

    constructor() {

        // gcodes we care about
        this.gCodes = [
            'G0', 'G00',
            'G1', 'G01',
            'G2', 'G02',
            'G3', 'G03',
            'G4', 'G04',
            'G17',
            'G28',
            'G70',
            'G71',
            'G90',
            'G91'
        ];

        this.modalGcodes = [
            'G0', 'G00',
            'G1', 'G01',
            'G2', 'G02',
            'G3', 'G03'
        ];

        this.modalParams = [
            'X', 'Y', 'Z'
        ];
    }

    // parses gcode string and returns object array
    Parse(gcode) {

        const parsed = [];
        const lines = gcode.split("\n");
        let prevCode = "";
        lines.forEach((line, i) => {
            // clean and tokenize line
            const tokens = this.tokenize(this.clean(line));
            if (tokens && tokens.length) {
                // check for codes
                if (tokens.some(x => this.gCodes.includes(x.toUpperCase()))) {
                    // check line for multiple codes
                    const codes = this.splitList(tokens);
                    const structs = codes.map(x => new GCodeParseStruct(x, i));
                    parsed.push(...structs);
                    // get previous valid gcode for if subsequent lines are modal
                    prevCode = structs.filter(x => this.modalGcodes.includes(x.code.toUpperCase()))
                        .pop()?.code ?? prevCode;
                } else {
                    // line contains no G code, but modal params
                    if (tokens.some(x => this.modalParams.some(y => x.toUpperCase().includes(y)))) {
                        parsed.push(new GCodeParseStruct([prevCode, ...tokens], i));
                    }
                }
                
            }
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

    // split line with mutliple codes into separate code/argument lists
    // (line may contain multiple GCodes w/ args)
    splitList(tokenList) {
        const codes = [];
        for (let i = 0; i < tokenList.length; i++) {
            // new instruction
            if (this.gCodes.includes(tokenList[i].toUpperCase())) {
                // get params
                let j = i + 1;
                const args = [];
                while (tokenList[j] && !this.gCodes.includes(tokenList[j].toUpperCase())) {
                    args.push(tokenList[j]);
                    j++;
                }
                codes.push([tokenList[i], ...args]);
                i = j - 1;
            }
        }
        return codes;
    }
}

class GCodeParseStruct {
    constructor(tokens, lineNumber) {
        if (tokens && tokens.length) {
            // set gcode and line number
            this.code = tokens[0];
            this.line = lineNumber + 1;

            // set args
            this.args = tokens.slice(1).reduce((obj, arg) => {
                // get arg name - TODO (maybe): only supports single char arg names
                const name = arg[0].toUpperCase();
                // get arg value
                let value = parseFloat(arg.substring(1));
                obj[name] = value;
                return obj;
            }, {});
        }
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



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
            'G17',
            'G28',
            'G70',
            'G71',
            'G90',
            'G91'
        ];
    }

    // parses gcode string and returns object array
    Parse(gcode) {

        let parsed = [];
        const lines = gcode.split("\n");
        lines.forEach((line, i) => {
            // clean and tokenize line
            const tokens = this.tokenize(this.clean(line));
            if (tokens && tokens.length) {
                // check line for multiple codes
                const codes = this.splitList(tokens);
                parsed.push(...codes.map(x => new GCodeParseStruct(x, i)));
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
        let codes = [];
        for (let i = 0; i < tokenList.length; i++) {
            // new instruction
            if (this.gCodes.includes(tokenList[i].toUpperCase())) {
                // get params
                let j = i + 1;
                let args = [];
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
            this.line = lineNumber;

            // set args
            this.args = tokens.slice(1).reduce((obj, arg) => {
                // get arg name - TODO (maybe): only supports single char arg names
                const name = arg[0];
                // get arg value
                let value = parseFloat(arg.substring(1));
                obj[name] = value;
                return obj;
            }, {});
        }
    }

    get Code() {
        return this.code;
    }

    get Line() {
        return this.line;
    }

    get Args() {
        return this.args;
    }
}

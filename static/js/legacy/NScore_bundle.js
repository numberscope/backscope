(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/*jshint maxerr: 10000 */

SEQUENCE = require('./sequences/sequences.js');
MODULES = require('./modules/modules.js');
Validation = require('./Validation.js');

const ListToSeq = SEQUENCE.ListToSeq;
const OEISToSeq = SEQUENCE.OEISToSeq;
const BuiltInNameToSeq = SEQUENCE.BuiltInNameToSeq;

function stringToArray(strArr) {
	return JSON.parse("[" + strArr + "]");
}

const NScore = function () {
	const modules = MODULES; //  classes to the drawing modules
	const BuiltInSeqs = SEQUENCE.BuiltInSeqs;
	const validOEIS = VALIDOEIS;
	var preparedSequences = []; // sequenceGenerators to be drawn
	var preparedTools = []; // chosen drawing modules 
	var unprocessedSequences = []; //sequences in a saveable format
	var unprocessedTools = []; //tools in a saveable format
	var liveSketches = []; // p5 sketches being drawn

	/**
	 *
	 *
	 * @param {*} moduleClass drawing module to be used for this sketch
	 * @param {*} config corresponding config for drawing module
	 * @param {*} seq sequence to be passed to drawing module
	 * @param {*} divID div where sketch will be placed
	 * @param {*} width width of sketch
	 * @param {*} height height of sketch
	 * @returns p5 sketch
	 */
	const generateP5 = function (moduleClass, config, seq, divID, width, height) {

		//Create canvas element here
		var div = document.createElement('div');
		//The style of the canvases will be "canvasClass"
		div.className = "canvasClass";
		div.id = "liveCanvas" + divID;
		document.getElementById("canvasArea").appendChild(div);
		//-------------------------------------------
		//Create P5js instance
		let myp5 = new p5(function (sketch) {
			let moduleInstance = new moduleClass(seq, sketch, config);
			sketch.setup = function () {
				sketch.createCanvas(width, height);
				sketch.background("white");
				moduleInstance.setup();
			};

			sketch.draw = function () {
				moduleInstance.draw();
			};
		}, div.id);
		return myp5;
	};

	/**
	 * When the user chooses a drawing module and provides corresponding config
	 * it will automatically be passed to this function, which will validate input
	 * and append it to the prepared tools
	 * @param {*} moduleObj information used to prepare the right drawing module, this input
	 * this will contain an ID, the moduleKey which should match a key in MODULES_JSON, and
	 * a config object.
	 */
	const receiveModule = function (moduleObj) {
		if ((moduleObj.ID && moduleObj.moduleKey && moduleObj.config && modules[moduleObj.moduleKey]) == undefined) {
			console.error("One or more undefined module properties received in NScore");
		} else {
			validationResult = Validation.module(moduleObj);
			if (validationResult.errors.length != 0) {
				preparedTools[moduleObj.ID] = null;
				return validationResult.errors;
			}
			moduleObj.config = validationResult.parsedFields;
			preparedTools[moduleObj.ID] = {
				module: modules[moduleObj.moduleKey],
				config: moduleObj.config,
				ID: moduleObj.ID
			};
			unprocessedTools[moduleObj.ID] = moduleObj;
			return true;
		}
	};

	/**
	 * When the user chooses a sequence, we will automatically pass it to this function
	 * which will validate the input, and then depending on the input type, it will prepare
	 * the sequence in some way to get a sequenceGenerator object which will be appended
	 * to preparedSequences
	 * @param {*} seqObj information used to prepare the right sequence, this will contain a
	 * sequence ID, the type of input, and the input itself (sequence name, a list, an OEIS number..etc).
	 */
	const receiveSequence = function (seqObj) {
		if ((seqObj.ID && seqObj.inputType && seqObj.inputValue && seqObj.parameters) == undefined) {
			console.error("One or more undefined module properties received in NScore");
		} else {
			// We will process different inputs in different ways
			if (seqObj.inputType == "builtIn") {
				validationResult = Validation.builtIn(seqObj);
				if (validationResult.errors.length != 0) {
					return validationResult.errors;
				}
				seqObj.parameters = validationResult.parsedFields;
				preparedSequences[seqObj.ID] = BuiltInNameToSeq(seqObj.ID, seqObj.inputValue, seqObj.parameters);
			}
			if (seqObj.inputType == "OEIS") {
				validationResult = Validation.oeis(seqObj);
				if (validationResult.errors.length != 0) {
					return validationResult.errors;
				}
				preparedSequences[seqObj.ID] = OEISToSeq(seqObj.ID, seqObj.inputValue);
			}
			if (seqObj.inputType == "list") {
				validationResult = Validation.list(seqObj);
				if (validationResult.errors.length != 0) {
					return validationResult.errors;
				}
				preparedSequences[seqObj.ID] = ListToSeq(seqObj.ID, seqObj.inputValue);

			}
			if (seqObj.inputType == "code") {
				console.error("Not implemented");
			}
			unprocessedSequences[seqObj.ID] = seqObj;
		}
		return true;
	};
	/**
	 * We initialize the drawing processing. First we calculate the dimensions of each sketch
	 * then we pair up sequences and drawing modules, and finally we pass them to generateP5
	 * which actually instantiates drawing modules and begins drawing.
	 * 
	 * @param {*} seqVizPairs a list of pairs where each pair contains an ID of a sequence
	 * and an ID of a drawing tool, this lets us know to pass which sequence to which
	 * drawing tool.
	 */
	const begin = function (seqVizPairs) {
		hideLog();

		//Figuring out layout
		//--------------------------------------
		let totalWidth = document.getElementById('canvasArea').offsetWidth;
		let totalHeight = document.getElementById('canvasArea').offsetHeight;
		let canvasCount = seqVizPairs.length;
		let gridSize = Math.ceil(Math.sqrt(canvasCount));
		let individualWidth = totalWidth / gridSize - 20;
		let individualHeight = totalHeight / gridSize;
		//--------------------------------------

		for (let pair of seqVizPairs) {
			let currentSeq = preparedSequences[pair.seqID];
			let currentTool = preparedTools[pair.toolID];
			if (currentSeq == undefined || currentTool == undefined) {
				console.error("undefined ID for tool or sequence");
			} else {
				liveSketches.push(generateP5(currentTool.module.viz, currentTool.config, currentSeq, liveSketches.length, individualWidth, individualHeight));
			}
		}
	};

	const makeJSON = function (seqVizPairs) {
		if( unprocessedSequences.length == 0 && unprocessedTools.length == 0 ){
			return "Nothing to save!";
		}
		toShow = [];
		for (let pair of seqVizPairs) {
			toShow.push({
				seq: unprocessedSequences[pair.seqID],
				tool: unprocessedTools[pair.toolID]
			});
		}
		return JSON.stringify(toShow);
	};

	const clear = function () {
		showLog();
		if (liveSketches.length == 0) {
			return;
		} else {
			for (let i = 0; i < liveSketches.length; i++) {
				liveSketches[i].remove(); //delete canvas element
			}
		}
	};

	const pause = function () {
		liveSketches.forEach(function (sketch) {
			sketch.noLoop();
		});
	};

	const resume = function () {
		liveSketches.forEach(function (sketch) {
			sketch.loop();
		});
	};

	const step = function () {
		liveSketches.forEach(function (sketch) {
			sketch.redraw();
		});
	};

	return {
		receiveSequence: receiveSequence,
		receiveModule: receiveModule,
		liveSketches: liveSketches,
		preparedSequences: preparedSequences,
		preparedTools: preparedTools,
		modules: modules,
		validOEIS: validOEIS,
		BuiltInSeqs: BuiltInSeqs,
		makeJSON: makeJSON,
		begin: begin,
		pause: pause,
		resume: resume,
		step: step,
		clear: clear,
	};
}();




const LogPanel = function () {
	logGreen = function (line) {
		$("#innerLogArea").append(`<p style="color:#00ff00">${line}</p><br>`);
	};
	logRed = function (line) {
		$("#innerLogArea").append(`<p style="color:red">${line}</p><br>`);
	};
	clearlog = function () {
		$("#innerLogArea").empty();
	};
	hideLog = function () {
		$("#logArea").css('display', 'none');
	};
	showLog = function () {
		$("#logArea").css('display', 'block');
	};
	return {
		logGreen: logGreen,
		logRed: logRed,
		clearlog: clearlog,
		hideLog: hideLog,
		showLog: showLog,
	};
}();
window.NScore = NScore;
window.LogPanel = LogPanel;

},{"./Validation.js":2,"./modules/modules.js":9,"./sequences/sequences.js":15}],2:[function(require,module,exports){
SEQUENCE = require('./sequences/sequences.js');
VALIDOEIS = require('./validOEIS.js');
MODULES = require('./modules/modules.js');


const Validation = function () {


	const listError = function (title) {
		let msg = "can't parse the list, please pass numbers seperated by commas (example: 1,2,3)";
		if (title != undefined) {
			msg = title + ": " + msg;
		}
		return msg;
	};

	const requiredError = function (title) {
		return `${title}: this is a required value, don't leave it empty!`;
	};

	const typeError = function (title, value, expectedType) {
		return `${title}: ${value} is a ${typeof(value)}, expected a ${expectedType}. `;
	};

	const oeisError = function (code) {
		return `${code}: Either an invalid OEIS code or not defined by sage!`;
	};

	const builtIn = function (seqObj) {
		let schema = SEQUENCE.BuiltInSeqs[seqObj.inputValue].paramsSchema;
		let receivedParams = seqObj.parameters;

		let validationResult = {
			parsedFields: {},
			errors: []
		};
		Object.keys(receivedParams).forEach(
			(parameter) => {
				validateFromSchema(schema, parameter, receivedParams[parameter], validationResult);
			}
		);
		return validationResult;
	};

	const oeis = function (seqObj) {
		let validationResult = {
			parsedFields: {},
			errors: []
		};
		seqObj.inputValue = seqObj.inputValue.trim();
		let oeisCode = seqObj.inputValue;
		if (!VALIDOEIS.includes(oeisCode)) {
			validationResult.errors.push(oeisError(oeisCode));
		}
		return validationResult;
	};

	const list = function (seqObj) {
		let validationResult = {
			parsedFields: {},
			errors: []
		};
		try {
			if (typeof seqObj.inputValue == String) seqObj.inputValue = JSON.parse(seqObj.inputValue);
		} catch (err) {
			validationResult.errors.push(listError());
		}
		return validationResult;
	};

	const _module = function (moduleObj) {
                console.log("here");
                console.log(moduleObj.moduleKey);
		let schema = MODULES[moduleObj.moduleKey].configSchema;
		let receivedConfig = moduleObj.config;

		let validationResult = {
			parsedFields: {},
			errors: []
		};

		Object.keys(receivedConfig).forEach(
			(configField) => {
				validateFromSchema(schema, configField, receivedConfig[configField], validationResult);
			}
		);
		return validationResult;
	};

	const validateFromSchema = function (schema, field, value, validationResult) {
		let title = schema[field].title;
		if (typeof (value) == "string") {
			value = value.trim();
		}
		let expectedType = schema[field].type;
		let required = (schema[field].required !== undefined) ? schema[field].required : false;
		let format = (schema[field].format !== undefined) ? schema[field].format : false;
		let isEmpty = (value === '');
		if (required && isEmpty) {
			validationResult.errors.push(requiredError(title));
		}
		if (isEmpty) {
			parsed = '';
		}
		if (!isEmpty && (expectedType == "number")) {
			parsed = parseInt(value);
			if (parsed != parsed) { // https://stackoverflow.com/questions/34261938/what-is-the-difference-between-nan-nan-and-nan-nan
				validationResult.errors.push(typeError(title, value, expectedType));
			}
		}
		if (!isEmpty && (expectedType == "string")) {
			parsed = value;
		}
		if (!isEmpty && (expectedType == "boolean")) {
			if (value == '1') {
				parsed = true;
			} else {
				parsed = false;
			}
		}
		if (format && (format == "list")) {
			try {
				parsed = JSON.parse("[" + value + "]");
			} catch (err) {
				validationResult.errors.push(listError(title));
			}
		}
		if (parsed !== undefined) {
			validationResult.parsedFields[field] = parsed;
		}
	};

	return {
		builtIn: builtIn,
		oeis: oeis,
		list: list,
		module: _module
	};
}();

module.exports = Validation;

},{"./modules/modules.js":9,"./sequences/sequences.js":15,"./validOEIS.js":16}],3:[function(require,module,exports){
/*
    var list=[2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271, 277, 281, 283, 293, 307, 311, 313, 317, 331, 337, 347, 349, 353, 359, 367, 373, 379, 383, 389, 397, 401, 409, 419, 421, 431, 433, 439, 443, 449, 457, 461, 463, 467, 479, 487, 491, 499, 503, 509, 521, 523, 541, 547, 557, 563, 569, 571, 577, 587, 593, 599, 601, 607, 613, 617, 619, 631, 641, 643, 647, 653, 659, 661, 673, 677, 683, 691, 701, 709, 719, 727, 733, 739, 743, 751, 757, 761, 769, 773, 787, 797, 809, 811, 821, 823, 827, 829, 839, 853, 857, 859, 863, 877, 881, 883, 887, 907, 911, 919, 929, 937, 941, 947, 953, 967, 971, 977, 983, 991, 997, 1009, 1013, 1019, 1021, 1031, 1033, 1039, 1049, 1051, 1061, 1063, 1069, 1087, 1091, 1093, 1097, 1103, 1109, 1117, 1123, 1129, 1151, 1153, 1163, 1171, 1181, 1187, 1193, 1201, 1213, 1217, 1223];

*/

class VIZ_Differences {
	constructor(seq, sketch, config) {

		this.n = config.n; //n is number of terms of top sequence
		this.levels = config.Levels; //levels is number of layers of the pyramid/trapezoid created by writing the differences.
		this.seq = seq;
		this.sketch = sketch;
	}

	drawDifferences(n, levels, sequence) {

		//changed background color to grey since you can't see what's going on
		this.sketch.background('black');

		n = Math.min(n, sequence.length);
		levels = Math.min(levels, n - 1);
		let font, fontSize = 20;
		this.sketch.textFont("Arial");
		this.sketch.textSize(fontSize);
		this.sketch.textStyle(this.sketch.BOLD);
		let xDelta = 50;
		let yDelta = 50;
		let firstX = 30;
		let firstY = 30;
		this.sketch.colorMode(this.sketch.HSB, 255);
		let myColor = this.sketch.color(100, 255, 150);
		let hue;

		let workingSequence = [];

		for (let i = 0; i < this.n; i++) {
			workingSequence.push(sequence.getElement(i)); //workingSequence cannibalizes first n elements of sequence.
		}


		for (let i = 0; i < this.levels; i++) {
			hue = (i * 255 / 6) % 255;
			myColor = this.sketch.color(hue, 150, 200);
			this.sketch.fill(myColor);
			for (let j = 0; j < workingSequence.length; j++) {
				this.sketch.text(workingSequence[j], firstX + j * xDelta, firstY + i * yDelta); //Draws and updates workingSequence simultaneously.
				if (j < workingSequence.length - 1) {
					workingSequence[j] = workingSequence[j + 1] - workingSequence[j];
				}
			}

			workingSequence.length = workingSequence.length - 1; //Removes last element.
			firstX = firstX + (1 / 2) * xDelta; //Moves line forward half for pyramid shape.

		}

	}
	setup() {}
	draw() {
		this.drawDifferences(this.n, this.levels, this.seq);
		this.sketch.noLoop();
	}
}



const SCHEMA_Differences = {
	n: {
		type: 'number',
		title: 'N',
		description: 'Number of elements',
		required: true
	},
	Levels: {
		type: 'number',
		title: 'Levels',
		description: 'Number of levels',
		required: true
	},
};

const MODULE_Differences = {
	viz: VIZ_Differences,
	name: "Differences",
	description: "",
	configSchema: SCHEMA_Differences
};


module.exports = MODULE_Differences;

},{}],4:[function(require,module,exports){




function constrain(val, min_val, max_val) {
        return Math.min(max_val, Math.max(min_val, val));
}

function degrees_to_radians(degrees) {
  var pi = Math.PI;
  return degrees * (pi/180);
}

class Line {
        constructor(x0, x1, y0, y1) {
          this.x0 = x0;
          this.x1 = x1;
          this.y0 = y0;
          this.y1 = y1;
        }

        draw(sketch) {
                var x0_ = constrain(Math.round(this.x0), 0, sketch.width - 1);
                var x1_ = constrain(Math.round(this.x1), 0, sketch.width - 1);
                var y0_ = constrain(Math.round(this.y0), 0, sketch.height - 1);
                var y1_ = constrain(Math.round(this.y1), 0, sketch.height - 1);
                sketch.line(x0_, y0_, x1_, y1_)
        }
}



class VIZ_FractalMap {
    constructor(seq, sketch, config){
        this.seq = seq
        this.sketch = sketch
        this.itters = 14;
    }
    setup(){
        this.lines = []
        this.origin_y = this.sketch.height / 2;
        this.origin_x = this.sketch.width / 2;
    }
        
    draw_next(x0, x1, y0, y1, num, frac_1, frac_2, angle_1, angle_2, sequence){
        num = num - 1;
        if(num <= 0) {
          return;
        }

        // Best to switch to a numerical library
        let A = [x1 - x0, y1 - y0];
        // var mag = Math.sqrt(A[0] * A[0] + A[1] * A[1]);
        // A[0] = A[0] / mag;
        // A[1] = A[1] / mag;
        //


        // Two rotation matrices for left 
        // and right branches respectively
        let R1 = [[Math.cos(angle_1), -Math.sin(angle_1)], [Math.sin(angle_1), Math.cos(angle_1)]];
        let R2 = [[Math.cos(-angle_2), -Math.sin(-angle_2)], [Math.sin(-angle_2), Math.cos(-angle_2)]];

        this.lines.push(new Line(x0, x1, y0, y1));
        
        let right = [0, 0];
        let left = [0, 0];
        
        // manual matrix multiplication
        right[0] = x1 + frac_1 * (R1[0][0] * A[0] + R1[0][1] * A[1]);
        right[1] = y1 + frac_1 * (R1[1][0] * A[0] + R1[1][1] * A[1]);
        left[0] = x1 + frac_2 * (R2[0][0] * A[0] + R2[0][1] * A[1]);
        left[1] = y1 + frac_2 * (R2[1][0] * A[0] + R2[1][1] * A[1]);

        
        // frac_1 = sequence.getElement(this.itters - num) / sequence.getElement(this.itters - num + 1);
        // frac_2 = sequence.getElement(this.itters - num) / sequence.getElement(this.itters - num + 1);

        angle_1 += sequence.getElement(this.itters - num);
        angle_2 += sequence.getElement(this.itters - num);

        // Recursive step
        this.draw_next(x1, right[0], y1, right[1], num, frac_1, frac_2, angle_1, angle_2, sequence);
        this.draw_next(x1, left[0], y1, left[1], num, frac_1, frac_2, angle_1, angle_2, sequence);
    }

    draw(){
        var angle_1 = degrees_to_radians(90);
        var angle_2 = degrees_to_radians(90);
        var frac_1 = 0.6;
        var frac_2 = 0.6;

        this.draw_next(this.sketch.width / 2 - 1, this.origin_x - 1, this.sketch.height - 1, this.origin_y - 1, this.itters, frac_1, frac_2, angle_1, angle_2, this.seq);

        for(let i = 0; i < this.lines.length; ++i) {
                this.lines[i].draw(this.sketch);
        }

        this.sketch.noLoop();
    }
}

const SCHEMA_FractalMap = {
        n: {
                type: 'number',
                title: 'N',
                description: 'Number of elements',
                required: true
        },
        Levels: {
                type: 'number',
                title: 'Levels',
                description: 'Number of levels',
                required: true
        },
};

const MODULE_FractalMap = {
    viz: VIZ_FractalMap,
    name: 'FractalMap',
    description: '',
    configSchema: SCHEMA_FractalMap
};

module.exports = MODULE_FractalMap
    

},{}],5:[function(require,module,exports){
//An example module


class VIZ_ModFill {
	constructor(seq, sketch, config) {
		this.sketch = sketch;
		this.seq = seq;
		this.modDimension = config.modDimension;
		this.i = 0;
	}

	drawNew(num, seq) {
		let black = this.sketch.color(0);
		this.sketch.fill(black);
		let i;
		let j;
		for (let mod = 1; mod <= this.modDimension; mod++) {
			i = seq.getElement(num) % mod;
			j = mod - 1;
			this.sketch.rect(j * this.rectWidth, this.sketch.height - (i + 1) * this.rectHeight, this.rectWidth, this.rectHeight);
		}

	}

	setup() {
		this.rectWidth = this.sketch.width / this.modDimension;
		this.rectHeight = this.sketch.height / this.modDimension;
		this.sketch.noStroke();
	}

	draw() {
		this.drawNew(this.i, this.seq);
		this.i++;
		if (i == 1000) {
			this.sketch.noLoop();
		}
	}

}

const SCHEMA_ModFill = {
	modDimension: {
		type: "number",
		title: "Mod dimension",
		description: "",
		required: true
	}
};


const MODULE_ModFill = {
	viz: VIZ_ModFill,
	name: "Mod Fill",
	description: "",
	configSchema: SCHEMA_ModFill
};

module.exports = MODULE_ModFill;
},{}],6:[function(require,module,exports){
class VIZ_shiftCompare {
	constructor(seq, sketch, config) {
		//Sketch is your canvas
		//config is the parameters you expect
		//seq is the sequence you are drawing
		this.sketch = sketch;
		this.seq = seq;
		this.MOD = 2;
		// Set up the image once.
	}


	setup() {
		console.log(this.sketch.height, this.sketch.width);
		this.img = this.sketch.createImage(this.sketch.width, this.sketch.height);
		this.img.loadPixels(); // Enables pixel-level editing.
	}

	clip(a, min, max) {
		if (a < min) {
			return min;
		} else if (a > max) {
			return max;
		}
		return a;
	}


	draw() { //This will be called everytime to draw
		// Ensure mouse coordinates are sane.
		// Mouse coordinates look they're floats by default.

		let d = this.sketch.pixelDensity();
		let mx = this.clip(Math.round(this.sketch.mouseX), 0, this.sketch.width);
		let my = this.clip(Math.round(this.sketch.mouseY), 0, this.sketch.height);
		if (this.sketch.key == 'ArrowUp') {
			this.MOD += 1;
			this.sketch.key = null;
			console.log("UP PRESSED, NEW MOD: " + this.MOD);
		} else if (this.sketch.key == 'ArrowDown') {
			this.MOD -= 1;
			this.sketch.key = null;
			console.log("DOWN PRESSED, NEW MOD: " + this.MOD);
		} else if (this.sketch.key == 'ArrowRight') {
			console.log(console.log("MX: " + mx + " MY: " + my));
		}
		// Write to image, then to screen for speed.
		for (let x = 0; x < this.sketch.width; x++) {
			for (let y = 0; y < this.sketch.height; y++) {
				for (let i = 0; i < d; i++) {
					for (let j = 0; j < d; j++) {
						let index = 4 * ((y * d + j) * this.sketch.width * d + (x * d + i));
						if (this.seq.getElement(x) % (this.MOD) == this.seq.getElement(y) % (this.MOD)) {
							this.img.pixels[index] = 255;
							this.img.pixels[index + 1] = 255;
							this.img.pixels[index + 2] = 255;
							this.img.pixels[index + 3] = 255;
						} else {
							this.img.pixels[index] = 0;
							this.img.pixels[index + 1] = 0;
							this.img.pixels[index + 2] = 0;
							this.img.pixels[index + 3] = 255;
						}
					}
				}
			}
		}

		this.img.updatePixels(); // Copies our edited pixels to the image.

		this.sketch.image(this.img, 0, 0); // Display image to screen.this.sketch.line(50,50,100,100);
	}
}


const MODULE_ShiftCompare = {
	viz: VIZ_shiftCompare,
	name: "Shift Compare",
	description: "",
	configSchema: {}
};

module.exports = MODULE_ShiftCompare;
},{}],7:[function(require,module,exports){
class VIZ_Turtle {
	constructor(seq, sketch, config) {
		var domain = config.domain;
		var range = config.range;
		this.rotMap = {};
		for (let i = 0; i < domain.length; i++) {
			this.rotMap[domain[i]] = (Math.PI / 180) * range[i];
		}
		this.stepSize = config.stepSize;
		this.bgColor = config.bgColor;
		this.strokeColor = config.strokeColor;
		this.strokeWidth = config.strokeWeight;
		this.seq = seq;
		this.currentIndex = 0;
		this.orientation = 0;
		this.sketch = sketch;
		if (config.startingX != "") {
			this.X = config.startingX;
			this.Y = config.startingY;
		} else {
			this.X = null;
			this.Y = null;
		}

	}
	stepDraw() {
		let oldX = this.X;
		let oldY = this.Y;
		let currElement = this.seq.getElement(this.currentIndex++);
		let angle = this.rotMap[currElement];
		if (angle == undefined) {
			throw ('angle undefined for element: ' + currElement);
		}
		this.orientation = (this.orientation + angle);
		this.X += this.stepSize * Math.cos(this.orientation);
		this.Y += this.stepSize * Math.sin(this.orientation);
		this.sketch.line(oldX, oldY, this.X, this.Y);
	}
	setup() {
		this.X = this.sketch.width / 2;
		this.Y = this.sketch.height / 2;
		this.sketch.background(this.bgColor);
		this.sketch.stroke(this.strokeColor);
		this.sketch.strokeWeight(this.strokeWidth);
	}
	draw() {
		this.stepDraw();
	}
}


const SCHEMA_Turtle = {
	domain: {
		type: 'string',
		title: 'Sequence Domain',
		description: 'Comma seperated numbers',
		format: 'list',
		default: "0,1,2,3,4",
		required: true
	},
	range: {
		type: 'string',
		title: 'Angles',
		default: "30,45,60,90,120",
		format: 'list',
		description: 'Comma seperated numbers',
		required: true
	},
	stepSize: {
		type: 'number',
		title: 'Step Size',
		default: 20,
		required: true
	},
	strokeWeight: {
		type: 'number',
		title: 'Stroke Width',
		default: 5,
		required: true
	},
	startingX: {
		type: 'number',
		tite: 'X start'
	},
	startingY: {
		type: 'number',
		tite: 'Y start'
	},
	bgColor: {
		type: 'string',
		title: 'Background Color',
		format: 'color',
		default: "#666666",
		required: false
	},
	strokeColor: {
		type: 'string',
		title: 'Stroke Color',
		format: 'color',
		default: '#ff0000',
		required: false
	},
};

const MODULE_Turtle = {
	viz: VIZ_Turtle,
	name: "Turtle",
	description: "",
	configSchema: SCHEMA_Turtle
};


module.exports = MODULE_Turtle;
},{}],8:[function(require,module,exports){
        
// number of iterations for
// the reiman zeta function computation
const num_iter = 10

class VIZ_Zeta {
        constructor(seq, sketch, config){
                // Sequence label
                this.seq = seq

                // P5 sketch object
                this.sketch = sketch
                this.size = 200;
        }

        setup(){
                this.iter = 0;
                this.sketch.pixelDensity(1);
                this.sketch.frameRate(1);

                this.workingSequence = [];
                var j = 0;
                var k = 1;
                for(let i = 0; i < this.sketch.width; ++i) {
                        this.workingSequence.push(k % 40);
                        var temp = j;
                        j = k;
                        k = k + temp;
                        console.log(k % 40);
                }
        }


        mappingFunc(x_, y_, iters) {
                let a = x_;
                let b = y_;
                let n_ = 0;
                while(n_ < iters) {
                        const aa = a*a;
                        const bb = b*b;
                        const ab = 2.0 * a * b;

                        a = aa - bb + x_;
                        b = ab + y_;
                        n_++;
                }
                return Math.sqrt(a * a + b * b);
        }

        // mappingFunc(x_, y_, iters) {
        //         let a = x_;
        //         let n_ = 0;
        //         let R = 2.0;
        //         while(n_ < iters) {
        //                 const next = R * a * (1 - a);
        //                 a = next;
        //                 n_ ++;
        //         }
        //         return a;
        // }
        //

        drawMap(maxiterations){

                this.sketch.background(0);
                const w = 4;
                const h = (w * this.sketch.height) / this.sketch.width;

                const xmin = -w/2;
                const ymin = -h/2;

                this.sketch.loadPixels();

                const xmax = xmin + w;
                const ymax = ymin + h;

                const dx = (xmax - xmin) / (this.sketch.width);
                const dy = (ymax - ymin) / (this.sketch.height);

                // Imaginary part
                let y = ymin;
                for(let i = 0; i < this.sketch.height; ++i) {

                        // Real part 
                        let x = xmin;
                        for(let j = 0; j < this.sketch.width; ++j) {


                                let n = this.mappingFunc(x, y, maxiterations);
                                // Multiply complex numbers maxiterations times


                                // index of the pixel based on i, j (4 spanned array)
                                const pix = (j + i*this.sketch.width) * 4;

                                // Proportionality solver:
                                // maps n  \in [0, maxiterations] 
                                // to   n' \in [0, 1]
                                const norm = this.sketch.map(n, 0, maxiterations, 0, 1);

                                // constrain between 0 and 255
                                let colo = this.sketch.map(Math.sqrt(norm), 0, 1, 0, 255);

                                if (n == maxiterations) {
                                        colo = 0;
                                } else {
                                        // RGB coloring gets indexed here
                                        this.sketch.pixels[pix + 0] = colo;
                                        this.sketch.pixels[pix + 1] = colo;
                                        this.sketch.pixels[pix + 2] = colo;

                                        // Alpha:
                                        // https://en.wikipedia.org/wiki/RGBA_color_model
                                        // This is opacity
                                        this.sketch.pixels[pix + 3] = 255;
                                }
                                x += dx;
                        }
                        y += dy;
                }

                this.sketch.updatePixels();
        }

        draw() {
                this.drawMap(this.iter);
                this.iter = (this.iter + 1) % 200;
        }




}

const SCHEMA_Zeta = {
            n: {
                  type: 'number',
                  title: 'N',
                  description: 'Number of elements',
                  required: true
          },
          Levels: {
                  type: 'number',
                  title: 'Levels',
                  description: 'Number of levels',
                  required: true
          },
  };


const MODULE_Zeta = {
    viz: VIZ_Zeta,
    name: 'Zeta',
    description: '',
    configSchema: SCHEMA_Zeta
}

module.exports = MODULE_Zeta
    

},{}],9:[function(require,module,exports){
//Add an import line here for new modules


//Add new modules to this constant.
const MODULES = {};

module.exports = MODULES;

/*jshint ignore:start */
MODULES["Turtle"] = require('./moduleTurtle.js');
MODULES["ShiftCompare"] = require('./moduleShiftCompare.js');
MODULES["Differences"] = require('./moduleDifferences.js');
MODULES["ModFill"] = require('./moduleModFill.js');
MODULES['Zeta'] = require('./moduleZeta.js')

MODULES['FractalMap'] = require('./moduleFractalMap.js')

},{"./moduleDifferences.js":3,"./moduleFractalMap.js":4,"./moduleModFill.js":5,"./moduleShiftCompare.js":6,"./moduleTurtle.js":7,"./moduleZeta.js":8}],10:[function(require,module,exports){
SEQ_linearRecurrence = require('./sequenceLinRec.js');

function GEN_fibonacci({
    m
}) {
    return SEQ_linearRecurrence.generator({
        coefficientList: [1, 1],
        seedList: [1, 1],
        m
    });
}

const SCHEMA_Fibonacci = {
    m: {
        type: 'number',
        title: 'Mod',
        description: 'A number to mod the sequence by by',
        required: false
    }
};


const SEQ_fibonacci = {
    generator: GEN_fibonacci,
    name: "Fibonacci",
    description: "",
    paramsSchema: SCHEMA_Fibonacci
};

module.exports = SEQ_fibonacci;
},{"./sequenceLinRec.js":11}],11:[function(require,module,exports){
function GEN_linearRecurrence({
    coefficientList,
    seedList,
    m
}) {
    if (coefficientList.length != seedList.length) {
        //Number of seeds should match the number of coefficients
        console.log("number of coefficients not equal to number of seeds ");
        return null;
    }
    let k = coefficientList.length;
    let genericLinRec;
    if (m != null) {
        for (let i = 0; i < coefficientList.length; i++) {
            coefficientList[i] = coefficientList[i] % m;
            seedList[i] = seedList[i] % m;
        }
        genericLinRec = function (n, cache) {
            if (n < seedList.length) {
                cache[n] = seedList[n];
                return cache[n];
            }
            for (let i = cache.length; i <= n; i++) {
                let sum = 0;
                for (let j = 0; j < k; j++) {
                    sum += cache[i - j - 1] * coefficientList[j];
                }
                cache[i] = sum % m;
            }
            return cache[n];
        };
    } else {
        genericLinRec = function (n, cache) {
            if (n < seedList.length) {
                cache[n] = seedList[n];
                return cache[n];
            }

            for (let i = cache.length; i <= n; i++) {
                let sum = 0;
                for (let j = 0; j < k; j++) {
                    sum += cache[i - j - 1] * coefficientList[j];
                }
                cache[i] = sum;
            }
            return cache[n];
        };
    }
    return genericLinRec;
}

const SCHEMA_linearRecurrence = {
    coefficientList: {
        type: 'string',
        title: 'Coefficients list',
        format: 'list',
        description: 'Comma seperated numbers',
        required: true
    },
    seedList: {
        type: 'string',
        title: 'Seed list',
        format: 'list',
        description: 'Comma seperated numbers',
        required: true
    },
    m: {
        type: 'number',
        title: 'Mod',
        description: 'A number to mod the sequence by by',
        required: false
    }
};


const SEQ_linearRecurrence = {
    generator: GEN_linearRecurrence,
    name: "Linear Recurrence",
    description: "",
    paramsSchema: SCHEMA_linearRecurrence
};

module.exports = SEQ_linearRecurrence;
},{}],12:[function(require,module,exports){
const SEQ_linearRecurrence = require('./sequenceLinRec.js');

function GEN_Lucas({
    m
}) {
    return SEQ_linearRecurrence.generator({
        coefficientList: [1, 1],
        seedList: [2, 1],
        m
    });
}

const SCHEMA_Lucas = {
    m: {
        type: 'number',
        title: 'Mod',
        description: 'A number to mod the sequence by by',
        required: false
    }
};


const SEQ_Lucas = {
    generator: GEN_Lucas,
    name: "Lucas",
    description: "",
    paramsSchema: SCHEMA_Lucas
};

module.exports = SEQ_Lucas;
},{"./sequenceLinRec.js":11}],13:[function(require,module,exports){
function GEN_Naturals({
    includezero
}) {
    if (includezero) {
        return ((n) => n);
    } else {
        return ((n) => n + 1);
    }
}

const SCHEMA_Naturals = {
    includezero: {
        type: 'boolean',
        title: 'Include zero',
        description: '',
        default: 'false',
        required: false
    }
};


const SEQ_Naturals = {
    generator: GEN_Naturals,
    name: "Naturals",
    description: "",
    paramsSchema: SCHEMA_Naturals
};

// export default SEQ_Naturals
module.exports = SEQ_Naturals;
},{}],14:[function(require,module,exports){
function GEN_Primes() {
    const primes = function (n, cache) {
        if (cache.length == 0) {
            cache.push(2);
            cache.push(3);
            cache.push(5);
        }
        let i = cache[cache.length - 1] + 1;
        let k = 0;
        while (cache.length <= n) {
            let isPrime = true;
            for (let j = 0; j < cache.length; j++) {
                if (i % cache[j] == 0) {
                    isPrime = false;
                    break;
                }
            }
            if (isPrime) {
                cache.push(i);
            }
            i++;
        }
        return cache[n];
    };
    return primes;
}


const SCHEMA_Primes = {
    m: {
        type: 'number',
        title: 'Mod',
        description: 'A number to mod the sequence by',
        required: false
    }
};


const SEQ_Primes = {
    generator: GEN_Primes,
    name: "Primes",
    description: "",
    paramsSchema: SCHEMA_Primes
};

module.exports = SEQ_Primes;
},{}],15:[function(require,module,exports){
/**
 *
 * @class SequenceGenerator
 */
class SequenceGenerator {
    /**
     *Creates an instance of SequenceGenerator.
     * @param {*} generator a function that takes a natural number and returns a number, it can optionally take the cache as a second argument
     * @param {*} ID the ID of the sequence
     * @memberof SequenceGenerator
     */
    constructor(ID, generator) {
        this.generator = generator;
        this.ID = ID;
        this.cache = [];
        this.newSize = 1;
    }
    /**
     * if we need to get the nth element and it's not present in
     * in the cache, then we either double the size, or the 
     * new size becomes n+1
     * @param {*} n 
     * @memberof SequenceGenerator
     */
    resizeCache(n) {
        this.newSize = this.cache.length * 2;
        if (n + 1 > this.newSize) {
            this.newSize = n + 1;
        }
    }
    /**
     * Populates the cache up until the current newSize
     * this is called after resizeCache
     * @memberof SequenceGenerator
     */
    fillCache() {
        for (let i = this.cache.length; i < this.newSize; i++) {
            //the generator is given the cache since it would make computation more efficient sometimes
            //but the generator doesn't necessarily need to take more than one argument.
            this.cache[i] = this.generator(i, this.cache);
        }
    }
    /**
     * Get element is what the drawing tools will be calling, it retrieves
     * the nth element of the sequence by either getting it from the cache
     * or if isn't present, by building the cache and then getting it
     * @param {*} n the index of the element in the sequence we want
     * @returns a number
     * @memberof SequenceGenerator
     */
    getElement(n) {
        if (this.cache[n] != undefined || this.finite) {
            // console.log("cache hit")
            return this.cache[n];
        } else {
            // console.log("cache miss")
            this.resizeCache(n);
            this.fillCache();
            return this.cache[n];
        }
    }
}


/**
 *
 *
 * @param {*} code arbitrary sage code to be executed on aleph
 * @returns ajax response object
 */
function sageExecute(code) {
    return $.ajax({
        type: 'POST',
        async: false,
        url: 'http://aleph.sagemath.org/service',
        data: "code=" + code
    });
}

/**
 *
 *
 * @param {*} code arbitrary sage code to be executed on aleph
 * @returns ajax response object
 */
async function sageExecuteAsync(code) {
    return await $.ajax({
        type: 'POST',
        url: 'http://aleph.sagemath.org/service',
        data: "code=" + code
    });
}


class OEISSequenceGenerator {
    constructor(ID, OEIS) {
        this.OEIS = OEIS;
        this.ID = ID;
        this.cache = [];
        this.newSize = 1;
        this.prefillCache();
    }
    oeisFetch(n) {
        console.log("Fetching..");
        let code = `print(sloane.${this.OEIS}.list(${n}))`;
        let resp = sageExecute(code);
        return JSON.parse(resp.responseJSON.stdout);
    }
    async prefillCache() {
        this.resizeCache(3000);
        let code = `print(sloane.${this.OEIS}.list(${this.newSize}))`;
        let resp = await sageExecuteAsync(code);
        console.log(resp);
        this.cache = this.cache.concat(JSON.parse(resp.stdout));
    }
    resizeCache(n) {
        this.newSize = this.cache.length * 2;
        if (n + 1 > this.newSize) {
            this.newSize = n + 1;
        }
    }
    fillCache() {
        let newList = this.oeisFetch(this.newSize);
        this.cache = this.cache.concat(newList);
    }
    getElement(n) {
        if (this.cache[n] != undefined) {
            return this.cache[n];
        } else {
            this.resizeCache();
            this.fillCache();
            return this.cache[n];
        }
    }
}

function BuiltInNameToSeq(ID, seqName, seqParams) {
    let generator = BuiltInSeqs[seqName].generator(seqParams);
    return new SequenceGenerator(ID, generator);
}


function ListToSeq(ID, list) {
    let listGenerator = function (n) {
        return list[n];
    };
    return new SequenceGenerator(ID, listGenerator);
}

function OEISToSeq(ID, OEIS) {
    return new OEISSequenceGenerator(ID, OEIS);
}


const BuiltInSeqs = {};


module.exports = {
    'BuiltInNameToSeq': BuiltInNameToSeq,
    'ListToSeq': ListToSeq,
    'OEISToSeq': OEISToSeq,
    'BuiltInSeqs': BuiltInSeqs
};

/*jshint ignore: start */
BuiltInSeqs["Fibonacci"] = require('./sequenceFibonacci.js');
BuiltInSeqs["Lucas"] = require('./sequenceLucas.js');
BuiltInSeqs["Primes"] = require('./sequencePrimes.js');
BuiltInSeqs["Naturals"] = require('./sequenceNaturals.js');
BuiltInSeqs["LinRec"] = require('./sequenceLinRec.js');
BuiltInSeqs['Primes'] = require('./sequencePrimes.js');
},{"./sequenceFibonacci.js":10,"./sequenceLinRec.js":11,"./sequenceLucas.js":12,"./sequenceNaturals.js":13,"./sequencePrimes.js":14}],16:[function(require,module,exports){
module.exports = ["A000001", "A000027", "A000004", "A000005", "A000008", "A000009", "A000796", "A003418", "A007318", "A008275", "A008277", "A049310", "A000010", "A000007", "A005843", "A000035", "A000169", "A000272", "A000312", "A001477", "A004526", "A000326", "A002378", "A002620", "A005408", "A000012", "A000120", "A010060", "A000069", "A001969", "A000290", "A000225", "A000015", "A000016", "A000032", "A004086", "A002113", "A000030", "A000040", "A002808", "A018252", "A000043", "A000668", "A000396", "A005100", "A005101", "A002110", "A000720", "A064553", "A001055", "A006530", "A000961", "A005117", "A020639", "A000041", "A000045", "A000108", "A001006", "A000079", "A000578", "A000244", "A000302", "A000583", "A000142", "A000085", "A001189", "A000670", "A006318", "A000165", "A001147", "A006882", "A000984", "A001405", "A000292", "A000330", "A000153", "A000255", "A000261", "A001909", "A001910", "A090010", "A055790", "A090012", "A090013", "A090014", "A090015", "A090016", "A000166", "A000203", "A001157", "A008683", "A000204", "A000217", "A000124", "A002275", "A001110", "A051959", "A001221", "A001222", "A046660", "A001227", "A001358", "A001694", "A001836", "A001906", "A001333", "A001045", "A000129", "A001109", "A015521", "A015523", "A015530", "A015531", "A015551", "A082411", "A083103", "A083104", "A083105", "A083216", "A061084", "A000213", "A000073", "A079922", "A079923", "A109814", "A111774", "A111775", "A111787", "A000110", "A000587", "A000100"]

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsInN0YXRpYy9qcy9OU2NvcmUuanMiLCJzdGF0aWMvanMvVmFsaWRhdGlvbi5qcyIsInN0YXRpYy9qcy9tb2R1bGVzL21vZHVsZURpZmZlcmVuY2VzLmpzIiwic3RhdGljL2pzL21vZHVsZXMvbW9kdWxlRnJhY3RhbE1hcC5qcyIsInN0YXRpYy9qcy9tb2R1bGVzL21vZHVsZU1vZEZpbGwuanMiLCJzdGF0aWMvanMvbW9kdWxlcy9tb2R1bGVTaGlmdENvbXBhcmUuanMiLCJzdGF0aWMvanMvbW9kdWxlcy9tb2R1bGVUdXJ0bGUuanMiLCJzdGF0aWMvanMvbW9kdWxlcy9tb2R1bGVaZXRhLmpzIiwic3RhdGljL2pzL21vZHVsZXMvbW9kdWxlcy5qcyIsInN0YXRpYy9qcy9zZXF1ZW5jZXMvc2VxdWVuY2VGaWJvbmFjY2kuanMiLCJzdGF0aWMvanMvc2VxdWVuY2VzL3NlcXVlbmNlTGluUmVjLmpzIiwic3RhdGljL2pzL3NlcXVlbmNlcy9zZXF1ZW5jZUx1Y2FzLmpzIiwic3RhdGljL2pzL3NlcXVlbmNlcy9zZXF1ZW5jZU5hdHVyYWxzLmpzIiwic3RhdGljL2pzL3NlcXVlbmNlcy9zZXF1ZW5jZVByaW1lcy5qcyIsInN0YXRpYy9qcy9zZXF1ZW5jZXMvc2VxdWVuY2VzLmpzIiwic3RhdGljL2pzL3ZhbGlkT0VJUy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5UEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9KQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFLQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiLypqc2hpbnQgbWF4ZXJyOiAxMDAwMCAqL1xuXG5TRVFVRU5DRSA9IHJlcXVpcmUoJy4vc2VxdWVuY2VzL3NlcXVlbmNlcy5qcycpO1xuTU9EVUxFUyA9IHJlcXVpcmUoJy4vbW9kdWxlcy9tb2R1bGVzLmpzJyk7XG5WYWxpZGF0aW9uID0gcmVxdWlyZSgnLi9WYWxpZGF0aW9uLmpzJyk7XG5cbmNvbnN0IExpc3RUb1NlcSA9IFNFUVVFTkNFLkxpc3RUb1NlcTtcbmNvbnN0IE9FSVNUb1NlcSA9IFNFUVVFTkNFLk9FSVNUb1NlcTtcbmNvbnN0IEJ1aWx0SW5OYW1lVG9TZXEgPSBTRVFVRU5DRS5CdWlsdEluTmFtZVRvU2VxO1xuXG5mdW5jdGlvbiBzdHJpbmdUb0FycmF5KHN0ckFycikge1xuXHRyZXR1cm4gSlNPTi5wYXJzZShcIltcIiArIHN0ckFyciArIFwiXVwiKTtcbn1cblxuY29uc3QgTlNjb3JlID0gZnVuY3Rpb24gKCkge1xuXHRjb25zdCBtb2R1bGVzID0gTU9EVUxFUzsgLy8gIGNsYXNzZXMgdG8gdGhlIGRyYXdpbmcgbW9kdWxlc1xuXHRjb25zdCBCdWlsdEluU2VxcyA9IFNFUVVFTkNFLkJ1aWx0SW5TZXFzO1xuXHRjb25zdCB2YWxpZE9FSVMgPSBWQUxJRE9FSVM7XG5cdHZhciBwcmVwYXJlZFNlcXVlbmNlcyA9IFtdOyAvLyBzZXF1ZW5jZUdlbmVyYXRvcnMgdG8gYmUgZHJhd25cblx0dmFyIHByZXBhcmVkVG9vbHMgPSBbXTsgLy8gY2hvc2VuIGRyYXdpbmcgbW9kdWxlcyBcblx0dmFyIHVucHJvY2Vzc2VkU2VxdWVuY2VzID0gW107IC8vc2VxdWVuY2VzIGluIGEgc2F2ZWFibGUgZm9ybWF0XG5cdHZhciB1bnByb2Nlc3NlZFRvb2xzID0gW107IC8vdG9vbHMgaW4gYSBzYXZlYWJsZSBmb3JtYXRcblx0dmFyIGxpdmVTa2V0Y2hlcyA9IFtdOyAvLyBwNSBza2V0Y2hlcyBiZWluZyBkcmF3blxuXG5cdC8qKlxuXHQgKlxuXHQgKlxuXHQgKiBAcGFyYW0geyp9IG1vZHVsZUNsYXNzIGRyYXdpbmcgbW9kdWxlIHRvIGJlIHVzZWQgZm9yIHRoaXMgc2tldGNoXG5cdCAqIEBwYXJhbSB7Kn0gY29uZmlnIGNvcnJlc3BvbmRpbmcgY29uZmlnIGZvciBkcmF3aW5nIG1vZHVsZVxuXHQgKiBAcGFyYW0geyp9IHNlcSBzZXF1ZW5jZSB0byBiZSBwYXNzZWQgdG8gZHJhd2luZyBtb2R1bGVcblx0ICogQHBhcmFtIHsqfSBkaXZJRCBkaXYgd2hlcmUgc2tldGNoIHdpbGwgYmUgcGxhY2VkXG5cdCAqIEBwYXJhbSB7Kn0gd2lkdGggd2lkdGggb2Ygc2tldGNoXG5cdCAqIEBwYXJhbSB7Kn0gaGVpZ2h0IGhlaWdodCBvZiBza2V0Y2hcblx0ICogQHJldHVybnMgcDUgc2tldGNoXG5cdCAqL1xuXHRjb25zdCBnZW5lcmF0ZVA1ID0gZnVuY3Rpb24gKG1vZHVsZUNsYXNzLCBjb25maWcsIHNlcSwgZGl2SUQsIHdpZHRoLCBoZWlnaHQpIHtcblxuXHRcdC8vQ3JlYXRlIGNhbnZhcyBlbGVtZW50IGhlcmVcblx0XHR2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0Ly9UaGUgc3R5bGUgb2YgdGhlIGNhbnZhc2VzIHdpbGwgYmUgXCJjYW52YXNDbGFzc1wiXG5cdFx0ZGl2LmNsYXNzTmFtZSA9IFwiY2FudmFzQ2xhc3NcIjtcblx0XHRkaXYuaWQgPSBcImxpdmVDYW52YXNcIiArIGRpdklEO1xuXHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY2FudmFzQXJlYVwiKS5hcHBlbmRDaGlsZChkaXYpO1xuXHRcdC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHRcdC8vQ3JlYXRlIFA1anMgaW5zdGFuY2Vcblx0XHRsZXQgbXlwNSA9IG5ldyBwNShmdW5jdGlvbiAoc2tldGNoKSB7XG5cdFx0XHRsZXQgbW9kdWxlSW5zdGFuY2UgPSBuZXcgbW9kdWxlQ2xhc3Moc2VxLCBza2V0Y2gsIGNvbmZpZyk7XG5cdFx0XHRza2V0Y2guc2V0dXAgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHNrZXRjaC5jcmVhdGVDYW52YXMod2lkdGgsIGhlaWdodCk7XG5cdFx0XHRcdHNrZXRjaC5iYWNrZ3JvdW5kKFwid2hpdGVcIik7XG5cdFx0XHRcdG1vZHVsZUluc3RhbmNlLnNldHVwKCk7XG5cdFx0XHR9O1xuXG5cdFx0XHRza2V0Y2guZHJhdyA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0bW9kdWxlSW5zdGFuY2UuZHJhdygpO1xuXHRcdFx0fTtcblx0XHR9LCBkaXYuaWQpO1xuXHRcdHJldHVybiBteXA1O1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBXaGVuIHRoZSB1c2VyIGNob29zZXMgYSBkcmF3aW5nIG1vZHVsZSBhbmQgcHJvdmlkZXMgY29ycmVzcG9uZGluZyBjb25maWdcblx0ICogaXQgd2lsbCBhdXRvbWF0aWNhbGx5IGJlIHBhc3NlZCB0byB0aGlzIGZ1bmN0aW9uLCB3aGljaCB3aWxsIHZhbGlkYXRlIGlucHV0XG5cdCAqIGFuZCBhcHBlbmQgaXQgdG8gdGhlIHByZXBhcmVkIHRvb2xzXG5cdCAqIEBwYXJhbSB7Kn0gbW9kdWxlT2JqIGluZm9ybWF0aW9uIHVzZWQgdG8gcHJlcGFyZSB0aGUgcmlnaHQgZHJhd2luZyBtb2R1bGUsIHRoaXMgaW5wdXRcblx0ICogdGhpcyB3aWxsIGNvbnRhaW4gYW4gSUQsIHRoZSBtb2R1bGVLZXkgd2hpY2ggc2hvdWxkIG1hdGNoIGEga2V5IGluIE1PRFVMRVNfSlNPTiwgYW5kXG5cdCAqIGEgY29uZmlnIG9iamVjdC5cblx0ICovXG5cdGNvbnN0IHJlY2VpdmVNb2R1bGUgPSBmdW5jdGlvbiAobW9kdWxlT2JqKSB7XG5cdFx0aWYgKChtb2R1bGVPYmouSUQgJiYgbW9kdWxlT2JqLm1vZHVsZUtleSAmJiBtb2R1bGVPYmouY29uZmlnICYmIG1vZHVsZXNbbW9kdWxlT2JqLm1vZHVsZUtleV0pID09IHVuZGVmaW5lZCkge1xuXHRcdFx0Y29uc29sZS5lcnJvcihcIk9uZSBvciBtb3JlIHVuZGVmaW5lZCBtb2R1bGUgcHJvcGVydGllcyByZWNlaXZlZCBpbiBOU2NvcmVcIik7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHZhbGlkYXRpb25SZXN1bHQgPSBWYWxpZGF0aW9uLm1vZHVsZShtb2R1bGVPYmopO1xuXHRcdFx0aWYgKHZhbGlkYXRpb25SZXN1bHQuZXJyb3JzLmxlbmd0aCAhPSAwKSB7XG5cdFx0XHRcdHByZXBhcmVkVG9vbHNbbW9kdWxlT2JqLklEXSA9IG51bGw7XG5cdFx0XHRcdHJldHVybiB2YWxpZGF0aW9uUmVzdWx0LmVycm9ycztcblx0XHRcdH1cblx0XHRcdG1vZHVsZU9iai5jb25maWcgPSB2YWxpZGF0aW9uUmVzdWx0LnBhcnNlZEZpZWxkcztcblx0XHRcdHByZXBhcmVkVG9vbHNbbW9kdWxlT2JqLklEXSA9IHtcblx0XHRcdFx0bW9kdWxlOiBtb2R1bGVzW21vZHVsZU9iai5tb2R1bGVLZXldLFxuXHRcdFx0XHRjb25maWc6IG1vZHVsZU9iai5jb25maWcsXG5cdFx0XHRcdElEOiBtb2R1bGVPYmouSURcblx0XHRcdH07XG5cdFx0XHR1bnByb2Nlc3NlZFRvb2xzW21vZHVsZU9iai5JRF0gPSBtb2R1bGVPYmo7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cdH07XG5cblx0LyoqXG5cdCAqIFdoZW4gdGhlIHVzZXIgY2hvb3NlcyBhIHNlcXVlbmNlLCB3ZSB3aWxsIGF1dG9tYXRpY2FsbHkgcGFzcyBpdCB0byB0aGlzIGZ1bmN0aW9uXG5cdCAqIHdoaWNoIHdpbGwgdmFsaWRhdGUgdGhlIGlucHV0LCBhbmQgdGhlbiBkZXBlbmRpbmcgb24gdGhlIGlucHV0IHR5cGUsIGl0IHdpbGwgcHJlcGFyZVxuXHQgKiB0aGUgc2VxdWVuY2UgaW4gc29tZSB3YXkgdG8gZ2V0IGEgc2VxdWVuY2VHZW5lcmF0b3Igb2JqZWN0IHdoaWNoIHdpbGwgYmUgYXBwZW5kZWRcblx0ICogdG8gcHJlcGFyZWRTZXF1ZW5jZXNcblx0ICogQHBhcmFtIHsqfSBzZXFPYmogaW5mb3JtYXRpb24gdXNlZCB0byBwcmVwYXJlIHRoZSByaWdodCBzZXF1ZW5jZSwgdGhpcyB3aWxsIGNvbnRhaW4gYVxuXHQgKiBzZXF1ZW5jZSBJRCwgdGhlIHR5cGUgb2YgaW5wdXQsIGFuZCB0aGUgaW5wdXQgaXRzZWxmIChzZXF1ZW5jZSBuYW1lLCBhIGxpc3QsIGFuIE9FSVMgbnVtYmVyLi5ldGMpLlxuXHQgKi9cblx0Y29uc3QgcmVjZWl2ZVNlcXVlbmNlID0gZnVuY3Rpb24gKHNlcU9iaikge1xuXHRcdGlmICgoc2VxT2JqLklEICYmIHNlcU9iai5pbnB1dFR5cGUgJiYgc2VxT2JqLmlucHV0VmFsdWUgJiYgc2VxT2JqLnBhcmFtZXRlcnMpID09IHVuZGVmaW5lZCkge1xuXHRcdFx0Y29uc29sZS5lcnJvcihcIk9uZSBvciBtb3JlIHVuZGVmaW5lZCBtb2R1bGUgcHJvcGVydGllcyByZWNlaXZlZCBpbiBOU2NvcmVcIik7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIFdlIHdpbGwgcHJvY2VzcyBkaWZmZXJlbnQgaW5wdXRzIGluIGRpZmZlcmVudCB3YXlzXG5cdFx0XHRpZiAoc2VxT2JqLmlucHV0VHlwZSA9PSBcImJ1aWx0SW5cIikge1xuXHRcdFx0XHR2YWxpZGF0aW9uUmVzdWx0ID0gVmFsaWRhdGlvbi5idWlsdEluKHNlcU9iaik7XG5cdFx0XHRcdGlmICh2YWxpZGF0aW9uUmVzdWx0LmVycm9ycy5sZW5ndGggIT0gMCkge1xuXHRcdFx0XHRcdHJldHVybiB2YWxpZGF0aW9uUmVzdWx0LmVycm9ycztcblx0XHRcdFx0fVxuXHRcdFx0XHRzZXFPYmoucGFyYW1ldGVycyA9IHZhbGlkYXRpb25SZXN1bHQucGFyc2VkRmllbGRzO1xuXHRcdFx0XHRwcmVwYXJlZFNlcXVlbmNlc1tzZXFPYmouSURdID0gQnVpbHRJbk5hbWVUb1NlcShzZXFPYmouSUQsIHNlcU9iai5pbnB1dFZhbHVlLCBzZXFPYmoucGFyYW1ldGVycyk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoc2VxT2JqLmlucHV0VHlwZSA9PSBcIk9FSVNcIikge1xuXHRcdFx0XHR2YWxpZGF0aW9uUmVzdWx0ID0gVmFsaWRhdGlvbi5vZWlzKHNlcU9iaik7XG5cdFx0XHRcdGlmICh2YWxpZGF0aW9uUmVzdWx0LmVycm9ycy5sZW5ndGggIT0gMCkge1xuXHRcdFx0XHRcdHJldHVybiB2YWxpZGF0aW9uUmVzdWx0LmVycm9ycztcblx0XHRcdFx0fVxuXHRcdFx0XHRwcmVwYXJlZFNlcXVlbmNlc1tzZXFPYmouSURdID0gT0VJU1RvU2VxKHNlcU9iai5JRCwgc2VxT2JqLmlucHV0VmFsdWUpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHNlcU9iai5pbnB1dFR5cGUgPT0gXCJsaXN0XCIpIHtcblx0XHRcdFx0dmFsaWRhdGlvblJlc3VsdCA9IFZhbGlkYXRpb24ubGlzdChzZXFPYmopO1xuXHRcdFx0XHRpZiAodmFsaWRhdGlvblJlc3VsdC5lcnJvcnMubGVuZ3RoICE9IDApIHtcblx0XHRcdFx0XHRyZXR1cm4gdmFsaWRhdGlvblJlc3VsdC5lcnJvcnM7XG5cdFx0XHRcdH1cblx0XHRcdFx0cHJlcGFyZWRTZXF1ZW5jZXNbc2VxT2JqLklEXSA9IExpc3RUb1NlcShzZXFPYmouSUQsIHNlcU9iai5pbnB1dFZhbHVlKTtcblxuXHRcdFx0fVxuXHRcdFx0aWYgKHNlcU9iai5pbnB1dFR5cGUgPT0gXCJjb2RlXCIpIHtcblx0XHRcdFx0Y29uc29sZS5lcnJvcihcIk5vdCBpbXBsZW1lbnRlZFwiKTtcblx0XHRcdH1cblx0XHRcdHVucHJvY2Vzc2VkU2VxdWVuY2VzW3NlcU9iai5JRF0gPSBzZXFPYmo7XG5cdFx0fVxuXHRcdHJldHVybiB0cnVlO1xuXHR9O1xuXHQvKipcblx0ICogV2UgaW5pdGlhbGl6ZSB0aGUgZHJhd2luZyBwcm9jZXNzaW5nLiBGaXJzdCB3ZSBjYWxjdWxhdGUgdGhlIGRpbWVuc2lvbnMgb2YgZWFjaCBza2V0Y2hcblx0ICogdGhlbiB3ZSBwYWlyIHVwIHNlcXVlbmNlcyBhbmQgZHJhd2luZyBtb2R1bGVzLCBhbmQgZmluYWxseSB3ZSBwYXNzIHRoZW0gdG8gZ2VuZXJhdGVQNVxuXHQgKiB3aGljaCBhY3R1YWxseSBpbnN0YW50aWF0ZXMgZHJhd2luZyBtb2R1bGVzIGFuZCBiZWdpbnMgZHJhd2luZy5cblx0ICogXG5cdCAqIEBwYXJhbSB7Kn0gc2VxVml6UGFpcnMgYSBsaXN0IG9mIHBhaXJzIHdoZXJlIGVhY2ggcGFpciBjb250YWlucyBhbiBJRCBvZiBhIHNlcXVlbmNlXG5cdCAqIGFuZCBhbiBJRCBvZiBhIGRyYXdpbmcgdG9vbCwgdGhpcyBsZXRzIHVzIGtub3cgdG8gcGFzcyB3aGljaCBzZXF1ZW5jZSB0byB3aGljaFxuXHQgKiBkcmF3aW5nIHRvb2wuXG5cdCAqL1xuXHRjb25zdCBiZWdpbiA9IGZ1bmN0aW9uIChzZXFWaXpQYWlycykge1xuXHRcdGhpZGVMb2coKTtcblxuXHRcdC8vRmlndXJpbmcgb3V0IGxheW91dFxuXHRcdC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblx0XHRsZXQgdG90YWxXaWR0aCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYW52YXNBcmVhJykub2Zmc2V0V2lkdGg7XG5cdFx0bGV0IHRvdGFsSGVpZ2h0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbnZhc0FyZWEnKS5vZmZzZXRIZWlnaHQ7XG5cdFx0bGV0IGNhbnZhc0NvdW50ID0gc2VxVml6UGFpcnMubGVuZ3RoO1xuXHRcdGxldCBncmlkU2l6ZSA9IE1hdGguY2VpbChNYXRoLnNxcnQoY2FudmFzQ291bnQpKTtcblx0XHRsZXQgaW5kaXZpZHVhbFdpZHRoID0gdG90YWxXaWR0aCAvIGdyaWRTaXplIC0gMjA7XG5cdFx0bGV0IGluZGl2aWR1YWxIZWlnaHQgPSB0b3RhbEhlaWdodCAvIGdyaWRTaXplO1xuXHRcdC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuXHRcdGZvciAobGV0IHBhaXIgb2Ygc2VxVml6UGFpcnMpIHtcblx0XHRcdGxldCBjdXJyZW50U2VxID0gcHJlcGFyZWRTZXF1ZW5jZXNbcGFpci5zZXFJRF07XG5cdFx0XHRsZXQgY3VycmVudFRvb2wgPSBwcmVwYXJlZFRvb2xzW3BhaXIudG9vbElEXTtcblx0XHRcdGlmIChjdXJyZW50U2VxID09IHVuZGVmaW5lZCB8fCBjdXJyZW50VG9vbCA9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0Y29uc29sZS5lcnJvcihcInVuZGVmaW5lZCBJRCBmb3IgdG9vbCBvciBzZXF1ZW5jZVwiKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGxpdmVTa2V0Y2hlcy5wdXNoKGdlbmVyYXRlUDUoY3VycmVudFRvb2wubW9kdWxlLnZpeiwgY3VycmVudFRvb2wuY29uZmlnLCBjdXJyZW50U2VxLCBsaXZlU2tldGNoZXMubGVuZ3RoLCBpbmRpdmlkdWFsV2lkdGgsIGluZGl2aWR1YWxIZWlnaHQpKTtcblx0XHRcdH1cblx0XHR9XG5cdH07XG5cblx0Y29uc3QgbWFrZUpTT04gPSBmdW5jdGlvbiAoc2VxVml6UGFpcnMpIHtcblx0XHRpZiggdW5wcm9jZXNzZWRTZXF1ZW5jZXMubGVuZ3RoID09IDAgJiYgdW5wcm9jZXNzZWRUb29scy5sZW5ndGggPT0gMCApe1xuXHRcdFx0cmV0dXJuIFwiTm90aGluZyB0byBzYXZlIVwiO1xuXHRcdH1cblx0XHR0b1Nob3cgPSBbXTtcblx0XHRmb3IgKGxldCBwYWlyIG9mIHNlcVZpelBhaXJzKSB7XG5cdFx0XHR0b1Nob3cucHVzaCh7XG5cdFx0XHRcdHNlcTogdW5wcm9jZXNzZWRTZXF1ZW5jZXNbcGFpci5zZXFJRF0sXG5cdFx0XHRcdHRvb2w6IHVucHJvY2Vzc2VkVG9vbHNbcGFpci50b29sSURdXG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0cmV0dXJuIEpTT04uc3RyaW5naWZ5KHRvU2hvdyk7XG5cdH07XG5cblx0Y29uc3QgY2xlYXIgPSBmdW5jdGlvbiAoKSB7XG5cdFx0c2hvd0xvZygpO1xuXHRcdGlmIChsaXZlU2tldGNoZXMubGVuZ3RoID09IDApIHtcblx0XHRcdHJldHVybjtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBsaXZlU2tldGNoZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0bGl2ZVNrZXRjaGVzW2ldLnJlbW92ZSgpOyAvL2RlbGV0ZSBjYW52YXMgZWxlbWVudFxuXHRcdFx0fVxuXHRcdH1cblx0fTtcblxuXHRjb25zdCBwYXVzZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRsaXZlU2tldGNoZXMuZm9yRWFjaChmdW5jdGlvbiAoc2tldGNoKSB7XG5cdFx0XHRza2V0Y2gubm9Mb29wKCk7XG5cdFx0fSk7XG5cdH07XG5cblx0Y29uc3QgcmVzdW1lID0gZnVuY3Rpb24gKCkge1xuXHRcdGxpdmVTa2V0Y2hlcy5mb3JFYWNoKGZ1bmN0aW9uIChza2V0Y2gpIHtcblx0XHRcdHNrZXRjaC5sb29wKCk7XG5cdFx0fSk7XG5cdH07XG5cblx0Y29uc3Qgc3RlcCA9IGZ1bmN0aW9uICgpIHtcblx0XHRsaXZlU2tldGNoZXMuZm9yRWFjaChmdW5jdGlvbiAoc2tldGNoKSB7XG5cdFx0XHRza2V0Y2gucmVkcmF3KCk7XG5cdFx0fSk7XG5cdH07XG5cblx0cmV0dXJuIHtcblx0XHRyZWNlaXZlU2VxdWVuY2U6IHJlY2VpdmVTZXF1ZW5jZSxcblx0XHRyZWNlaXZlTW9kdWxlOiByZWNlaXZlTW9kdWxlLFxuXHRcdGxpdmVTa2V0Y2hlczogbGl2ZVNrZXRjaGVzLFxuXHRcdHByZXBhcmVkU2VxdWVuY2VzOiBwcmVwYXJlZFNlcXVlbmNlcyxcblx0XHRwcmVwYXJlZFRvb2xzOiBwcmVwYXJlZFRvb2xzLFxuXHRcdG1vZHVsZXM6IG1vZHVsZXMsXG5cdFx0dmFsaWRPRUlTOiB2YWxpZE9FSVMsXG5cdFx0QnVpbHRJblNlcXM6IEJ1aWx0SW5TZXFzLFxuXHRcdG1ha2VKU09OOiBtYWtlSlNPTixcblx0XHRiZWdpbjogYmVnaW4sXG5cdFx0cGF1c2U6IHBhdXNlLFxuXHRcdHJlc3VtZTogcmVzdW1lLFxuXHRcdHN0ZXA6IHN0ZXAsXG5cdFx0Y2xlYXI6IGNsZWFyLFxuXHR9O1xufSgpO1xuXG5cblxuXG5jb25zdCBMb2dQYW5lbCA9IGZ1bmN0aW9uICgpIHtcblx0bG9nR3JlZW4gPSBmdW5jdGlvbiAobGluZSkge1xuXHRcdCQoXCIjaW5uZXJMb2dBcmVhXCIpLmFwcGVuZChgPHAgc3R5bGU9XCJjb2xvcjojMDBmZjAwXCI+JHtsaW5lfTwvcD48YnI+YCk7XG5cdH07XG5cdGxvZ1JlZCA9IGZ1bmN0aW9uIChsaW5lKSB7XG5cdFx0JChcIiNpbm5lckxvZ0FyZWFcIikuYXBwZW5kKGA8cCBzdHlsZT1cImNvbG9yOnJlZFwiPiR7bGluZX08L3A+PGJyPmApO1xuXHR9O1xuXHRjbGVhcmxvZyA9IGZ1bmN0aW9uICgpIHtcblx0XHQkKFwiI2lubmVyTG9nQXJlYVwiKS5lbXB0eSgpO1xuXHR9O1xuXHRoaWRlTG9nID0gZnVuY3Rpb24gKCkge1xuXHRcdCQoXCIjbG9nQXJlYVwiKS5jc3MoJ2Rpc3BsYXknLCAnbm9uZScpO1xuXHR9O1xuXHRzaG93TG9nID0gZnVuY3Rpb24gKCkge1xuXHRcdCQoXCIjbG9nQXJlYVwiKS5jc3MoJ2Rpc3BsYXknLCAnYmxvY2snKTtcblx0fTtcblx0cmV0dXJuIHtcblx0XHRsb2dHcmVlbjogbG9nR3JlZW4sXG5cdFx0bG9nUmVkOiBsb2dSZWQsXG5cdFx0Y2xlYXJsb2c6IGNsZWFybG9nLFxuXHRcdGhpZGVMb2c6IGhpZGVMb2csXG5cdFx0c2hvd0xvZzogc2hvd0xvZyxcblx0fTtcbn0oKTtcbndpbmRvdy5OU2NvcmUgPSBOU2NvcmU7XG53aW5kb3cuTG9nUGFuZWwgPSBMb2dQYW5lbDtcbiIsIlNFUVVFTkNFID0gcmVxdWlyZSgnLi9zZXF1ZW5jZXMvc2VxdWVuY2VzLmpzJyk7XG5WQUxJRE9FSVMgPSByZXF1aXJlKCcuL3ZhbGlkT0VJUy5qcycpO1xuTU9EVUxFUyA9IHJlcXVpcmUoJy4vbW9kdWxlcy9tb2R1bGVzLmpzJyk7XG5cblxuY29uc3QgVmFsaWRhdGlvbiA9IGZ1bmN0aW9uICgpIHtcblxuXG5cdGNvbnN0IGxpc3RFcnJvciA9IGZ1bmN0aW9uICh0aXRsZSkge1xuXHRcdGxldCBtc2cgPSBcImNhbid0IHBhcnNlIHRoZSBsaXN0LCBwbGVhc2UgcGFzcyBudW1iZXJzIHNlcGVyYXRlZCBieSBjb21tYXMgKGV4YW1wbGU6IDEsMiwzKVwiO1xuXHRcdGlmICh0aXRsZSAhPSB1bmRlZmluZWQpIHtcblx0XHRcdG1zZyA9IHRpdGxlICsgXCI6IFwiICsgbXNnO1xuXHRcdH1cblx0XHRyZXR1cm4gbXNnO1xuXHR9O1xuXG5cdGNvbnN0IHJlcXVpcmVkRXJyb3IgPSBmdW5jdGlvbiAodGl0bGUpIHtcblx0XHRyZXR1cm4gYCR7dGl0bGV9OiB0aGlzIGlzIGEgcmVxdWlyZWQgdmFsdWUsIGRvbid0IGxlYXZlIGl0IGVtcHR5IWA7XG5cdH07XG5cblx0Y29uc3QgdHlwZUVycm9yID0gZnVuY3Rpb24gKHRpdGxlLCB2YWx1ZSwgZXhwZWN0ZWRUeXBlKSB7XG5cdFx0cmV0dXJuIGAke3RpdGxlfTogJHt2YWx1ZX0gaXMgYSAke3R5cGVvZih2YWx1ZSl9LCBleHBlY3RlZCBhICR7ZXhwZWN0ZWRUeXBlfS4gYDtcblx0fTtcblxuXHRjb25zdCBvZWlzRXJyb3IgPSBmdW5jdGlvbiAoY29kZSkge1xuXHRcdHJldHVybiBgJHtjb2RlfTogRWl0aGVyIGFuIGludmFsaWQgT0VJUyBjb2RlIG9yIG5vdCBkZWZpbmVkIGJ5IHNhZ2UhYDtcblx0fTtcblxuXHRjb25zdCBidWlsdEluID0gZnVuY3Rpb24gKHNlcU9iaikge1xuXHRcdGxldCBzY2hlbWEgPSBTRVFVRU5DRS5CdWlsdEluU2Vxc1tzZXFPYmouaW5wdXRWYWx1ZV0ucGFyYW1zU2NoZW1hO1xuXHRcdGxldCByZWNlaXZlZFBhcmFtcyA9IHNlcU9iai5wYXJhbWV0ZXJzO1xuXG5cdFx0bGV0IHZhbGlkYXRpb25SZXN1bHQgPSB7XG5cdFx0XHRwYXJzZWRGaWVsZHM6IHt9LFxuXHRcdFx0ZXJyb3JzOiBbXVxuXHRcdH07XG5cdFx0T2JqZWN0LmtleXMocmVjZWl2ZWRQYXJhbXMpLmZvckVhY2goXG5cdFx0XHQocGFyYW1ldGVyKSA9PiB7XG5cdFx0XHRcdHZhbGlkYXRlRnJvbVNjaGVtYShzY2hlbWEsIHBhcmFtZXRlciwgcmVjZWl2ZWRQYXJhbXNbcGFyYW1ldGVyXSwgdmFsaWRhdGlvblJlc3VsdCk7XG5cdFx0XHR9XG5cdFx0KTtcblx0XHRyZXR1cm4gdmFsaWRhdGlvblJlc3VsdDtcblx0fTtcblxuXHRjb25zdCBvZWlzID0gZnVuY3Rpb24gKHNlcU9iaikge1xuXHRcdGxldCB2YWxpZGF0aW9uUmVzdWx0ID0ge1xuXHRcdFx0cGFyc2VkRmllbGRzOiB7fSxcblx0XHRcdGVycm9yczogW11cblx0XHR9O1xuXHRcdHNlcU9iai5pbnB1dFZhbHVlID0gc2VxT2JqLmlucHV0VmFsdWUudHJpbSgpO1xuXHRcdGxldCBvZWlzQ29kZSA9IHNlcU9iai5pbnB1dFZhbHVlO1xuXHRcdGlmICghVkFMSURPRUlTLmluY2x1ZGVzKG9laXNDb2RlKSkge1xuXHRcdFx0dmFsaWRhdGlvblJlc3VsdC5lcnJvcnMucHVzaChvZWlzRXJyb3Iob2Vpc0NvZGUpKTtcblx0XHR9XG5cdFx0cmV0dXJuIHZhbGlkYXRpb25SZXN1bHQ7XG5cdH07XG5cblx0Y29uc3QgbGlzdCA9IGZ1bmN0aW9uIChzZXFPYmopIHtcblx0XHRsZXQgdmFsaWRhdGlvblJlc3VsdCA9IHtcblx0XHRcdHBhcnNlZEZpZWxkczoge30sXG5cdFx0XHRlcnJvcnM6IFtdXG5cdFx0fTtcblx0XHR0cnkge1xuXHRcdFx0aWYgKHR5cGVvZiBzZXFPYmouaW5wdXRWYWx1ZSA9PSBTdHJpbmcpIHNlcU9iai5pbnB1dFZhbHVlID0gSlNPTi5wYXJzZShzZXFPYmouaW5wdXRWYWx1ZSk7XG5cdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHR2YWxpZGF0aW9uUmVzdWx0LmVycm9ycy5wdXNoKGxpc3RFcnJvcigpKTtcblx0XHR9XG5cdFx0cmV0dXJuIHZhbGlkYXRpb25SZXN1bHQ7XG5cdH07XG5cblx0Y29uc3QgX21vZHVsZSA9IGZ1bmN0aW9uIChtb2R1bGVPYmopIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImhlcmVcIik7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cobW9kdWxlT2JqLm1vZHVsZUtleSk7XG5cdFx0bGV0IHNjaGVtYSA9IE1PRFVMRVNbbW9kdWxlT2JqLm1vZHVsZUtleV0uY29uZmlnU2NoZW1hO1xuXHRcdGxldCByZWNlaXZlZENvbmZpZyA9IG1vZHVsZU9iai5jb25maWc7XG5cblx0XHRsZXQgdmFsaWRhdGlvblJlc3VsdCA9IHtcblx0XHRcdHBhcnNlZEZpZWxkczoge30sXG5cdFx0XHRlcnJvcnM6IFtdXG5cdFx0fTtcblxuXHRcdE9iamVjdC5rZXlzKHJlY2VpdmVkQ29uZmlnKS5mb3JFYWNoKFxuXHRcdFx0KGNvbmZpZ0ZpZWxkKSA9PiB7XG5cdFx0XHRcdHZhbGlkYXRlRnJvbVNjaGVtYShzY2hlbWEsIGNvbmZpZ0ZpZWxkLCByZWNlaXZlZENvbmZpZ1tjb25maWdGaWVsZF0sIHZhbGlkYXRpb25SZXN1bHQpO1xuXHRcdFx0fVxuXHRcdCk7XG5cdFx0cmV0dXJuIHZhbGlkYXRpb25SZXN1bHQ7XG5cdH07XG5cblx0Y29uc3QgdmFsaWRhdGVGcm9tU2NoZW1hID0gZnVuY3Rpb24gKHNjaGVtYSwgZmllbGQsIHZhbHVlLCB2YWxpZGF0aW9uUmVzdWx0KSB7XG5cdFx0bGV0IHRpdGxlID0gc2NoZW1hW2ZpZWxkXS50aXRsZTtcblx0XHRpZiAodHlwZW9mICh2YWx1ZSkgPT0gXCJzdHJpbmdcIikge1xuXHRcdFx0dmFsdWUgPSB2YWx1ZS50cmltKCk7XG5cdFx0fVxuXHRcdGxldCBleHBlY3RlZFR5cGUgPSBzY2hlbWFbZmllbGRdLnR5cGU7XG5cdFx0bGV0IHJlcXVpcmVkID0gKHNjaGVtYVtmaWVsZF0ucmVxdWlyZWQgIT09IHVuZGVmaW5lZCkgPyBzY2hlbWFbZmllbGRdLnJlcXVpcmVkIDogZmFsc2U7XG5cdFx0bGV0IGZvcm1hdCA9IChzY2hlbWFbZmllbGRdLmZvcm1hdCAhPT0gdW5kZWZpbmVkKSA/IHNjaGVtYVtmaWVsZF0uZm9ybWF0IDogZmFsc2U7XG5cdFx0bGV0IGlzRW1wdHkgPSAodmFsdWUgPT09ICcnKTtcblx0XHRpZiAocmVxdWlyZWQgJiYgaXNFbXB0eSkge1xuXHRcdFx0dmFsaWRhdGlvblJlc3VsdC5lcnJvcnMucHVzaChyZXF1aXJlZEVycm9yKHRpdGxlKSk7XG5cdFx0fVxuXHRcdGlmIChpc0VtcHR5KSB7XG5cdFx0XHRwYXJzZWQgPSAnJztcblx0XHR9XG5cdFx0aWYgKCFpc0VtcHR5ICYmIChleHBlY3RlZFR5cGUgPT0gXCJudW1iZXJcIikpIHtcblx0XHRcdHBhcnNlZCA9IHBhcnNlSW50KHZhbHVlKTtcblx0XHRcdGlmIChwYXJzZWQgIT0gcGFyc2VkKSB7IC8vIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzM0MjYxOTM4L3doYXQtaXMtdGhlLWRpZmZlcmVuY2UtYmV0d2Vlbi1uYW4tbmFuLWFuZC1uYW4tbmFuXG5cdFx0XHRcdHZhbGlkYXRpb25SZXN1bHQuZXJyb3JzLnB1c2godHlwZUVycm9yKHRpdGxlLCB2YWx1ZSwgZXhwZWN0ZWRUeXBlKSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmICghaXNFbXB0eSAmJiAoZXhwZWN0ZWRUeXBlID09IFwic3RyaW5nXCIpKSB7XG5cdFx0XHRwYXJzZWQgPSB2YWx1ZTtcblx0XHR9XG5cdFx0aWYgKCFpc0VtcHR5ICYmIChleHBlY3RlZFR5cGUgPT0gXCJib29sZWFuXCIpKSB7XG5cdFx0XHRpZiAodmFsdWUgPT0gJzEnKSB7XG5cdFx0XHRcdHBhcnNlZCA9IHRydWU7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRwYXJzZWQgPSBmYWxzZTtcblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKGZvcm1hdCAmJiAoZm9ybWF0ID09IFwibGlzdFwiKSkge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0cGFyc2VkID0gSlNPTi5wYXJzZShcIltcIiArIHZhbHVlICsgXCJdXCIpO1xuXHRcdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRcdHZhbGlkYXRpb25SZXN1bHQuZXJyb3JzLnB1c2gobGlzdEVycm9yKHRpdGxlKSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmIChwYXJzZWQgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0dmFsaWRhdGlvblJlc3VsdC5wYXJzZWRGaWVsZHNbZmllbGRdID0gcGFyc2VkO1xuXHRcdH1cblx0fTtcblxuXHRyZXR1cm4ge1xuXHRcdGJ1aWx0SW46IGJ1aWx0SW4sXG5cdFx0b2Vpczogb2Vpcyxcblx0XHRsaXN0OiBsaXN0LFxuXHRcdG1vZHVsZTogX21vZHVsZVxuXHR9O1xufSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZhbGlkYXRpb247XG4iLCIvKlxuICAgIHZhciBsaXN0PVsyLCAzLCA1LCA3LCAxMSwgMTMsIDE3LCAxOSwgMjMsIDI5LCAzMSwgMzcsIDQxLCA0MywgNDcsIDUzLCA1OSwgNjEsIDY3LCA3MSwgNzMsIDc5LCA4MywgODksIDk3LCAxMDEsIDEwMywgMTA3LCAxMDksIDExMywgMTI3LCAxMzEsIDEzNywgMTM5LCAxNDksIDE1MSwgMTU3LCAxNjMsIDE2NywgMTczLCAxNzksIDE4MSwgMTkxLCAxOTMsIDE5NywgMTk5LCAyMTEsIDIyMywgMjI3LCAyMjksIDIzMywgMjM5LCAyNDEsIDI1MSwgMjU3LCAyNjMsIDI2OSwgMjcxLCAyNzcsIDI4MSwgMjgzLCAyOTMsIDMwNywgMzExLCAzMTMsIDMxNywgMzMxLCAzMzcsIDM0NywgMzQ5LCAzNTMsIDM1OSwgMzY3LCAzNzMsIDM3OSwgMzgzLCAzODksIDM5NywgNDAxLCA0MDksIDQxOSwgNDIxLCA0MzEsIDQzMywgNDM5LCA0NDMsIDQ0OSwgNDU3LCA0NjEsIDQ2MywgNDY3LCA0NzksIDQ4NywgNDkxLCA0OTksIDUwMywgNTA5LCA1MjEsIDUyMywgNTQxLCA1NDcsIDU1NywgNTYzLCA1NjksIDU3MSwgNTc3LCA1ODcsIDU5MywgNTk5LCA2MDEsIDYwNywgNjEzLCA2MTcsIDYxOSwgNjMxLCA2NDEsIDY0MywgNjQ3LCA2NTMsIDY1OSwgNjYxLCA2NzMsIDY3NywgNjgzLCA2OTEsIDcwMSwgNzA5LCA3MTksIDcyNywgNzMzLCA3MzksIDc0MywgNzUxLCA3NTcsIDc2MSwgNzY5LCA3NzMsIDc4NywgNzk3LCA4MDksIDgxMSwgODIxLCA4MjMsIDgyNywgODI5LCA4MzksIDg1MywgODU3LCA4NTksIDg2MywgODc3LCA4ODEsIDg4MywgODg3LCA5MDcsIDkxMSwgOTE5LCA5MjksIDkzNywgOTQxLCA5NDcsIDk1MywgOTY3LCA5NzEsIDk3NywgOTgzLCA5OTEsIDk5NywgMTAwOSwgMTAxMywgMTAxOSwgMTAyMSwgMTAzMSwgMTAzMywgMTAzOSwgMTA0OSwgMTA1MSwgMTA2MSwgMTA2MywgMTA2OSwgMTA4NywgMTA5MSwgMTA5MywgMTA5NywgMTEwMywgMTEwOSwgMTExNywgMTEyMywgMTEyOSwgMTE1MSwgMTE1MywgMTE2MywgMTE3MSwgMTE4MSwgMTE4NywgMTE5MywgMTIwMSwgMTIxMywgMTIxNywgMTIyM107XG5cbiovXG5cbmNsYXNzIFZJWl9EaWZmZXJlbmNlcyB7XG5cdGNvbnN0cnVjdG9yKHNlcSwgc2tldGNoLCBjb25maWcpIHtcblxuXHRcdHRoaXMubiA9IGNvbmZpZy5uOyAvL24gaXMgbnVtYmVyIG9mIHRlcm1zIG9mIHRvcCBzZXF1ZW5jZVxuXHRcdHRoaXMubGV2ZWxzID0gY29uZmlnLkxldmVsczsgLy9sZXZlbHMgaXMgbnVtYmVyIG9mIGxheWVycyBvZiB0aGUgcHlyYW1pZC90cmFwZXpvaWQgY3JlYXRlZCBieSB3cml0aW5nIHRoZSBkaWZmZXJlbmNlcy5cblx0XHR0aGlzLnNlcSA9IHNlcTtcblx0XHR0aGlzLnNrZXRjaCA9IHNrZXRjaDtcblx0fVxuXG5cdGRyYXdEaWZmZXJlbmNlcyhuLCBsZXZlbHMsIHNlcXVlbmNlKSB7XG5cblx0XHQvL2NoYW5nZWQgYmFja2dyb3VuZCBjb2xvciB0byBncmV5IHNpbmNlIHlvdSBjYW4ndCBzZWUgd2hhdCdzIGdvaW5nIG9uXG5cdFx0dGhpcy5za2V0Y2guYmFja2dyb3VuZCgnYmxhY2snKTtcblxuXHRcdG4gPSBNYXRoLm1pbihuLCBzZXF1ZW5jZS5sZW5ndGgpO1xuXHRcdGxldmVscyA9IE1hdGgubWluKGxldmVscywgbiAtIDEpO1xuXHRcdGxldCBmb250LCBmb250U2l6ZSA9IDIwO1xuXHRcdHRoaXMuc2tldGNoLnRleHRGb250KFwiQXJpYWxcIik7XG5cdFx0dGhpcy5za2V0Y2gudGV4dFNpemUoZm9udFNpemUpO1xuXHRcdHRoaXMuc2tldGNoLnRleHRTdHlsZSh0aGlzLnNrZXRjaC5CT0xEKTtcblx0XHRsZXQgeERlbHRhID0gNTA7XG5cdFx0bGV0IHlEZWx0YSA9IDUwO1xuXHRcdGxldCBmaXJzdFggPSAzMDtcblx0XHRsZXQgZmlyc3RZID0gMzA7XG5cdFx0dGhpcy5za2V0Y2guY29sb3JNb2RlKHRoaXMuc2tldGNoLkhTQiwgMjU1KTtcblx0XHRsZXQgbXlDb2xvciA9IHRoaXMuc2tldGNoLmNvbG9yKDEwMCwgMjU1LCAxNTApO1xuXHRcdGxldCBodWU7XG5cblx0XHRsZXQgd29ya2luZ1NlcXVlbmNlID0gW107XG5cblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XG5cdFx0XHR3b3JraW5nU2VxdWVuY2UucHVzaChzZXF1ZW5jZS5nZXRFbGVtZW50KGkpKTsgLy93b3JraW5nU2VxdWVuY2UgY2FubmliYWxpemVzIGZpcnN0IG4gZWxlbWVudHMgb2Ygc2VxdWVuY2UuXG5cdFx0fVxuXG5cblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubGV2ZWxzOyBpKyspIHtcblx0XHRcdGh1ZSA9IChpICogMjU1IC8gNikgJSAyNTU7XG5cdFx0XHRteUNvbG9yID0gdGhpcy5za2V0Y2guY29sb3IoaHVlLCAxNTAsIDIwMCk7XG5cdFx0XHR0aGlzLnNrZXRjaC5maWxsKG15Q29sb3IpO1xuXHRcdFx0Zm9yIChsZXQgaiA9IDA7IGogPCB3b3JraW5nU2VxdWVuY2UubGVuZ3RoOyBqKyspIHtcblx0XHRcdFx0dGhpcy5za2V0Y2gudGV4dCh3b3JraW5nU2VxdWVuY2Vbal0sIGZpcnN0WCArIGogKiB4RGVsdGEsIGZpcnN0WSArIGkgKiB5RGVsdGEpOyAvL0RyYXdzIGFuZCB1cGRhdGVzIHdvcmtpbmdTZXF1ZW5jZSBzaW11bHRhbmVvdXNseS5cblx0XHRcdFx0aWYgKGogPCB3b3JraW5nU2VxdWVuY2UubGVuZ3RoIC0gMSkge1xuXHRcdFx0XHRcdHdvcmtpbmdTZXF1ZW5jZVtqXSA9IHdvcmtpbmdTZXF1ZW5jZVtqICsgMV0gLSB3b3JraW5nU2VxdWVuY2Vbal07XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0d29ya2luZ1NlcXVlbmNlLmxlbmd0aCA9IHdvcmtpbmdTZXF1ZW5jZS5sZW5ndGggLSAxOyAvL1JlbW92ZXMgbGFzdCBlbGVtZW50LlxuXHRcdFx0Zmlyc3RYID0gZmlyc3RYICsgKDEgLyAyKSAqIHhEZWx0YTsgLy9Nb3ZlcyBsaW5lIGZvcndhcmQgaGFsZiBmb3IgcHlyYW1pZCBzaGFwZS5cblxuXHRcdH1cblxuXHR9XG5cdHNldHVwKCkge31cblx0ZHJhdygpIHtcblx0XHR0aGlzLmRyYXdEaWZmZXJlbmNlcyh0aGlzLm4sIHRoaXMubGV2ZWxzLCB0aGlzLnNlcSk7XG5cdFx0dGhpcy5za2V0Y2gubm9Mb29wKCk7XG5cdH1cbn1cblxuXG5cbmNvbnN0IFNDSEVNQV9EaWZmZXJlbmNlcyA9IHtcblx0bjoge1xuXHRcdHR5cGU6ICdudW1iZXInLFxuXHRcdHRpdGxlOiAnTicsXG5cdFx0ZGVzY3JpcHRpb246ICdOdW1iZXIgb2YgZWxlbWVudHMnLFxuXHRcdHJlcXVpcmVkOiB0cnVlXG5cdH0sXG5cdExldmVsczoge1xuXHRcdHR5cGU6ICdudW1iZXInLFxuXHRcdHRpdGxlOiAnTGV2ZWxzJyxcblx0XHRkZXNjcmlwdGlvbjogJ051bWJlciBvZiBsZXZlbHMnLFxuXHRcdHJlcXVpcmVkOiB0cnVlXG5cdH0sXG59O1xuXG5jb25zdCBNT0RVTEVfRGlmZmVyZW5jZXMgPSB7XG5cdHZpejogVklaX0RpZmZlcmVuY2VzLFxuXHRuYW1lOiBcIkRpZmZlcmVuY2VzXCIsXG5cdGRlc2NyaXB0aW9uOiBcIlwiLFxuXHRjb25maWdTY2hlbWE6IFNDSEVNQV9EaWZmZXJlbmNlc1xufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IE1PRFVMRV9EaWZmZXJlbmNlcztcbiIsIlxuXG5cblxuZnVuY3Rpb24gY29uc3RyYWluKHZhbCwgbWluX3ZhbCwgbWF4X3ZhbCkge1xuICAgICAgICByZXR1cm4gTWF0aC5taW4obWF4X3ZhbCwgTWF0aC5tYXgobWluX3ZhbCwgdmFsKSk7XG59XG5cbmZ1bmN0aW9uIGRlZ3JlZXNfdG9fcmFkaWFucyhkZWdyZWVzKSB7XG4gIHZhciBwaSA9IE1hdGguUEk7XG4gIHJldHVybiBkZWdyZWVzICogKHBpLzE4MCk7XG59XG5cbmNsYXNzIExpbmUge1xuICAgICAgICBjb25zdHJ1Y3Rvcih4MCwgeDEsIHkwLCB5MSkge1xuICAgICAgICAgIHRoaXMueDAgPSB4MDtcbiAgICAgICAgICB0aGlzLngxID0geDE7XG4gICAgICAgICAgdGhpcy55MCA9IHkwO1xuICAgICAgICAgIHRoaXMueTEgPSB5MTtcbiAgICAgICAgfVxuXG4gICAgICAgIGRyYXcoc2tldGNoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHgwXyA9IGNvbnN0cmFpbihNYXRoLnJvdW5kKHRoaXMueDApLCAwLCBza2V0Y2gud2lkdGggLSAxKTtcbiAgICAgICAgICAgICAgICB2YXIgeDFfID0gY29uc3RyYWluKE1hdGgucm91bmQodGhpcy54MSksIDAsIHNrZXRjaC53aWR0aCAtIDEpO1xuICAgICAgICAgICAgICAgIHZhciB5MF8gPSBjb25zdHJhaW4oTWF0aC5yb3VuZCh0aGlzLnkwKSwgMCwgc2tldGNoLmhlaWdodCAtIDEpO1xuICAgICAgICAgICAgICAgIHZhciB5MV8gPSBjb25zdHJhaW4oTWF0aC5yb3VuZCh0aGlzLnkxKSwgMCwgc2tldGNoLmhlaWdodCAtIDEpO1xuICAgICAgICAgICAgICAgIHNrZXRjaC5saW5lKHgwXywgeTBfLCB4MV8sIHkxXylcbiAgICAgICAgfVxufVxuXG5cblxuY2xhc3MgVklaX0ZyYWN0YWxNYXAge1xuICAgIGNvbnN0cnVjdG9yKHNlcSwgc2tldGNoLCBjb25maWcpe1xuICAgICAgICB0aGlzLnNlcSA9IHNlcVxuICAgICAgICB0aGlzLnNrZXRjaCA9IHNrZXRjaFxuICAgICAgICB0aGlzLml0dGVycyA9IDE0O1xuICAgIH1cbiAgICBzZXR1cCgpe1xuICAgICAgICB0aGlzLmxpbmVzID0gW11cbiAgICAgICAgdGhpcy5vcmlnaW5feSA9IHRoaXMuc2tldGNoLmhlaWdodCAvIDI7XG4gICAgICAgIHRoaXMub3JpZ2luX3ggPSB0aGlzLnNrZXRjaC53aWR0aCAvIDI7XG4gICAgfVxuICAgICAgICBcbiAgICBkcmF3X25leHQoeDAsIHgxLCB5MCwgeTEsIG51bSwgZnJhY18xLCBmcmFjXzIsIGFuZ2xlXzEsIGFuZ2xlXzIsIHNlcXVlbmNlKXtcbiAgICAgICAgbnVtID0gbnVtIC0gMTtcbiAgICAgICAgaWYobnVtIDw9IDApIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBCZXN0IHRvIHN3aXRjaCB0byBhIG51bWVyaWNhbCBsaWJyYXJ5XG4gICAgICAgIGxldCBBID0gW3gxIC0geDAsIHkxIC0geTBdO1xuICAgICAgICAvLyB2YXIgbWFnID0gTWF0aC5zcXJ0KEFbMF0gKiBBWzBdICsgQVsxXSAqIEFbMV0pO1xuICAgICAgICAvLyBBWzBdID0gQVswXSAvIG1hZztcbiAgICAgICAgLy8gQVsxXSA9IEFbMV0gLyBtYWc7XG4gICAgICAgIC8vXG5cblxuICAgICAgICAvLyBUd28gcm90YXRpb24gbWF0cmljZXMgZm9yIGxlZnQgXG4gICAgICAgIC8vIGFuZCByaWdodCBicmFuY2hlcyByZXNwZWN0aXZlbHlcbiAgICAgICAgbGV0IFIxID0gW1tNYXRoLmNvcyhhbmdsZV8xKSwgLU1hdGguc2luKGFuZ2xlXzEpXSwgW01hdGguc2luKGFuZ2xlXzEpLCBNYXRoLmNvcyhhbmdsZV8xKV1dO1xuICAgICAgICBsZXQgUjIgPSBbW01hdGguY29zKC1hbmdsZV8yKSwgLU1hdGguc2luKC1hbmdsZV8yKV0sIFtNYXRoLnNpbigtYW5nbGVfMiksIE1hdGguY29zKC1hbmdsZV8yKV1dO1xuXG4gICAgICAgIHRoaXMubGluZXMucHVzaChuZXcgTGluZSh4MCwgeDEsIHkwLCB5MSkpO1xuICAgICAgICBcbiAgICAgICAgbGV0IHJpZ2h0ID0gWzAsIDBdO1xuICAgICAgICBsZXQgbGVmdCA9IFswLCAwXTtcbiAgICAgICAgXG4gICAgICAgIC8vIG1hbnVhbCBtYXRyaXggbXVsdGlwbGljYXRpb25cbiAgICAgICAgcmlnaHRbMF0gPSB4MSArIGZyYWNfMSAqIChSMVswXVswXSAqIEFbMF0gKyBSMVswXVsxXSAqIEFbMV0pO1xuICAgICAgICByaWdodFsxXSA9IHkxICsgZnJhY18xICogKFIxWzFdWzBdICogQVswXSArIFIxWzFdWzFdICogQVsxXSk7XG4gICAgICAgIGxlZnRbMF0gPSB4MSArIGZyYWNfMiAqIChSMlswXVswXSAqIEFbMF0gKyBSMlswXVsxXSAqIEFbMV0pO1xuICAgICAgICBsZWZ0WzFdID0geTEgKyBmcmFjXzIgKiAoUjJbMV1bMF0gKiBBWzBdICsgUjJbMV1bMV0gKiBBWzFdKTtcblxuICAgICAgICBcbiAgICAgICAgLy8gZnJhY18xID0gc2VxdWVuY2UuZ2V0RWxlbWVudCh0aGlzLml0dGVycyAtIG51bSkgLyBzZXF1ZW5jZS5nZXRFbGVtZW50KHRoaXMuaXR0ZXJzIC0gbnVtICsgMSk7XG4gICAgICAgIC8vIGZyYWNfMiA9IHNlcXVlbmNlLmdldEVsZW1lbnQodGhpcy5pdHRlcnMgLSBudW0pIC8gc2VxdWVuY2UuZ2V0RWxlbWVudCh0aGlzLml0dGVycyAtIG51bSArIDEpO1xuXG4gICAgICAgIGFuZ2xlXzEgKz0gc2VxdWVuY2UuZ2V0RWxlbWVudCh0aGlzLml0dGVycyAtIG51bSk7XG4gICAgICAgIGFuZ2xlXzIgKz0gc2VxdWVuY2UuZ2V0RWxlbWVudCh0aGlzLml0dGVycyAtIG51bSk7XG5cbiAgICAgICAgLy8gUmVjdXJzaXZlIHN0ZXBcbiAgICAgICAgdGhpcy5kcmF3X25leHQoeDEsIHJpZ2h0WzBdLCB5MSwgcmlnaHRbMV0sIG51bSwgZnJhY18xLCBmcmFjXzIsIGFuZ2xlXzEsIGFuZ2xlXzIsIHNlcXVlbmNlKTtcbiAgICAgICAgdGhpcy5kcmF3X25leHQoeDEsIGxlZnRbMF0sIHkxLCBsZWZ0WzFdLCBudW0sIGZyYWNfMSwgZnJhY18yLCBhbmdsZV8xLCBhbmdsZV8yLCBzZXF1ZW5jZSk7XG4gICAgfVxuXG4gICAgZHJhdygpe1xuICAgICAgICB2YXIgYW5nbGVfMSA9IGRlZ3JlZXNfdG9fcmFkaWFucyg5MCk7XG4gICAgICAgIHZhciBhbmdsZV8yID0gZGVncmVlc190b19yYWRpYW5zKDkwKTtcbiAgICAgICAgdmFyIGZyYWNfMSA9IDAuNjtcbiAgICAgICAgdmFyIGZyYWNfMiA9IDAuNjtcblxuICAgICAgICB0aGlzLmRyYXdfbmV4dCh0aGlzLnNrZXRjaC53aWR0aCAvIDIgLSAxLCB0aGlzLm9yaWdpbl94IC0gMSwgdGhpcy5za2V0Y2guaGVpZ2h0IC0gMSwgdGhpcy5vcmlnaW5feSAtIDEsIHRoaXMuaXR0ZXJzLCBmcmFjXzEsIGZyYWNfMiwgYW5nbGVfMSwgYW5nbGVfMiwgdGhpcy5zZXEpO1xuXG4gICAgICAgIGZvcihsZXQgaSA9IDA7IGkgPCB0aGlzLmxpbmVzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5saW5lc1tpXS5kcmF3KHRoaXMuc2tldGNoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc2tldGNoLm5vTG9vcCgpO1xuICAgIH1cbn1cblxuY29uc3QgU0NIRU1BX0ZyYWN0YWxNYXAgPSB7XG4gICAgICAgIG46IHtcbiAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICB0aXRsZTogJ04nLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTnVtYmVyIG9mIGVsZW1lbnRzJyxcbiAgICAgICAgICAgICAgICByZXF1aXJlZDogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICBMZXZlbHM6IHtcbiAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICB0aXRsZTogJ0xldmVscycsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdOdW1iZXIgb2YgbGV2ZWxzJyxcbiAgICAgICAgICAgICAgICByZXF1aXJlZDogdHJ1ZVxuICAgICAgICB9LFxufTtcblxuY29uc3QgTU9EVUxFX0ZyYWN0YWxNYXAgPSB7XG4gICAgdml6OiBWSVpfRnJhY3RhbE1hcCxcbiAgICBuYW1lOiAnRnJhY3RhbE1hcCcsXG4gICAgZGVzY3JpcHRpb246ICcnLFxuICAgIGNvbmZpZ1NjaGVtYTogU0NIRU1BX0ZyYWN0YWxNYXBcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTU9EVUxFX0ZyYWN0YWxNYXBcbiAgICBcbiIsIi8vQW4gZXhhbXBsZSBtb2R1bGVcblxuXG5jbGFzcyBWSVpfTW9kRmlsbCB7XG5cdGNvbnN0cnVjdG9yKHNlcSwgc2tldGNoLCBjb25maWcpIHtcblx0XHR0aGlzLnNrZXRjaCA9IHNrZXRjaDtcblx0XHR0aGlzLnNlcSA9IHNlcTtcblx0XHR0aGlzLm1vZERpbWVuc2lvbiA9IGNvbmZpZy5tb2REaW1lbnNpb247XG5cdFx0dGhpcy5pID0gMDtcblx0fVxuXG5cdGRyYXdOZXcobnVtLCBzZXEpIHtcblx0XHRsZXQgYmxhY2sgPSB0aGlzLnNrZXRjaC5jb2xvcigwKTtcblx0XHR0aGlzLnNrZXRjaC5maWxsKGJsYWNrKTtcblx0XHRsZXQgaTtcblx0XHRsZXQgajtcblx0XHRmb3IgKGxldCBtb2QgPSAxOyBtb2QgPD0gdGhpcy5tb2REaW1lbnNpb247IG1vZCsrKSB7XG5cdFx0XHRpID0gc2VxLmdldEVsZW1lbnQobnVtKSAlIG1vZDtcblx0XHRcdGogPSBtb2QgLSAxO1xuXHRcdFx0dGhpcy5za2V0Y2gucmVjdChqICogdGhpcy5yZWN0V2lkdGgsIHRoaXMuc2tldGNoLmhlaWdodCAtIChpICsgMSkgKiB0aGlzLnJlY3RIZWlnaHQsIHRoaXMucmVjdFdpZHRoLCB0aGlzLnJlY3RIZWlnaHQpO1xuXHRcdH1cblxuXHR9XG5cblx0c2V0dXAoKSB7XG5cdFx0dGhpcy5yZWN0V2lkdGggPSB0aGlzLnNrZXRjaC53aWR0aCAvIHRoaXMubW9kRGltZW5zaW9uO1xuXHRcdHRoaXMucmVjdEhlaWdodCA9IHRoaXMuc2tldGNoLmhlaWdodCAvIHRoaXMubW9kRGltZW5zaW9uO1xuXHRcdHRoaXMuc2tldGNoLm5vU3Ryb2tlKCk7XG5cdH1cblxuXHRkcmF3KCkge1xuXHRcdHRoaXMuZHJhd05ldyh0aGlzLmksIHRoaXMuc2VxKTtcblx0XHR0aGlzLmkrKztcblx0XHRpZiAoaSA9PSAxMDAwKSB7XG5cdFx0XHR0aGlzLnNrZXRjaC5ub0xvb3AoKTtcblx0XHR9XG5cdH1cblxufVxuXG5jb25zdCBTQ0hFTUFfTW9kRmlsbCA9IHtcblx0bW9kRGltZW5zaW9uOiB7XG5cdFx0dHlwZTogXCJudW1iZXJcIixcblx0XHR0aXRsZTogXCJNb2QgZGltZW5zaW9uXCIsXG5cdFx0ZGVzY3JpcHRpb246IFwiXCIsXG5cdFx0cmVxdWlyZWQ6IHRydWVcblx0fVxufTtcblxuXG5jb25zdCBNT0RVTEVfTW9kRmlsbCA9IHtcblx0dml6OiBWSVpfTW9kRmlsbCxcblx0bmFtZTogXCJNb2QgRmlsbFwiLFxuXHRkZXNjcmlwdGlvbjogXCJcIixcblx0Y29uZmlnU2NoZW1hOiBTQ0hFTUFfTW9kRmlsbFxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNT0RVTEVfTW9kRmlsbDsiLCJjbGFzcyBWSVpfc2hpZnRDb21wYXJlIHtcblx0Y29uc3RydWN0b3Ioc2VxLCBza2V0Y2gsIGNvbmZpZykge1xuXHRcdC8vU2tldGNoIGlzIHlvdXIgY2FudmFzXG5cdFx0Ly9jb25maWcgaXMgdGhlIHBhcmFtZXRlcnMgeW91IGV4cGVjdFxuXHRcdC8vc2VxIGlzIHRoZSBzZXF1ZW5jZSB5b3UgYXJlIGRyYXdpbmdcblx0XHR0aGlzLnNrZXRjaCA9IHNrZXRjaDtcblx0XHR0aGlzLnNlcSA9IHNlcTtcblx0XHR0aGlzLk1PRCA9IDI7XG5cdFx0Ly8gU2V0IHVwIHRoZSBpbWFnZSBvbmNlLlxuXHR9XG5cblxuXHRzZXR1cCgpIHtcblx0XHRjb25zb2xlLmxvZyh0aGlzLnNrZXRjaC5oZWlnaHQsIHRoaXMuc2tldGNoLndpZHRoKTtcblx0XHR0aGlzLmltZyA9IHRoaXMuc2tldGNoLmNyZWF0ZUltYWdlKHRoaXMuc2tldGNoLndpZHRoLCB0aGlzLnNrZXRjaC5oZWlnaHQpO1xuXHRcdHRoaXMuaW1nLmxvYWRQaXhlbHMoKTsgLy8gRW5hYmxlcyBwaXhlbC1sZXZlbCBlZGl0aW5nLlxuXHR9XG5cblx0Y2xpcChhLCBtaW4sIG1heCkge1xuXHRcdGlmIChhIDwgbWluKSB7XG5cdFx0XHRyZXR1cm4gbWluO1xuXHRcdH0gZWxzZSBpZiAoYSA+IG1heCkge1xuXHRcdFx0cmV0dXJuIG1heDtcblx0XHR9XG5cdFx0cmV0dXJuIGE7XG5cdH1cblxuXG5cdGRyYXcoKSB7IC8vVGhpcyB3aWxsIGJlIGNhbGxlZCBldmVyeXRpbWUgdG8gZHJhd1xuXHRcdC8vIEVuc3VyZSBtb3VzZSBjb29yZGluYXRlcyBhcmUgc2FuZS5cblx0XHQvLyBNb3VzZSBjb29yZGluYXRlcyBsb29rIHRoZXkncmUgZmxvYXRzIGJ5IGRlZmF1bHQuXG5cblx0XHRsZXQgZCA9IHRoaXMuc2tldGNoLnBpeGVsRGVuc2l0eSgpO1xuXHRcdGxldCBteCA9IHRoaXMuY2xpcChNYXRoLnJvdW5kKHRoaXMuc2tldGNoLm1vdXNlWCksIDAsIHRoaXMuc2tldGNoLndpZHRoKTtcblx0XHRsZXQgbXkgPSB0aGlzLmNsaXAoTWF0aC5yb3VuZCh0aGlzLnNrZXRjaC5tb3VzZVkpLCAwLCB0aGlzLnNrZXRjaC5oZWlnaHQpO1xuXHRcdGlmICh0aGlzLnNrZXRjaC5rZXkgPT0gJ0Fycm93VXAnKSB7XG5cdFx0XHR0aGlzLk1PRCArPSAxO1xuXHRcdFx0dGhpcy5za2V0Y2gua2V5ID0gbnVsbDtcblx0XHRcdGNvbnNvbGUubG9nKFwiVVAgUFJFU1NFRCwgTkVXIE1PRDogXCIgKyB0aGlzLk1PRCk7XG5cdFx0fSBlbHNlIGlmICh0aGlzLnNrZXRjaC5rZXkgPT0gJ0Fycm93RG93bicpIHtcblx0XHRcdHRoaXMuTU9EIC09IDE7XG5cdFx0XHR0aGlzLnNrZXRjaC5rZXkgPSBudWxsO1xuXHRcdFx0Y29uc29sZS5sb2coXCJET1dOIFBSRVNTRUQsIE5FVyBNT0Q6IFwiICsgdGhpcy5NT0QpO1xuXHRcdH0gZWxzZSBpZiAodGhpcy5za2V0Y2gua2V5ID09ICdBcnJvd1JpZ2h0Jykge1xuXHRcdFx0Y29uc29sZS5sb2coY29uc29sZS5sb2coXCJNWDogXCIgKyBteCArIFwiIE1ZOiBcIiArIG15KSk7XG5cdFx0fVxuXHRcdC8vIFdyaXRlIHRvIGltYWdlLCB0aGVuIHRvIHNjcmVlbiBmb3Igc3BlZWQuXG5cdFx0Zm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLnNrZXRjaC53aWR0aDsgeCsrKSB7XG5cdFx0XHRmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuc2tldGNoLmhlaWdodDsgeSsrKSB7XG5cdFx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgZDsgaSsrKSB7XG5cdFx0XHRcdFx0Zm9yIChsZXQgaiA9IDA7IGogPCBkOyBqKyspIHtcblx0XHRcdFx0XHRcdGxldCBpbmRleCA9IDQgKiAoKHkgKiBkICsgaikgKiB0aGlzLnNrZXRjaC53aWR0aCAqIGQgKyAoeCAqIGQgKyBpKSk7XG5cdFx0XHRcdFx0XHRpZiAodGhpcy5zZXEuZ2V0RWxlbWVudCh4KSAlICh0aGlzLk1PRCkgPT0gdGhpcy5zZXEuZ2V0RWxlbWVudCh5KSAlICh0aGlzLk1PRCkpIHtcblx0XHRcdFx0XHRcdFx0dGhpcy5pbWcucGl4ZWxzW2luZGV4XSA9IDI1NTtcblx0XHRcdFx0XHRcdFx0dGhpcy5pbWcucGl4ZWxzW2luZGV4ICsgMV0gPSAyNTU7XG5cdFx0XHRcdFx0XHRcdHRoaXMuaW1nLnBpeGVsc1tpbmRleCArIDJdID0gMjU1O1xuXHRcdFx0XHRcdFx0XHR0aGlzLmltZy5waXhlbHNbaW5kZXggKyAzXSA9IDI1NTtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdHRoaXMuaW1nLnBpeGVsc1tpbmRleF0gPSAwO1xuXHRcdFx0XHRcdFx0XHR0aGlzLmltZy5waXhlbHNbaW5kZXggKyAxXSA9IDA7XG5cdFx0XHRcdFx0XHRcdHRoaXMuaW1nLnBpeGVsc1tpbmRleCArIDJdID0gMDtcblx0XHRcdFx0XHRcdFx0dGhpcy5pbWcucGl4ZWxzW2luZGV4ICsgM10gPSAyNTU7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy5pbWcudXBkYXRlUGl4ZWxzKCk7IC8vIENvcGllcyBvdXIgZWRpdGVkIHBpeGVscyB0byB0aGUgaW1hZ2UuXG5cblx0XHR0aGlzLnNrZXRjaC5pbWFnZSh0aGlzLmltZywgMCwgMCk7IC8vIERpc3BsYXkgaW1hZ2UgdG8gc2NyZWVuLnRoaXMuc2tldGNoLmxpbmUoNTAsNTAsMTAwLDEwMCk7XG5cdH1cbn1cblxuXG5jb25zdCBNT0RVTEVfU2hpZnRDb21wYXJlID0ge1xuXHR2aXo6IFZJWl9zaGlmdENvbXBhcmUsXG5cdG5hbWU6IFwiU2hpZnQgQ29tcGFyZVwiLFxuXHRkZXNjcmlwdGlvbjogXCJcIixcblx0Y29uZmlnU2NoZW1hOiB7fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNT0RVTEVfU2hpZnRDb21wYXJlOyIsImNsYXNzIFZJWl9UdXJ0bGUge1xuXHRjb25zdHJ1Y3RvcihzZXEsIHNrZXRjaCwgY29uZmlnKSB7XG5cdFx0dmFyIGRvbWFpbiA9IGNvbmZpZy5kb21haW47XG5cdFx0dmFyIHJhbmdlID0gY29uZmlnLnJhbmdlO1xuXHRcdHRoaXMucm90TWFwID0ge307XG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBkb21haW4ubGVuZ3RoOyBpKyspIHtcblx0XHRcdHRoaXMucm90TWFwW2RvbWFpbltpXV0gPSAoTWF0aC5QSSAvIDE4MCkgKiByYW5nZVtpXTtcblx0XHR9XG5cdFx0dGhpcy5zdGVwU2l6ZSA9IGNvbmZpZy5zdGVwU2l6ZTtcblx0XHR0aGlzLmJnQ29sb3IgPSBjb25maWcuYmdDb2xvcjtcblx0XHR0aGlzLnN0cm9rZUNvbG9yID0gY29uZmlnLnN0cm9rZUNvbG9yO1xuXHRcdHRoaXMuc3Ryb2tlV2lkdGggPSBjb25maWcuc3Ryb2tlV2VpZ2h0O1xuXHRcdHRoaXMuc2VxID0gc2VxO1xuXHRcdHRoaXMuY3VycmVudEluZGV4ID0gMDtcblx0XHR0aGlzLm9yaWVudGF0aW9uID0gMDtcblx0XHR0aGlzLnNrZXRjaCA9IHNrZXRjaDtcblx0XHRpZiAoY29uZmlnLnN0YXJ0aW5nWCAhPSBcIlwiKSB7XG5cdFx0XHR0aGlzLlggPSBjb25maWcuc3RhcnRpbmdYO1xuXHRcdFx0dGhpcy5ZID0gY29uZmlnLnN0YXJ0aW5nWTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5YID0gbnVsbDtcblx0XHRcdHRoaXMuWSA9IG51bGw7XG5cdFx0fVxuXG5cdH1cblx0c3RlcERyYXcoKSB7XG5cdFx0bGV0IG9sZFggPSB0aGlzLlg7XG5cdFx0bGV0IG9sZFkgPSB0aGlzLlk7XG5cdFx0bGV0IGN1cnJFbGVtZW50ID0gdGhpcy5zZXEuZ2V0RWxlbWVudCh0aGlzLmN1cnJlbnRJbmRleCsrKTtcblx0XHRsZXQgYW5nbGUgPSB0aGlzLnJvdE1hcFtjdXJyRWxlbWVudF07XG5cdFx0aWYgKGFuZ2xlID09IHVuZGVmaW5lZCkge1xuXHRcdFx0dGhyb3cgKCdhbmdsZSB1bmRlZmluZWQgZm9yIGVsZW1lbnQ6ICcgKyBjdXJyRWxlbWVudCk7XG5cdFx0fVxuXHRcdHRoaXMub3JpZW50YXRpb24gPSAodGhpcy5vcmllbnRhdGlvbiArIGFuZ2xlKTtcblx0XHR0aGlzLlggKz0gdGhpcy5zdGVwU2l6ZSAqIE1hdGguY29zKHRoaXMub3JpZW50YXRpb24pO1xuXHRcdHRoaXMuWSArPSB0aGlzLnN0ZXBTaXplICogTWF0aC5zaW4odGhpcy5vcmllbnRhdGlvbik7XG5cdFx0dGhpcy5za2V0Y2gubGluZShvbGRYLCBvbGRZLCB0aGlzLlgsIHRoaXMuWSk7XG5cdH1cblx0c2V0dXAoKSB7XG5cdFx0dGhpcy5YID0gdGhpcy5za2V0Y2gud2lkdGggLyAyO1xuXHRcdHRoaXMuWSA9IHRoaXMuc2tldGNoLmhlaWdodCAvIDI7XG5cdFx0dGhpcy5za2V0Y2guYmFja2dyb3VuZCh0aGlzLmJnQ29sb3IpO1xuXHRcdHRoaXMuc2tldGNoLnN0cm9rZSh0aGlzLnN0cm9rZUNvbG9yKTtcblx0XHR0aGlzLnNrZXRjaC5zdHJva2VXZWlnaHQodGhpcy5zdHJva2VXaWR0aCk7XG5cdH1cblx0ZHJhdygpIHtcblx0XHR0aGlzLnN0ZXBEcmF3KCk7XG5cdH1cbn1cblxuXG5jb25zdCBTQ0hFTUFfVHVydGxlID0ge1xuXHRkb21haW46IHtcblx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHR0aXRsZTogJ1NlcXVlbmNlIERvbWFpbicsXG5cdFx0ZGVzY3JpcHRpb246ICdDb21tYSBzZXBlcmF0ZWQgbnVtYmVycycsXG5cdFx0Zm9ybWF0OiAnbGlzdCcsXG5cdFx0ZGVmYXVsdDogXCIwLDEsMiwzLDRcIixcblx0XHRyZXF1aXJlZDogdHJ1ZVxuXHR9LFxuXHRyYW5nZToge1xuXHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdHRpdGxlOiAnQW5nbGVzJyxcblx0XHRkZWZhdWx0OiBcIjMwLDQ1LDYwLDkwLDEyMFwiLFxuXHRcdGZvcm1hdDogJ2xpc3QnLFxuXHRcdGRlc2NyaXB0aW9uOiAnQ29tbWEgc2VwZXJhdGVkIG51bWJlcnMnLFxuXHRcdHJlcXVpcmVkOiB0cnVlXG5cdH0sXG5cdHN0ZXBTaXplOiB7XG5cdFx0dHlwZTogJ251bWJlcicsXG5cdFx0dGl0bGU6ICdTdGVwIFNpemUnLFxuXHRcdGRlZmF1bHQ6IDIwLFxuXHRcdHJlcXVpcmVkOiB0cnVlXG5cdH0sXG5cdHN0cm9rZVdlaWdodDoge1xuXHRcdHR5cGU6ICdudW1iZXInLFxuXHRcdHRpdGxlOiAnU3Ryb2tlIFdpZHRoJyxcblx0XHRkZWZhdWx0OiA1LFxuXHRcdHJlcXVpcmVkOiB0cnVlXG5cdH0sXG5cdHN0YXJ0aW5nWDoge1xuXHRcdHR5cGU6ICdudW1iZXInLFxuXHRcdHRpdGU6ICdYIHN0YXJ0J1xuXHR9LFxuXHRzdGFydGluZ1k6IHtcblx0XHR0eXBlOiAnbnVtYmVyJyxcblx0XHR0aXRlOiAnWSBzdGFydCdcblx0fSxcblx0YmdDb2xvcjoge1xuXHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdHRpdGxlOiAnQmFja2dyb3VuZCBDb2xvcicsXG5cdFx0Zm9ybWF0OiAnY29sb3InLFxuXHRcdGRlZmF1bHQ6IFwiIzY2NjY2NlwiLFxuXHRcdHJlcXVpcmVkOiBmYWxzZVxuXHR9LFxuXHRzdHJva2VDb2xvcjoge1xuXHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdHRpdGxlOiAnU3Ryb2tlIENvbG9yJyxcblx0XHRmb3JtYXQ6ICdjb2xvcicsXG5cdFx0ZGVmYXVsdDogJyNmZjAwMDAnLFxuXHRcdHJlcXVpcmVkOiBmYWxzZVxuXHR9LFxufTtcblxuY29uc3QgTU9EVUxFX1R1cnRsZSA9IHtcblx0dml6OiBWSVpfVHVydGxlLFxuXHRuYW1lOiBcIlR1cnRsZVwiLFxuXHRkZXNjcmlwdGlvbjogXCJcIixcblx0Y29uZmlnU2NoZW1hOiBTQ0hFTUFfVHVydGxlXG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gTU9EVUxFX1R1cnRsZTsiLCIgICAgICAgIFxuLy8gbnVtYmVyIG9mIGl0ZXJhdGlvbnMgZm9yXG4vLyB0aGUgcmVpbWFuIHpldGEgZnVuY3Rpb24gY29tcHV0YXRpb25cbmNvbnN0IG51bV9pdGVyID0gMTBcblxuY2xhc3MgVklaX1pldGEge1xuICAgICAgICBjb25zdHJ1Y3RvcihzZXEsIHNrZXRjaCwgY29uZmlnKXtcbiAgICAgICAgICAgICAgICAvLyBTZXF1ZW5jZSBsYWJlbFxuICAgICAgICAgICAgICAgIHRoaXMuc2VxID0gc2VxXG5cbiAgICAgICAgICAgICAgICAvLyBQNSBza2V0Y2ggb2JqZWN0XG4gICAgICAgICAgICAgICAgdGhpcy5za2V0Y2ggPSBza2V0Y2hcbiAgICAgICAgICAgICAgICB0aGlzLnNpemUgPSAyMDA7XG4gICAgICAgIH1cblxuICAgICAgICBzZXR1cCgpe1xuICAgICAgICAgICAgICAgIHRoaXMuaXRlciA9IDA7XG4gICAgICAgICAgICAgICAgdGhpcy5za2V0Y2gucGl4ZWxEZW5zaXR5KDEpO1xuICAgICAgICAgICAgICAgIHRoaXMuc2tldGNoLmZyYW1lUmF0ZSgxKTtcblxuICAgICAgICAgICAgICAgIHRoaXMud29ya2luZ1NlcXVlbmNlID0gW107XG4gICAgICAgICAgICAgICAgdmFyIGogPSAwO1xuICAgICAgICAgICAgICAgIHZhciBrID0gMTtcbiAgICAgICAgICAgICAgICBmb3IobGV0IGkgPSAwOyBpIDwgdGhpcy5za2V0Y2gud2lkdGg7ICsraSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy53b3JraW5nU2VxdWVuY2UucHVzaChrICUgNDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRlbXAgPSBqO1xuICAgICAgICAgICAgICAgICAgICAgICAgaiA9IGs7XG4gICAgICAgICAgICAgICAgICAgICAgICBrID0gayArIHRlbXA7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhrICUgNDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG5cbiAgICAgICAgbWFwcGluZ0Z1bmMoeF8sIHlfLCBpdGVycykge1xuICAgICAgICAgICAgICAgIGxldCBhID0geF87XG4gICAgICAgICAgICAgICAgbGV0IGIgPSB5XztcbiAgICAgICAgICAgICAgICBsZXQgbl8gPSAwO1xuICAgICAgICAgICAgICAgIHdoaWxlKG5fIDwgaXRlcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGFhID0gYSphO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYmIgPSBiKmI7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhYiA9IDIuMCAqIGEgKiBiO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBhID0gYWEgLSBiYiArIHhfO1xuICAgICAgICAgICAgICAgICAgICAgICAgYiA9IGFiICsgeV87XG4gICAgICAgICAgICAgICAgICAgICAgICBuXysrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gTWF0aC5zcXJ0KGEgKiBhICsgYiAqIGIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gbWFwcGluZ0Z1bmMoeF8sIHlfLCBpdGVycykge1xuICAgICAgICAvLyAgICAgICAgIGxldCBhID0geF87XG4gICAgICAgIC8vICAgICAgICAgbGV0IG5fID0gMDtcbiAgICAgICAgLy8gICAgICAgICBsZXQgUiA9IDIuMDtcbiAgICAgICAgLy8gICAgICAgICB3aGlsZShuXyA8IGl0ZXJzKSB7XG4gICAgICAgIC8vICAgICAgICAgICAgICAgICBjb25zdCBuZXh0ID0gUiAqIGEgKiAoMSAtIGEpO1xuICAgICAgICAvLyAgICAgICAgICAgICAgICAgYSA9IG5leHQ7XG4gICAgICAgIC8vICAgICAgICAgICAgICAgICBuXyArKztcbiAgICAgICAgLy8gICAgICAgICB9XG4gICAgICAgIC8vICAgICAgICAgcmV0dXJuIGE7XG4gICAgICAgIC8vIH1cbiAgICAgICAgLy9cblxuICAgICAgICBkcmF3TWFwKG1heGl0ZXJhdGlvbnMpe1xuXG4gICAgICAgICAgICAgICAgdGhpcy5za2V0Y2guYmFja2dyb3VuZCgwKTtcbiAgICAgICAgICAgICAgICBjb25zdCB3ID0gNDtcbiAgICAgICAgICAgICAgICBjb25zdCBoID0gKHcgKiB0aGlzLnNrZXRjaC5oZWlnaHQpIC8gdGhpcy5za2V0Y2gud2lkdGg7XG5cbiAgICAgICAgICAgICAgICBjb25zdCB4bWluID0gLXcvMjtcbiAgICAgICAgICAgICAgICBjb25zdCB5bWluID0gLWgvMjtcblxuICAgICAgICAgICAgICAgIHRoaXMuc2tldGNoLmxvYWRQaXhlbHMoKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHhtYXggPSB4bWluICsgdztcbiAgICAgICAgICAgICAgICBjb25zdCB5bWF4ID0geW1pbiArIGg7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBkeCA9ICh4bWF4IC0geG1pbikgLyAodGhpcy5za2V0Y2gud2lkdGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGR5ID0gKHltYXggLSB5bWluKSAvICh0aGlzLnNrZXRjaC5oZWlnaHQpO1xuXG4gICAgICAgICAgICAgICAgLy8gSW1hZ2luYXJ5IHBhcnRcbiAgICAgICAgICAgICAgICBsZXQgeSA9IHltaW47XG4gICAgICAgICAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IHRoaXMuc2tldGNoLmhlaWdodDsgKytpKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlYWwgcGFydCBcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB4ID0geG1pbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcihsZXQgaiA9IDA7IGogPCB0aGlzLnNrZXRjaC53aWR0aDsgKytqKSB7XG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbiA9IHRoaXMubWFwcGluZ0Z1bmMoeCwgeSwgbWF4aXRlcmF0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE11bHRpcGx5IGNvbXBsZXggbnVtYmVycyBtYXhpdGVyYXRpb25zIHRpbWVzXG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpbmRleCBvZiB0aGUgcGl4ZWwgYmFzZWQgb24gaSwgaiAoNCBzcGFubmVkIGFycmF5KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwaXggPSAoaiArIGkqdGhpcy5za2V0Y2gud2lkdGgpICogNDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBQcm9wb3J0aW9uYWxpdHkgc29sdmVyOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBtYXBzIG4gIFxcaW4gWzAsIG1heGl0ZXJhdGlvbnNdIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB0byAgIG4nIFxcaW4gWzAsIDFdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5vcm0gPSB0aGlzLnNrZXRjaC5tYXAobiwgMCwgbWF4aXRlcmF0aW9ucywgMCwgMSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29uc3RyYWluIGJldHdlZW4gMCBhbmQgMjU1XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjb2xvID0gdGhpcy5za2V0Y2gubWFwKE1hdGguc3FydChub3JtKSwgMCwgMSwgMCwgMjU1KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobiA9PSBtYXhpdGVyYXRpb25zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sbyA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUkdCIGNvbG9yaW5nIGdldHMgaW5kZXhlZCBoZXJlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5za2V0Y2gucGl4ZWxzW3BpeCArIDBdID0gY29sbztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNrZXRjaC5waXhlbHNbcGl4ICsgMV0gPSBjb2xvO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2tldGNoLnBpeGVsc1twaXggKyAyXSA9IGNvbG87XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBbHBoYTpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9SR0JBX2NvbG9yX21vZGVsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBpcyBvcGFjaXR5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5za2V0Y2gucGl4ZWxzW3BpeCArIDNdID0gMjU1O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHggKz0gZHg7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB5ICs9IGR5O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRoaXMuc2tldGNoLnVwZGF0ZVBpeGVscygpO1xuICAgICAgICB9XG5cbiAgICAgICAgZHJhdygpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRyYXdNYXAodGhpcy5pdGVyKTtcbiAgICAgICAgICAgICAgICB0aGlzLml0ZXIgPSAodGhpcy5pdGVyICsgMSkgJSAyMDA7XG4gICAgICAgIH1cblxuXG5cblxufVxuXG5jb25zdCBTQ0hFTUFfWmV0YSA9IHtcbiAgICAgICAgICAgIG46IHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgdGl0bGU6ICdOJyxcbiAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTnVtYmVyIG9mIGVsZW1lbnRzJyxcbiAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBMZXZlbHM6IHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgdGl0bGU6ICdMZXZlbHMnLFxuICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdOdW1iZXIgb2YgbGV2ZWxzJyxcbiAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgICAgICAgfSxcbiAgfTtcblxuXG5jb25zdCBNT0RVTEVfWmV0YSA9IHtcbiAgICB2aXo6IFZJWl9aZXRhLFxuICAgIG5hbWU6ICdaZXRhJyxcbiAgICBkZXNjcmlwdGlvbjogJycsXG4gICAgY29uZmlnU2NoZW1hOiBTQ0hFTUFfWmV0YVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE1PRFVMRV9aZXRhXG4gICAgXG4iLCIvL0FkZCBhbiBpbXBvcnQgbGluZSBoZXJlIGZvciBuZXcgbW9kdWxlc1xuXG5cbi8vQWRkIG5ldyBtb2R1bGVzIHRvIHRoaXMgY29uc3RhbnQuXG5jb25zdCBNT0RVTEVTID0ge307XG5cbm1vZHVsZS5leHBvcnRzID0gTU9EVUxFUztcblxuLypqc2hpbnQgaWdub3JlOnN0YXJ0ICovXG5NT0RVTEVTW1wiVHVydGxlXCJdID0gcmVxdWlyZSgnLi9tb2R1bGVUdXJ0bGUuanMnKTtcbk1PRFVMRVNbXCJTaGlmdENvbXBhcmVcIl0gPSByZXF1aXJlKCcuL21vZHVsZVNoaWZ0Q29tcGFyZS5qcycpO1xuTU9EVUxFU1tcIkRpZmZlcmVuY2VzXCJdID0gcmVxdWlyZSgnLi9tb2R1bGVEaWZmZXJlbmNlcy5qcycpO1xuTU9EVUxFU1tcIk1vZEZpbGxcIl0gPSByZXF1aXJlKCcuL21vZHVsZU1vZEZpbGwuanMnKTtcbk1PRFVMRVNbJ1pldGEnXSA9IHJlcXVpcmUoJy4vbW9kdWxlWmV0YS5qcycpXG5cbk1PRFVMRVNbJ0ZyYWN0YWxNYXAnXSA9IHJlcXVpcmUoJy4vbW9kdWxlRnJhY3RhbE1hcC5qcycpXG4iLCJTRVFfbGluZWFyUmVjdXJyZW5jZSA9IHJlcXVpcmUoJy4vc2VxdWVuY2VMaW5SZWMuanMnKTtcblxuZnVuY3Rpb24gR0VOX2ZpYm9uYWNjaSh7XG4gICAgbVxufSkge1xuICAgIHJldHVybiBTRVFfbGluZWFyUmVjdXJyZW5jZS5nZW5lcmF0b3Ioe1xuICAgICAgICBjb2VmZmljaWVudExpc3Q6IFsxLCAxXSxcbiAgICAgICAgc2VlZExpc3Q6IFsxLCAxXSxcbiAgICAgICAgbVxuICAgIH0pO1xufVxuXG5jb25zdCBTQ0hFTUFfRmlib25hY2NpID0ge1xuICAgIG06IHtcbiAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgIHRpdGxlOiAnTW9kJyxcbiAgICAgICAgZGVzY3JpcHRpb246ICdBIG51bWJlciB0byBtb2QgdGhlIHNlcXVlbmNlIGJ5IGJ5JyxcbiAgICAgICAgcmVxdWlyZWQ6IGZhbHNlXG4gICAgfVxufTtcblxuXG5jb25zdCBTRVFfZmlib25hY2NpID0ge1xuICAgIGdlbmVyYXRvcjogR0VOX2ZpYm9uYWNjaSxcbiAgICBuYW1lOiBcIkZpYm9uYWNjaVwiLFxuICAgIGRlc2NyaXB0aW9uOiBcIlwiLFxuICAgIHBhcmFtc1NjaGVtYTogU0NIRU1BX0ZpYm9uYWNjaVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTRVFfZmlib25hY2NpOyIsImZ1bmN0aW9uIEdFTl9saW5lYXJSZWN1cnJlbmNlKHtcbiAgICBjb2VmZmljaWVudExpc3QsXG4gICAgc2VlZExpc3QsXG4gICAgbVxufSkge1xuICAgIGlmIChjb2VmZmljaWVudExpc3QubGVuZ3RoICE9IHNlZWRMaXN0Lmxlbmd0aCkge1xuICAgICAgICAvL051bWJlciBvZiBzZWVkcyBzaG91bGQgbWF0Y2ggdGhlIG51bWJlciBvZiBjb2VmZmljaWVudHNcbiAgICAgICAgY29uc29sZS5sb2coXCJudW1iZXIgb2YgY29lZmZpY2llbnRzIG5vdCBlcXVhbCB0byBudW1iZXIgb2Ygc2VlZHMgXCIpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgbGV0IGsgPSBjb2VmZmljaWVudExpc3QubGVuZ3RoO1xuICAgIGxldCBnZW5lcmljTGluUmVjO1xuICAgIGlmIChtICE9IG51bGwpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb2VmZmljaWVudExpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvZWZmaWNpZW50TGlzdFtpXSA9IGNvZWZmaWNpZW50TGlzdFtpXSAlIG07XG4gICAgICAgICAgICBzZWVkTGlzdFtpXSA9IHNlZWRMaXN0W2ldICUgbTtcbiAgICAgICAgfVxuICAgICAgICBnZW5lcmljTGluUmVjID0gZnVuY3Rpb24gKG4sIGNhY2hlKSB7XG4gICAgICAgICAgICBpZiAobiA8IHNlZWRMaXN0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNhY2hlW25dID0gc2VlZExpc3Rbbl07XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhY2hlW25dO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IGNhY2hlLmxlbmd0aDsgaSA8PSBuOyBpKyspIHtcbiAgICAgICAgICAgICAgICBsZXQgc3VtID0gMDtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGs7IGorKykge1xuICAgICAgICAgICAgICAgICAgICBzdW0gKz0gY2FjaGVbaSAtIGogLSAxXSAqIGNvZWZmaWNpZW50TGlzdFtqXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FjaGVbaV0gPSBzdW0gJSBtO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlW25dO1xuICAgICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGdlbmVyaWNMaW5SZWMgPSBmdW5jdGlvbiAobiwgY2FjaGUpIHtcbiAgICAgICAgICAgIGlmIChuIDwgc2VlZExpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY2FjaGVbbl0gPSBzZWVkTGlzdFtuXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FjaGVbbl07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZvciAobGV0IGkgPSBjYWNoZS5sZW5ndGg7IGkgPD0gbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgbGV0IHN1bSA9IDA7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBrOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgc3VtICs9IGNhY2hlW2kgLSBqIC0gMV0gKiBjb2VmZmljaWVudExpc3Rbal07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhY2hlW2ldID0gc3VtO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlW25dO1xuICAgICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gZ2VuZXJpY0xpblJlYztcbn1cblxuY29uc3QgU0NIRU1BX2xpbmVhclJlY3VycmVuY2UgPSB7XG4gICAgY29lZmZpY2llbnRMaXN0OiB7XG4gICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICB0aXRsZTogJ0NvZWZmaWNpZW50cyBsaXN0JyxcbiAgICAgICAgZm9ybWF0OiAnbGlzdCcsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnQ29tbWEgc2VwZXJhdGVkIG51bWJlcnMnLFxuICAgICAgICByZXF1aXJlZDogdHJ1ZVxuICAgIH0sXG4gICAgc2VlZExpc3Q6IHtcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgIHRpdGxlOiAnU2VlZCBsaXN0JyxcbiAgICAgICAgZm9ybWF0OiAnbGlzdCcsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnQ29tbWEgc2VwZXJhdGVkIG51bWJlcnMnLFxuICAgICAgICByZXF1aXJlZDogdHJ1ZVxuICAgIH0sXG4gICAgbToge1xuICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgdGl0bGU6ICdNb2QnLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ0EgbnVtYmVyIHRvIG1vZCB0aGUgc2VxdWVuY2UgYnkgYnknLFxuICAgICAgICByZXF1aXJlZDogZmFsc2VcbiAgICB9XG59O1xuXG5cbmNvbnN0IFNFUV9saW5lYXJSZWN1cnJlbmNlID0ge1xuICAgIGdlbmVyYXRvcjogR0VOX2xpbmVhclJlY3VycmVuY2UsXG4gICAgbmFtZTogXCJMaW5lYXIgUmVjdXJyZW5jZVwiLFxuICAgIGRlc2NyaXB0aW9uOiBcIlwiLFxuICAgIHBhcmFtc1NjaGVtYTogU0NIRU1BX2xpbmVhclJlY3VycmVuY2Vcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU0VRX2xpbmVhclJlY3VycmVuY2U7IiwiY29uc3QgU0VRX2xpbmVhclJlY3VycmVuY2UgPSByZXF1aXJlKCcuL3NlcXVlbmNlTGluUmVjLmpzJyk7XG5cbmZ1bmN0aW9uIEdFTl9MdWNhcyh7XG4gICAgbVxufSkge1xuICAgIHJldHVybiBTRVFfbGluZWFyUmVjdXJyZW5jZS5nZW5lcmF0b3Ioe1xuICAgICAgICBjb2VmZmljaWVudExpc3Q6IFsxLCAxXSxcbiAgICAgICAgc2VlZExpc3Q6IFsyLCAxXSxcbiAgICAgICAgbVxuICAgIH0pO1xufVxuXG5jb25zdCBTQ0hFTUFfTHVjYXMgPSB7XG4gICAgbToge1xuICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgdGl0bGU6ICdNb2QnLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ0EgbnVtYmVyIHRvIG1vZCB0aGUgc2VxdWVuY2UgYnkgYnknLFxuICAgICAgICByZXF1aXJlZDogZmFsc2VcbiAgICB9XG59O1xuXG5cbmNvbnN0IFNFUV9MdWNhcyA9IHtcbiAgICBnZW5lcmF0b3I6IEdFTl9MdWNhcyxcbiAgICBuYW1lOiBcIkx1Y2FzXCIsXG4gICAgZGVzY3JpcHRpb246IFwiXCIsXG4gICAgcGFyYW1zU2NoZW1hOiBTQ0hFTUFfTHVjYXNcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU0VRX0x1Y2FzOyIsImZ1bmN0aW9uIEdFTl9OYXR1cmFscyh7XG4gICAgaW5jbHVkZXplcm9cbn0pIHtcbiAgICBpZiAoaW5jbHVkZXplcm8pIHtcbiAgICAgICAgcmV0dXJuICgobikgPT4gbik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuICgobikgPT4gbiArIDEpO1xuICAgIH1cbn1cblxuY29uc3QgU0NIRU1BX05hdHVyYWxzID0ge1xuICAgIGluY2x1ZGV6ZXJvOiB7XG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgdGl0bGU6ICdJbmNsdWRlIHplcm8nLFxuICAgICAgICBkZXNjcmlwdGlvbjogJycsXG4gICAgICAgIGRlZmF1bHQ6ICdmYWxzZScsXG4gICAgICAgIHJlcXVpcmVkOiBmYWxzZVxuICAgIH1cbn07XG5cblxuY29uc3QgU0VRX05hdHVyYWxzID0ge1xuICAgIGdlbmVyYXRvcjogR0VOX05hdHVyYWxzLFxuICAgIG5hbWU6IFwiTmF0dXJhbHNcIixcbiAgICBkZXNjcmlwdGlvbjogXCJcIixcbiAgICBwYXJhbXNTY2hlbWE6IFNDSEVNQV9OYXR1cmFsc1xufTtcblxuLy8gZXhwb3J0IGRlZmF1bHQgU0VRX05hdHVyYWxzXG5tb2R1bGUuZXhwb3J0cyA9IFNFUV9OYXR1cmFsczsiLCJmdW5jdGlvbiBHRU5fUHJpbWVzKCkge1xuICAgIGNvbnN0IHByaW1lcyA9IGZ1bmN0aW9uIChuLCBjYWNoZSkge1xuICAgICAgICBpZiAoY2FjaGUubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgIGNhY2hlLnB1c2goMik7XG4gICAgICAgICAgICBjYWNoZS5wdXNoKDMpO1xuICAgICAgICAgICAgY2FjaGUucHVzaCg1KTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgaSA9IGNhY2hlW2NhY2hlLmxlbmd0aCAtIDFdICsgMTtcbiAgICAgICAgbGV0IGsgPSAwO1xuICAgICAgICB3aGlsZSAoY2FjaGUubGVuZ3RoIDw9IG4pIHtcbiAgICAgICAgICAgIGxldCBpc1ByaW1lID0gdHJ1ZTtcbiAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgY2FjaGUubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoaSAlIGNhY2hlW2pdID09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgaXNQcmltZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaXNQcmltZSkge1xuICAgICAgICAgICAgICAgIGNhY2hlLnB1c2goaSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpKys7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNhY2hlW25dO1xuICAgIH07XG4gICAgcmV0dXJuIHByaW1lcztcbn1cblxuXG5jb25zdCBTQ0hFTUFfUHJpbWVzID0ge1xuICAgIG06IHtcbiAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgIHRpdGxlOiAnTW9kJyxcbiAgICAgICAgZGVzY3JpcHRpb246ICdBIG51bWJlciB0byBtb2QgdGhlIHNlcXVlbmNlIGJ5JyxcbiAgICAgICAgcmVxdWlyZWQ6IGZhbHNlXG4gICAgfVxufTtcblxuXG5jb25zdCBTRVFfUHJpbWVzID0ge1xuICAgIGdlbmVyYXRvcjogR0VOX1ByaW1lcyxcbiAgICBuYW1lOiBcIlByaW1lc1wiLFxuICAgIGRlc2NyaXB0aW9uOiBcIlwiLFxuICAgIHBhcmFtc1NjaGVtYTogU0NIRU1BX1ByaW1lc1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTRVFfUHJpbWVzOyIsIi8qKlxuICpcbiAqIEBjbGFzcyBTZXF1ZW5jZUdlbmVyYXRvclxuICovXG5jbGFzcyBTZXF1ZW5jZUdlbmVyYXRvciB7XG4gICAgLyoqXG4gICAgICpDcmVhdGVzIGFuIGluc3RhbmNlIG9mIFNlcXVlbmNlR2VuZXJhdG9yLlxuICAgICAqIEBwYXJhbSB7Kn0gZ2VuZXJhdG9yIGEgZnVuY3Rpb24gdGhhdCB0YWtlcyBhIG5hdHVyYWwgbnVtYmVyIGFuZCByZXR1cm5zIGEgbnVtYmVyLCBpdCBjYW4gb3B0aW9uYWxseSB0YWtlIHRoZSBjYWNoZSBhcyBhIHNlY29uZCBhcmd1bWVudFxuICAgICAqIEBwYXJhbSB7Kn0gSUQgdGhlIElEIG9mIHRoZSBzZXF1ZW5jZVxuICAgICAqIEBtZW1iZXJvZiBTZXF1ZW5jZUdlbmVyYXRvclxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKElELCBnZW5lcmF0b3IpIHtcbiAgICAgICAgdGhpcy5nZW5lcmF0b3IgPSBnZW5lcmF0b3I7XG4gICAgICAgIHRoaXMuSUQgPSBJRDtcbiAgICAgICAgdGhpcy5jYWNoZSA9IFtdO1xuICAgICAgICB0aGlzLm5ld1NpemUgPSAxO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBpZiB3ZSBuZWVkIHRvIGdldCB0aGUgbnRoIGVsZW1lbnQgYW5kIGl0J3Mgbm90IHByZXNlbnQgaW5cbiAgICAgKiBpbiB0aGUgY2FjaGUsIHRoZW4gd2UgZWl0aGVyIGRvdWJsZSB0aGUgc2l6ZSwgb3IgdGhlIFxuICAgICAqIG5ldyBzaXplIGJlY29tZXMgbisxXG4gICAgICogQHBhcmFtIHsqfSBuIFxuICAgICAqIEBtZW1iZXJvZiBTZXF1ZW5jZUdlbmVyYXRvclxuICAgICAqL1xuICAgIHJlc2l6ZUNhY2hlKG4pIHtcbiAgICAgICAgdGhpcy5uZXdTaXplID0gdGhpcy5jYWNoZS5sZW5ndGggKiAyO1xuICAgICAgICBpZiAobiArIDEgPiB0aGlzLm5ld1NpemUpIHtcbiAgICAgICAgICAgIHRoaXMubmV3U2l6ZSA9IG4gKyAxO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlcyB0aGUgY2FjaGUgdXAgdW50aWwgdGhlIGN1cnJlbnQgbmV3U2l6ZVxuICAgICAqIHRoaXMgaXMgY2FsbGVkIGFmdGVyIHJlc2l6ZUNhY2hlXG4gICAgICogQG1lbWJlcm9mIFNlcXVlbmNlR2VuZXJhdG9yXG4gICAgICovXG4gICAgZmlsbENhY2hlKCkge1xuICAgICAgICBmb3IgKGxldCBpID0gdGhpcy5jYWNoZS5sZW5ndGg7IGkgPCB0aGlzLm5ld1NpemU7IGkrKykge1xuICAgICAgICAgICAgLy90aGUgZ2VuZXJhdG9yIGlzIGdpdmVuIHRoZSBjYWNoZSBzaW5jZSBpdCB3b3VsZCBtYWtlIGNvbXB1dGF0aW9uIG1vcmUgZWZmaWNpZW50IHNvbWV0aW1lc1xuICAgICAgICAgICAgLy9idXQgdGhlIGdlbmVyYXRvciBkb2Vzbid0IG5lY2Vzc2FyaWx5IG5lZWQgdG8gdGFrZSBtb3JlIHRoYW4gb25lIGFyZ3VtZW50LlxuICAgICAgICAgICAgdGhpcy5jYWNoZVtpXSA9IHRoaXMuZ2VuZXJhdG9yKGksIHRoaXMuY2FjaGUpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEdldCBlbGVtZW50IGlzIHdoYXQgdGhlIGRyYXdpbmcgdG9vbHMgd2lsbCBiZSBjYWxsaW5nLCBpdCByZXRyaWV2ZXNcbiAgICAgKiB0aGUgbnRoIGVsZW1lbnQgb2YgdGhlIHNlcXVlbmNlIGJ5IGVpdGhlciBnZXR0aW5nIGl0IGZyb20gdGhlIGNhY2hlXG4gICAgICogb3IgaWYgaXNuJ3QgcHJlc2VudCwgYnkgYnVpbGRpbmcgdGhlIGNhY2hlIGFuZCB0aGVuIGdldHRpbmcgaXRcbiAgICAgKiBAcGFyYW0geyp9IG4gdGhlIGluZGV4IG9mIHRoZSBlbGVtZW50IGluIHRoZSBzZXF1ZW5jZSB3ZSB3YW50XG4gICAgICogQHJldHVybnMgYSBudW1iZXJcbiAgICAgKiBAbWVtYmVyb2YgU2VxdWVuY2VHZW5lcmF0b3JcbiAgICAgKi9cbiAgICBnZXRFbGVtZW50KG4pIHtcbiAgICAgICAgaWYgKHRoaXMuY2FjaGVbbl0gIT0gdW5kZWZpbmVkIHx8IHRoaXMuZmluaXRlKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcImNhY2hlIGhpdFwiKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FjaGVbbl07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcImNhY2hlIG1pc3NcIilcbiAgICAgICAgICAgIHRoaXMucmVzaXplQ2FjaGUobik7XG4gICAgICAgICAgICB0aGlzLmZpbGxDYWNoZSgpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FjaGVbbl07XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuLyoqXG4gKlxuICpcbiAqIEBwYXJhbSB7Kn0gY29kZSBhcmJpdHJhcnkgc2FnZSBjb2RlIHRvIGJlIGV4ZWN1dGVkIG9uIGFsZXBoXG4gKiBAcmV0dXJucyBhamF4IHJlc3BvbnNlIG9iamVjdFxuICovXG5mdW5jdGlvbiBzYWdlRXhlY3V0ZShjb2RlKSB7XG4gICAgcmV0dXJuICQuYWpheCh7XG4gICAgICAgIHR5cGU6ICdQT1NUJyxcbiAgICAgICAgYXN5bmM6IGZhbHNlLFxuICAgICAgICB1cmw6ICdodHRwOi8vYWxlcGguc2FnZW1hdGgub3JnL3NlcnZpY2UnLFxuICAgICAgICBkYXRhOiBcImNvZGU9XCIgKyBjb2RlXG4gICAgfSk7XG59XG5cbi8qKlxuICpcbiAqXG4gKiBAcGFyYW0geyp9IGNvZGUgYXJiaXRyYXJ5IHNhZ2UgY29kZSB0byBiZSBleGVjdXRlZCBvbiBhbGVwaFxuICogQHJldHVybnMgYWpheCByZXNwb25zZSBvYmplY3RcbiAqL1xuYXN5bmMgZnVuY3Rpb24gc2FnZUV4ZWN1dGVBc3luYyhjb2RlKSB7XG4gICAgcmV0dXJuIGF3YWl0ICQuYWpheCh7XG4gICAgICAgIHR5cGU6ICdQT1NUJyxcbiAgICAgICAgdXJsOiAnaHR0cDovL2FsZXBoLnNhZ2VtYXRoLm9yZy9zZXJ2aWNlJyxcbiAgICAgICAgZGF0YTogXCJjb2RlPVwiICsgY29kZVxuICAgIH0pO1xufVxuXG5cbmNsYXNzIE9FSVNTZXF1ZW5jZUdlbmVyYXRvciB7XG4gICAgY29uc3RydWN0b3IoSUQsIE9FSVMpIHtcbiAgICAgICAgdGhpcy5PRUlTID0gT0VJUztcbiAgICAgICAgdGhpcy5JRCA9IElEO1xuICAgICAgICB0aGlzLmNhY2hlID0gW107XG4gICAgICAgIHRoaXMubmV3U2l6ZSA9IDE7XG4gICAgICAgIHRoaXMucHJlZmlsbENhY2hlKCk7XG4gICAgfVxuICAgIG9laXNGZXRjaChuKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiRmV0Y2hpbmcuLlwiKTtcbiAgICAgICAgbGV0IGNvZGUgPSBgcHJpbnQoc2xvYW5lLiR7dGhpcy5PRUlTfS5saXN0KCR7bn0pKWA7XG4gICAgICAgIGxldCByZXNwID0gc2FnZUV4ZWN1dGUoY29kZSk7XG4gICAgICAgIHJldHVybiBKU09OLnBhcnNlKHJlc3AucmVzcG9uc2VKU09OLnN0ZG91dCk7XG4gICAgfVxuICAgIGFzeW5jIHByZWZpbGxDYWNoZSgpIHtcbiAgICAgICAgdGhpcy5yZXNpemVDYWNoZSgzMDAwKTtcbiAgICAgICAgbGV0IGNvZGUgPSBgcHJpbnQoc2xvYW5lLiR7dGhpcy5PRUlTfS5saXN0KCR7dGhpcy5uZXdTaXplfSkpYDtcbiAgICAgICAgbGV0IHJlc3AgPSBhd2FpdCBzYWdlRXhlY3V0ZUFzeW5jKGNvZGUpO1xuICAgICAgICBjb25zb2xlLmxvZyhyZXNwKTtcbiAgICAgICAgdGhpcy5jYWNoZSA9IHRoaXMuY2FjaGUuY29uY2F0KEpTT04ucGFyc2UocmVzcC5zdGRvdXQpKTtcbiAgICB9XG4gICAgcmVzaXplQ2FjaGUobikge1xuICAgICAgICB0aGlzLm5ld1NpemUgPSB0aGlzLmNhY2hlLmxlbmd0aCAqIDI7XG4gICAgICAgIGlmIChuICsgMSA+IHRoaXMubmV3U2l6ZSkge1xuICAgICAgICAgICAgdGhpcy5uZXdTaXplID0gbiArIDE7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZmlsbENhY2hlKCkge1xuICAgICAgICBsZXQgbmV3TGlzdCA9IHRoaXMub2Vpc0ZldGNoKHRoaXMubmV3U2l6ZSk7XG4gICAgICAgIHRoaXMuY2FjaGUgPSB0aGlzLmNhY2hlLmNvbmNhdChuZXdMaXN0KTtcbiAgICB9XG4gICAgZ2V0RWxlbWVudChuKSB7XG4gICAgICAgIGlmICh0aGlzLmNhY2hlW25dICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FjaGVbbl07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnJlc2l6ZUNhY2hlKCk7XG4gICAgICAgICAgICB0aGlzLmZpbGxDYWNoZSgpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FjaGVbbl07XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIEJ1aWx0SW5OYW1lVG9TZXEoSUQsIHNlcU5hbWUsIHNlcVBhcmFtcykge1xuICAgIGxldCBnZW5lcmF0b3IgPSBCdWlsdEluU2Vxc1tzZXFOYW1lXS5nZW5lcmF0b3Ioc2VxUGFyYW1zKTtcbiAgICByZXR1cm4gbmV3IFNlcXVlbmNlR2VuZXJhdG9yKElELCBnZW5lcmF0b3IpO1xufVxuXG5cbmZ1bmN0aW9uIExpc3RUb1NlcShJRCwgbGlzdCkge1xuICAgIGxldCBsaXN0R2VuZXJhdG9yID0gZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgcmV0dXJuIGxpc3Rbbl07XG4gICAgfTtcbiAgICByZXR1cm4gbmV3IFNlcXVlbmNlR2VuZXJhdG9yKElELCBsaXN0R2VuZXJhdG9yKTtcbn1cblxuZnVuY3Rpb24gT0VJU1RvU2VxKElELCBPRUlTKSB7XG4gICAgcmV0dXJuIG5ldyBPRUlTU2VxdWVuY2VHZW5lcmF0b3IoSUQsIE9FSVMpO1xufVxuXG5cbmNvbnN0IEJ1aWx0SW5TZXFzID0ge307XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgJ0J1aWx0SW5OYW1lVG9TZXEnOiBCdWlsdEluTmFtZVRvU2VxLFxuICAgICdMaXN0VG9TZXEnOiBMaXN0VG9TZXEsXG4gICAgJ09FSVNUb1NlcSc6IE9FSVNUb1NlcSxcbiAgICAnQnVpbHRJblNlcXMnOiBCdWlsdEluU2Vxc1xufTtcblxuLypqc2hpbnQgaWdub3JlOiBzdGFydCAqL1xuQnVpbHRJblNlcXNbXCJGaWJvbmFjY2lcIl0gPSByZXF1aXJlKCcuL3NlcXVlbmNlRmlib25hY2NpLmpzJyk7XG5CdWlsdEluU2Vxc1tcIkx1Y2FzXCJdID0gcmVxdWlyZSgnLi9zZXF1ZW5jZUx1Y2FzLmpzJyk7XG5CdWlsdEluU2Vxc1tcIlByaW1lc1wiXSA9IHJlcXVpcmUoJy4vc2VxdWVuY2VQcmltZXMuanMnKTtcbkJ1aWx0SW5TZXFzW1wiTmF0dXJhbHNcIl0gPSByZXF1aXJlKCcuL3NlcXVlbmNlTmF0dXJhbHMuanMnKTtcbkJ1aWx0SW5TZXFzW1wiTGluUmVjXCJdID0gcmVxdWlyZSgnLi9zZXF1ZW5jZUxpblJlYy5qcycpO1xuQnVpbHRJblNlcXNbJ1ByaW1lcyddID0gcmVxdWlyZSgnLi9zZXF1ZW5jZVByaW1lcy5qcycpOyIsIm1vZHVsZS5leHBvcnRzID0gW1wiQTAwMDAwMVwiLCBcIkEwMDAwMjdcIiwgXCJBMDAwMDA0XCIsIFwiQTAwMDAwNVwiLCBcIkEwMDAwMDhcIiwgXCJBMDAwMDA5XCIsIFwiQTAwMDc5NlwiLCBcIkEwMDM0MThcIiwgXCJBMDA3MzE4XCIsIFwiQTAwODI3NVwiLCBcIkEwMDgyNzdcIiwgXCJBMDQ5MzEwXCIsIFwiQTAwMDAxMFwiLCBcIkEwMDAwMDdcIiwgXCJBMDA1ODQzXCIsIFwiQTAwMDAzNVwiLCBcIkEwMDAxNjlcIiwgXCJBMDAwMjcyXCIsIFwiQTAwMDMxMlwiLCBcIkEwMDE0NzdcIiwgXCJBMDA0NTI2XCIsIFwiQTAwMDMyNlwiLCBcIkEwMDIzNzhcIiwgXCJBMDAyNjIwXCIsIFwiQTAwNTQwOFwiLCBcIkEwMDAwMTJcIiwgXCJBMDAwMTIwXCIsIFwiQTAxMDA2MFwiLCBcIkEwMDAwNjlcIiwgXCJBMDAxOTY5XCIsIFwiQTAwMDI5MFwiLCBcIkEwMDAyMjVcIiwgXCJBMDAwMDE1XCIsIFwiQTAwMDAxNlwiLCBcIkEwMDAwMzJcIiwgXCJBMDA0MDg2XCIsIFwiQTAwMjExM1wiLCBcIkEwMDAwMzBcIiwgXCJBMDAwMDQwXCIsIFwiQTAwMjgwOFwiLCBcIkEwMTgyNTJcIiwgXCJBMDAwMDQzXCIsIFwiQTAwMDY2OFwiLCBcIkEwMDAzOTZcIiwgXCJBMDA1MTAwXCIsIFwiQTAwNTEwMVwiLCBcIkEwMDIxMTBcIiwgXCJBMDAwNzIwXCIsIFwiQTA2NDU1M1wiLCBcIkEwMDEwNTVcIiwgXCJBMDA2NTMwXCIsIFwiQTAwMDk2MVwiLCBcIkEwMDUxMTdcIiwgXCJBMDIwNjM5XCIsIFwiQTAwMDA0MVwiLCBcIkEwMDAwNDVcIiwgXCJBMDAwMTA4XCIsIFwiQTAwMTAwNlwiLCBcIkEwMDAwNzlcIiwgXCJBMDAwNTc4XCIsIFwiQTAwMDI0NFwiLCBcIkEwMDAzMDJcIiwgXCJBMDAwNTgzXCIsIFwiQTAwMDE0MlwiLCBcIkEwMDAwODVcIiwgXCJBMDAxMTg5XCIsIFwiQTAwMDY3MFwiLCBcIkEwMDYzMThcIiwgXCJBMDAwMTY1XCIsIFwiQTAwMTE0N1wiLCBcIkEwMDY4ODJcIiwgXCJBMDAwOTg0XCIsIFwiQTAwMTQwNVwiLCBcIkEwMDAyOTJcIiwgXCJBMDAwMzMwXCIsIFwiQTAwMDE1M1wiLCBcIkEwMDAyNTVcIiwgXCJBMDAwMjYxXCIsIFwiQTAwMTkwOVwiLCBcIkEwMDE5MTBcIiwgXCJBMDkwMDEwXCIsIFwiQTA1NTc5MFwiLCBcIkEwOTAwMTJcIiwgXCJBMDkwMDEzXCIsIFwiQTA5MDAxNFwiLCBcIkEwOTAwMTVcIiwgXCJBMDkwMDE2XCIsIFwiQTAwMDE2NlwiLCBcIkEwMDAyMDNcIiwgXCJBMDAxMTU3XCIsIFwiQTAwODY4M1wiLCBcIkEwMDAyMDRcIiwgXCJBMDAwMjE3XCIsIFwiQTAwMDEyNFwiLCBcIkEwMDIyNzVcIiwgXCJBMDAxMTEwXCIsIFwiQTA1MTk1OVwiLCBcIkEwMDEyMjFcIiwgXCJBMDAxMjIyXCIsIFwiQTA0NjY2MFwiLCBcIkEwMDEyMjdcIiwgXCJBMDAxMzU4XCIsIFwiQTAwMTY5NFwiLCBcIkEwMDE4MzZcIiwgXCJBMDAxOTA2XCIsIFwiQTAwMTMzM1wiLCBcIkEwMDEwNDVcIiwgXCJBMDAwMTI5XCIsIFwiQTAwMTEwOVwiLCBcIkEwMTU1MjFcIiwgXCJBMDE1NTIzXCIsIFwiQTAxNTUzMFwiLCBcIkEwMTU1MzFcIiwgXCJBMDE1NTUxXCIsIFwiQTA4MjQxMVwiLCBcIkEwODMxMDNcIiwgXCJBMDgzMTA0XCIsIFwiQTA4MzEwNVwiLCBcIkEwODMyMTZcIiwgXCJBMDYxMDg0XCIsIFwiQTAwMDIxM1wiLCBcIkEwMDAwNzNcIiwgXCJBMDc5OTIyXCIsIFwiQTA3OTkyM1wiLCBcIkExMDk4MTRcIiwgXCJBMTExNzc0XCIsIFwiQTExMTc3NVwiLCBcIkExMTE3ODdcIiwgXCJBMDAwMTEwXCIsIFwiQTAwMDU4N1wiLCBcIkEwMDAxMDBcIl1cbiJdfQ==

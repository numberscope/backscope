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
        console.log("here22");
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

                // this.workingSequence = [];
                var j = 0;
                var k = 1;
                // for(let i = 0; i < this.sketch.width; ++i) {
                //         this.workingSequence.push(k % 40);
                //         var temp = j;
                //         j = k;
                //         k = k + temp;
                // }
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

                console.log(this.sketch);
                console.log(this.sketch.pixels);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsInN0YXRpYy9qcy9sZWdhY3kvTlNjb3JlLmpzIiwic3RhdGljL2pzL2xlZ2FjeS9WYWxpZGF0aW9uLmpzIiwic3RhdGljL2pzL2xlZ2FjeS9tb2R1bGVzL21vZHVsZURpZmZlcmVuY2VzLmpzIiwic3RhdGljL2pzL2xlZ2FjeS9tb2R1bGVzL21vZHVsZUZyYWN0YWxNYXAuanMiLCJzdGF0aWMvanMvbGVnYWN5L21vZHVsZXMvbW9kdWxlTW9kRmlsbC5qcyIsInN0YXRpYy9qcy9sZWdhY3kvbW9kdWxlcy9tb2R1bGVTaGlmdENvbXBhcmUuanMiLCJzdGF0aWMvanMvbGVnYWN5L21vZHVsZXMvbW9kdWxlVHVydGxlLmpzIiwic3RhdGljL2pzL2xlZ2FjeS9tb2R1bGVzL21vZHVsZVpldGEuanMiLCJzdGF0aWMvanMvbGVnYWN5L21vZHVsZXMvbW9kdWxlcy5qcyIsInN0YXRpYy9qcy9sZWdhY3kvc2VxdWVuY2VzL3NlcXVlbmNlRmlib25hY2NpLmpzIiwic3RhdGljL2pzL2xlZ2FjeS9zZXF1ZW5jZXMvc2VxdWVuY2VMaW5SZWMuanMiLCJzdGF0aWMvanMvbGVnYWN5L3NlcXVlbmNlcy9zZXF1ZW5jZUx1Y2FzLmpzIiwic3RhdGljL2pzL2xlZ2FjeS9zZXF1ZW5jZXMvc2VxdWVuY2VOYXR1cmFscy5qcyIsInN0YXRpYy9qcy9sZWdhY3kvc2VxdWVuY2VzL3NlcXVlbmNlUHJpbWVzLmpzIiwic3RhdGljL2pzL2xlZ2FjeS9zZXF1ZW5jZXMvc2VxdWVuY2VzLmpzIiwic3RhdGljL2pzL2xlZ2FjeS92YWxpZE9FSVMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOVBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9IQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUtBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIvKmpzaGludCBtYXhlcnI6IDEwMDAwICovXG5cblNFUVVFTkNFID0gcmVxdWlyZSgnLi9zZXF1ZW5jZXMvc2VxdWVuY2VzLmpzJyk7XG5NT0RVTEVTID0gcmVxdWlyZSgnLi9tb2R1bGVzL21vZHVsZXMuanMnKTtcblZhbGlkYXRpb24gPSByZXF1aXJlKCcuL1ZhbGlkYXRpb24uanMnKTtcblxuY29uc3QgTGlzdFRvU2VxID0gU0VRVUVOQ0UuTGlzdFRvU2VxO1xuY29uc3QgT0VJU1RvU2VxID0gU0VRVUVOQ0UuT0VJU1RvU2VxO1xuY29uc3QgQnVpbHRJbk5hbWVUb1NlcSA9IFNFUVVFTkNFLkJ1aWx0SW5OYW1lVG9TZXE7XG5cbmZ1bmN0aW9uIHN0cmluZ1RvQXJyYXkoc3RyQXJyKSB7XG5cdHJldHVybiBKU09OLnBhcnNlKFwiW1wiICsgc3RyQXJyICsgXCJdXCIpO1xufVxuXG5jb25zdCBOU2NvcmUgPSBmdW5jdGlvbiAoKSB7XG5cdGNvbnN0IG1vZHVsZXMgPSBNT0RVTEVTOyAvLyAgY2xhc3NlcyB0byB0aGUgZHJhd2luZyBtb2R1bGVzXG5cdGNvbnN0IEJ1aWx0SW5TZXFzID0gU0VRVUVOQ0UuQnVpbHRJblNlcXM7XG5cdGNvbnN0IHZhbGlkT0VJUyA9IFZBTElET0VJUztcblx0dmFyIHByZXBhcmVkU2VxdWVuY2VzID0gW107IC8vIHNlcXVlbmNlR2VuZXJhdG9ycyB0byBiZSBkcmF3blxuXHR2YXIgcHJlcGFyZWRUb29scyA9IFtdOyAvLyBjaG9zZW4gZHJhd2luZyBtb2R1bGVzIFxuXHR2YXIgdW5wcm9jZXNzZWRTZXF1ZW5jZXMgPSBbXTsgLy9zZXF1ZW5jZXMgaW4gYSBzYXZlYWJsZSBmb3JtYXRcblx0dmFyIHVucHJvY2Vzc2VkVG9vbHMgPSBbXTsgLy90b29scyBpbiBhIHNhdmVhYmxlIGZvcm1hdFxuXHR2YXIgbGl2ZVNrZXRjaGVzID0gW107IC8vIHA1IHNrZXRjaGVzIGJlaW5nIGRyYXduXG5cblx0LyoqXG5cdCAqXG5cdCAqXG5cdCAqIEBwYXJhbSB7Kn0gbW9kdWxlQ2xhc3MgZHJhd2luZyBtb2R1bGUgdG8gYmUgdXNlZCBmb3IgdGhpcyBza2V0Y2hcblx0ICogQHBhcmFtIHsqfSBjb25maWcgY29ycmVzcG9uZGluZyBjb25maWcgZm9yIGRyYXdpbmcgbW9kdWxlXG5cdCAqIEBwYXJhbSB7Kn0gc2VxIHNlcXVlbmNlIHRvIGJlIHBhc3NlZCB0byBkcmF3aW5nIG1vZHVsZVxuXHQgKiBAcGFyYW0geyp9IGRpdklEIGRpdiB3aGVyZSBza2V0Y2ggd2lsbCBiZSBwbGFjZWRcblx0ICogQHBhcmFtIHsqfSB3aWR0aCB3aWR0aCBvZiBza2V0Y2hcblx0ICogQHBhcmFtIHsqfSBoZWlnaHQgaGVpZ2h0IG9mIHNrZXRjaFxuXHQgKiBAcmV0dXJucyBwNSBza2V0Y2hcblx0ICovXG5cdGNvbnN0IGdlbmVyYXRlUDUgPSBmdW5jdGlvbiAobW9kdWxlQ2xhc3MsIGNvbmZpZywgc2VxLCBkaXZJRCwgd2lkdGgsIGhlaWdodCkge1xuXG5cdFx0Ly9DcmVhdGUgY2FudmFzIGVsZW1lbnQgaGVyZVxuXHRcdHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHQvL1RoZSBzdHlsZSBvZiB0aGUgY2FudmFzZXMgd2lsbCBiZSBcImNhbnZhc0NsYXNzXCJcblx0XHRkaXYuY2xhc3NOYW1lID0gXCJjYW52YXNDbGFzc1wiO1xuXHRcdGRpdi5pZCA9IFwibGl2ZUNhbnZhc1wiICsgZGl2SUQ7XG5cdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjYW52YXNBcmVhXCIpLmFwcGVuZENoaWxkKGRpdik7XG5cdFx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdFx0Ly9DcmVhdGUgUDVqcyBpbnN0YW5jZVxuXHRcdGxldCBteXA1ID0gbmV3IHA1KGZ1bmN0aW9uIChza2V0Y2gpIHtcblx0XHRcdGxldCBtb2R1bGVJbnN0YW5jZSA9IG5ldyBtb2R1bGVDbGFzcyhzZXEsIHNrZXRjaCwgY29uZmlnKTtcblx0XHRcdHNrZXRjaC5zZXR1cCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0c2tldGNoLmNyZWF0ZUNhbnZhcyh3aWR0aCwgaGVpZ2h0KTtcblx0XHRcdFx0c2tldGNoLmJhY2tncm91bmQoXCJ3aGl0ZVwiKTtcblx0XHRcdFx0bW9kdWxlSW5zdGFuY2Uuc2V0dXAoKTtcblx0XHRcdH07XG5cblx0XHRcdHNrZXRjaC5kcmF3ID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRtb2R1bGVJbnN0YW5jZS5kcmF3KCk7XG5cdFx0XHR9O1xuXHRcdH0sIGRpdi5pZCk7XG5cdFx0cmV0dXJuIG15cDU7XG5cdH07XG5cblx0LyoqXG5cdCAqIFdoZW4gdGhlIHVzZXIgY2hvb3NlcyBhIGRyYXdpbmcgbW9kdWxlIGFuZCBwcm92aWRlcyBjb3JyZXNwb25kaW5nIGNvbmZpZ1xuXHQgKiBpdCB3aWxsIGF1dG9tYXRpY2FsbHkgYmUgcGFzc2VkIHRvIHRoaXMgZnVuY3Rpb24sIHdoaWNoIHdpbGwgdmFsaWRhdGUgaW5wdXRcblx0ICogYW5kIGFwcGVuZCBpdCB0byB0aGUgcHJlcGFyZWQgdG9vbHNcblx0ICogQHBhcmFtIHsqfSBtb2R1bGVPYmogaW5mb3JtYXRpb24gdXNlZCB0byBwcmVwYXJlIHRoZSByaWdodCBkcmF3aW5nIG1vZHVsZSwgdGhpcyBpbnB1dFxuXHQgKiB0aGlzIHdpbGwgY29udGFpbiBhbiBJRCwgdGhlIG1vZHVsZUtleSB3aGljaCBzaG91bGQgbWF0Y2ggYSBrZXkgaW4gTU9EVUxFU19KU09OLCBhbmRcblx0ICogYSBjb25maWcgb2JqZWN0LlxuXHQgKi9cblx0Y29uc3QgcmVjZWl2ZU1vZHVsZSA9IGZ1bmN0aW9uIChtb2R1bGVPYmopIHtcblx0XHRpZiAoKG1vZHVsZU9iai5JRCAmJiBtb2R1bGVPYmoubW9kdWxlS2V5ICYmIG1vZHVsZU9iai5jb25maWcgJiYgbW9kdWxlc1ttb2R1bGVPYmoubW9kdWxlS2V5XSkgPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRjb25zb2xlLmVycm9yKFwiT25lIG9yIG1vcmUgdW5kZWZpbmVkIG1vZHVsZSBwcm9wZXJ0aWVzIHJlY2VpdmVkIGluIE5TY29yZVwiKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dmFsaWRhdGlvblJlc3VsdCA9IFZhbGlkYXRpb24ubW9kdWxlKG1vZHVsZU9iaik7XG5cdFx0XHRpZiAodmFsaWRhdGlvblJlc3VsdC5lcnJvcnMubGVuZ3RoICE9IDApIHtcblx0XHRcdFx0cHJlcGFyZWRUb29sc1ttb2R1bGVPYmouSURdID0gbnVsbDtcblx0XHRcdFx0cmV0dXJuIHZhbGlkYXRpb25SZXN1bHQuZXJyb3JzO1xuXHRcdFx0fVxuXHRcdFx0bW9kdWxlT2JqLmNvbmZpZyA9IHZhbGlkYXRpb25SZXN1bHQucGFyc2VkRmllbGRzO1xuXHRcdFx0cHJlcGFyZWRUb29sc1ttb2R1bGVPYmouSURdID0ge1xuXHRcdFx0XHRtb2R1bGU6IG1vZHVsZXNbbW9kdWxlT2JqLm1vZHVsZUtleV0sXG5cdFx0XHRcdGNvbmZpZzogbW9kdWxlT2JqLmNvbmZpZyxcblx0XHRcdFx0SUQ6IG1vZHVsZU9iai5JRFxuXHRcdFx0fTtcblx0XHRcdHVucHJvY2Vzc2VkVG9vbHNbbW9kdWxlT2JqLklEXSA9IG1vZHVsZU9iajtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblx0fTtcblxuXHQvKipcblx0ICogV2hlbiB0aGUgdXNlciBjaG9vc2VzIGEgc2VxdWVuY2UsIHdlIHdpbGwgYXV0b21hdGljYWxseSBwYXNzIGl0IHRvIHRoaXMgZnVuY3Rpb25cblx0ICogd2hpY2ggd2lsbCB2YWxpZGF0ZSB0aGUgaW5wdXQsIGFuZCB0aGVuIGRlcGVuZGluZyBvbiB0aGUgaW5wdXQgdHlwZSwgaXQgd2lsbCBwcmVwYXJlXG5cdCAqIHRoZSBzZXF1ZW5jZSBpbiBzb21lIHdheSB0byBnZXQgYSBzZXF1ZW5jZUdlbmVyYXRvciBvYmplY3Qgd2hpY2ggd2lsbCBiZSBhcHBlbmRlZFxuXHQgKiB0byBwcmVwYXJlZFNlcXVlbmNlc1xuXHQgKiBAcGFyYW0geyp9IHNlcU9iaiBpbmZvcm1hdGlvbiB1c2VkIHRvIHByZXBhcmUgdGhlIHJpZ2h0IHNlcXVlbmNlLCB0aGlzIHdpbGwgY29udGFpbiBhXG5cdCAqIHNlcXVlbmNlIElELCB0aGUgdHlwZSBvZiBpbnB1dCwgYW5kIHRoZSBpbnB1dCBpdHNlbGYgKHNlcXVlbmNlIG5hbWUsIGEgbGlzdCwgYW4gT0VJUyBudW1iZXIuLmV0YykuXG5cdCAqL1xuXHRjb25zdCByZWNlaXZlU2VxdWVuY2UgPSBmdW5jdGlvbiAoc2VxT2JqKSB7XG5cdFx0aWYgKChzZXFPYmouSUQgJiYgc2VxT2JqLmlucHV0VHlwZSAmJiBzZXFPYmouaW5wdXRWYWx1ZSAmJiBzZXFPYmoucGFyYW1ldGVycykgPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRjb25zb2xlLmVycm9yKFwiT25lIG9yIG1vcmUgdW5kZWZpbmVkIG1vZHVsZSBwcm9wZXJ0aWVzIHJlY2VpdmVkIGluIE5TY29yZVwiKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gV2Ugd2lsbCBwcm9jZXNzIGRpZmZlcmVudCBpbnB1dHMgaW4gZGlmZmVyZW50IHdheXNcblx0XHRcdGlmIChzZXFPYmouaW5wdXRUeXBlID09IFwiYnVpbHRJblwiKSB7XG5cdFx0XHRcdHZhbGlkYXRpb25SZXN1bHQgPSBWYWxpZGF0aW9uLmJ1aWx0SW4oc2VxT2JqKTtcblx0XHRcdFx0aWYgKHZhbGlkYXRpb25SZXN1bHQuZXJyb3JzLmxlbmd0aCAhPSAwKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHZhbGlkYXRpb25SZXN1bHQuZXJyb3JzO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHNlcU9iai5wYXJhbWV0ZXJzID0gdmFsaWRhdGlvblJlc3VsdC5wYXJzZWRGaWVsZHM7XG5cdFx0XHRcdHByZXBhcmVkU2VxdWVuY2VzW3NlcU9iai5JRF0gPSBCdWlsdEluTmFtZVRvU2VxKHNlcU9iai5JRCwgc2VxT2JqLmlucHV0VmFsdWUsIHNlcU9iai5wYXJhbWV0ZXJzKTtcblx0XHRcdH1cblx0XHRcdGlmIChzZXFPYmouaW5wdXRUeXBlID09IFwiT0VJU1wiKSB7XG5cdFx0XHRcdHZhbGlkYXRpb25SZXN1bHQgPSBWYWxpZGF0aW9uLm9laXMoc2VxT2JqKTtcblx0XHRcdFx0aWYgKHZhbGlkYXRpb25SZXN1bHQuZXJyb3JzLmxlbmd0aCAhPSAwKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHZhbGlkYXRpb25SZXN1bHQuZXJyb3JzO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHByZXBhcmVkU2VxdWVuY2VzW3NlcU9iai5JRF0gPSBPRUlTVG9TZXEoc2VxT2JqLklELCBzZXFPYmouaW5wdXRWYWx1ZSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoc2VxT2JqLmlucHV0VHlwZSA9PSBcImxpc3RcIikge1xuXHRcdFx0XHR2YWxpZGF0aW9uUmVzdWx0ID0gVmFsaWRhdGlvbi5saXN0KHNlcU9iaik7XG5cdFx0XHRcdGlmICh2YWxpZGF0aW9uUmVzdWx0LmVycm9ycy5sZW5ndGggIT0gMCkge1xuXHRcdFx0XHRcdHJldHVybiB2YWxpZGF0aW9uUmVzdWx0LmVycm9ycztcblx0XHRcdFx0fVxuXHRcdFx0XHRwcmVwYXJlZFNlcXVlbmNlc1tzZXFPYmouSURdID0gTGlzdFRvU2VxKHNlcU9iai5JRCwgc2VxT2JqLmlucHV0VmFsdWUpO1xuXG5cdFx0XHR9XG5cdFx0XHRpZiAoc2VxT2JqLmlucHV0VHlwZSA9PSBcImNvZGVcIikge1xuXHRcdFx0XHRjb25zb2xlLmVycm9yKFwiTm90IGltcGxlbWVudGVkXCIpO1xuXHRcdFx0fVxuXHRcdFx0dW5wcm9jZXNzZWRTZXF1ZW5jZXNbc2VxT2JqLklEXSA9IHNlcU9iajtcblx0XHR9XG5cdFx0cmV0dXJuIHRydWU7XG5cdH07XG5cdC8qKlxuXHQgKiBXZSBpbml0aWFsaXplIHRoZSBkcmF3aW5nIHByb2Nlc3NpbmcuIEZpcnN0IHdlIGNhbGN1bGF0ZSB0aGUgZGltZW5zaW9ucyBvZiBlYWNoIHNrZXRjaFxuXHQgKiB0aGVuIHdlIHBhaXIgdXAgc2VxdWVuY2VzIGFuZCBkcmF3aW5nIG1vZHVsZXMsIGFuZCBmaW5hbGx5IHdlIHBhc3MgdGhlbSB0byBnZW5lcmF0ZVA1XG5cdCAqIHdoaWNoIGFjdHVhbGx5IGluc3RhbnRpYXRlcyBkcmF3aW5nIG1vZHVsZXMgYW5kIGJlZ2lucyBkcmF3aW5nLlxuXHQgKiBcblx0ICogQHBhcmFtIHsqfSBzZXFWaXpQYWlycyBhIGxpc3Qgb2YgcGFpcnMgd2hlcmUgZWFjaCBwYWlyIGNvbnRhaW5zIGFuIElEIG9mIGEgc2VxdWVuY2Vcblx0ICogYW5kIGFuIElEIG9mIGEgZHJhd2luZyB0b29sLCB0aGlzIGxldHMgdXMga25vdyB0byBwYXNzIHdoaWNoIHNlcXVlbmNlIHRvIHdoaWNoXG5cdCAqIGRyYXdpbmcgdG9vbC5cblx0ICovXG5cdGNvbnN0IGJlZ2luID0gZnVuY3Rpb24gKHNlcVZpelBhaXJzKSB7XG5cdFx0aGlkZUxvZygpO1xuXG5cdFx0Ly9GaWd1cmluZyBvdXQgbGF5b3V0XG5cdFx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHRcdGxldCB0b3RhbFdpZHRoID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbnZhc0FyZWEnKS5vZmZzZXRXaWR0aDtcblx0XHRsZXQgdG90YWxIZWlnaHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzQXJlYScpLm9mZnNldEhlaWdodDtcblx0XHRsZXQgY2FudmFzQ291bnQgPSBzZXFWaXpQYWlycy5sZW5ndGg7XG5cdFx0bGV0IGdyaWRTaXplID0gTWF0aC5jZWlsKE1hdGguc3FydChjYW52YXNDb3VudCkpO1xuXHRcdGxldCBpbmRpdmlkdWFsV2lkdGggPSB0b3RhbFdpZHRoIC8gZ3JpZFNpemUgLSAyMDtcblx0XHRsZXQgaW5kaXZpZHVhbEhlaWdodCA9IHRvdGFsSGVpZ2h0IC8gZ3JpZFNpemU7XG5cdFx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cdFx0Zm9yIChsZXQgcGFpciBvZiBzZXFWaXpQYWlycykge1xuXHRcdFx0bGV0IGN1cnJlbnRTZXEgPSBwcmVwYXJlZFNlcXVlbmNlc1twYWlyLnNlcUlEXTtcblx0XHRcdGxldCBjdXJyZW50VG9vbCA9IHByZXBhcmVkVG9vbHNbcGFpci50b29sSURdO1xuXHRcdFx0aWYgKGN1cnJlbnRTZXEgPT0gdW5kZWZpbmVkIHx8IGN1cnJlbnRUb29sID09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRjb25zb2xlLmVycm9yKFwidW5kZWZpbmVkIElEIGZvciB0b29sIG9yIHNlcXVlbmNlXCIpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bGl2ZVNrZXRjaGVzLnB1c2goZ2VuZXJhdGVQNShjdXJyZW50VG9vbC5tb2R1bGUudml6LCBjdXJyZW50VG9vbC5jb25maWcsIGN1cnJlbnRTZXEsIGxpdmVTa2V0Y2hlcy5sZW5ndGgsIGluZGl2aWR1YWxXaWR0aCwgaW5kaXZpZHVhbEhlaWdodCkpO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcblxuXHRjb25zdCBtYWtlSlNPTiA9IGZ1bmN0aW9uIChzZXFWaXpQYWlycykge1xuXHRcdGlmKCB1bnByb2Nlc3NlZFNlcXVlbmNlcy5sZW5ndGggPT0gMCAmJiB1bnByb2Nlc3NlZFRvb2xzLmxlbmd0aCA9PSAwICl7XG5cdFx0XHRyZXR1cm4gXCJOb3RoaW5nIHRvIHNhdmUhXCI7XG5cdFx0fVxuXHRcdHRvU2hvdyA9IFtdO1xuXHRcdGZvciAobGV0IHBhaXIgb2Ygc2VxVml6UGFpcnMpIHtcblx0XHRcdHRvU2hvdy5wdXNoKHtcblx0XHRcdFx0c2VxOiB1bnByb2Nlc3NlZFNlcXVlbmNlc1twYWlyLnNlcUlEXSxcblx0XHRcdFx0dG9vbDogdW5wcm9jZXNzZWRUb29sc1twYWlyLnRvb2xJRF1cblx0XHRcdH0pO1xuXHRcdH1cblx0XHRyZXR1cm4gSlNPTi5zdHJpbmdpZnkodG9TaG93KTtcblx0fTtcblxuXHRjb25zdCBjbGVhciA9IGZ1bmN0aW9uICgpIHtcblx0XHRzaG93TG9nKCk7XG5cdFx0aWYgKGxpdmVTa2V0Y2hlcy5sZW5ndGggPT0gMCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGxpdmVTa2V0Y2hlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRsaXZlU2tldGNoZXNbaV0ucmVtb3ZlKCk7IC8vZGVsZXRlIGNhbnZhcyBlbGVtZW50XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xuXG5cdGNvbnN0IHBhdXNlID0gZnVuY3Rpb24gKCkge1xuXHRcdGxpdmVTa2V0Y2hlcy5mb3JFYWNoKGZ1bmN0aW9uIChza2V0Y2gpIHtcblx0XHRcdHNrZXRjaC5ub0xvb3AoKTtcblx0XHR9KTtcblx0fTtcblxuXHRjb25zdCByZXN1bWUgPSBmdW5jdGlvbiAoKSB7XG5cdFx0bGl2ZVNrZXRjaGVzLmZvckVhY2goZnVuY3Rpb24gKHNrZXRjaCkge1xuXHRcdFx0c2tldGNoLmxvb3AoKTtcblx0XHR9KTtcblx0fTtcblxuXHRjb25zdCBzdGVwID0gZnVuY3Rpb24gKCkge1xuXHRcdGxpdmVTa2V0Y2hlcy5mb3JFYWNoKGZ1bmN0aW9uIChza2V0Y2gpIHtcblx0XHRcdHNrZXRjaC5yZWRyYXcoKTtcblx0XHR9KTtcblx0fTtcblxuXHRyZXR1cm4ge1xuXHRcdHJlY2VpdmVTZXF1ZW5jZTogcmVjZWl2ZVNlcXVlbmNlLFxuXHRcdHJlY2VpdmVNb2R1bGU6IHJlY2VpdmVNb2R1bGUsXG5cdFx0bGl2ZVNrZXRjaGVzOiBsaXZlU2tldGNoZXMsXG5cdFx0cHJlcGFyZWRTZXF1ZW5jZXM6IHByZXBhcmVkU2VxdWVuY2VzLFxuXHRcdHByZXBhcmVkVG9vbHM6IHByZXBhcmVkVG9vbHMsXG5cdFx0bW9kdWxlczogbW9kdWxlcyxcblx0XHR2YWxpZE9FSVM6IHZhbGlkT0VJUyxcblx0XHRCdWlsdEluU2VxczogQnVpbHRJblNlcXMsXG5cdFx0bWFrZUpTT046IG1ha2VKU09OLFxuXHRcdGJlZ2luOiBiZWdpbixcblx0XHRwYXVzZTogcGF1c2UsXG5cdFx0cmVzdW1lOiByZXN1bWUsXG5cdFx0c3RlcDogc3RlcCxcblx0XHRjbGVhcjogY2xlYXIsXG5cdH07XG59KCk7XG5cblxuXG5cbmNvbnN0IExvZ1BhbmVsID0gZnVuY3Rpb24gKCkge1xuXHRsb2dHcmVlbiA9IGZ1bmN0aW9uIChsaW5lKSB7XG5cdFx0JChcIiNpbm5lckxvZ0FyZWFcIikuYXBwZW5kKGA8cCBzdHlsZT1cImNvbG9yOiMwMGZmMDBcIj4ke2xpbmV9PC9wPjxicj5gKTtcblx0fTtcblx0bG9nUmVkID0gZnVuY3Rpb24gKGxpbmUpIHtcblx0XHQkKFwiI2lubmVyTG9nQXJlYVwiKS5hcHBlbmQoYDxwIHN0eWxlPVwiY29sb3I6cmVkXCI+JHtsaW5lfTwvcD48YnI+YCk7XG5cdH07XG5cdGNsZWFybG9nID0gZnVuY3Rpb24gKCkge1xuXHRcdCQoXCIjaW5uZXJMb2dBcmVhXCIpLmVtcHR5KCk7XG5cdH07XG5cdGhpZGVMb2cgPSBmdW5jdGlvbiAoKSB7XG5cdFx0JChcIiNsb2dBcmVhXCIpLmNzcygnZGlzcGxheScsICdub25lJyk7XG5cdH07XG5cdHNob3dMb2cgPSBmdW5jdGlvbiAoKSB7XG5cdFx0JChcIiNsb2dBcmVhXCIpLmNzcygnZGlzcGxheScsICdibG9jaycpO1xuXHR9O1xuXHRyZXR1cm4ge1xuXHRcdGxvZ0dyZWVuOiBsb2dHcmVlbixcblx0XHRsb2dSZWQ6IGxvZ1JlZCxcblx0XHRjbGVhcmxvZzogY2xlYXJsb2csXG5cdFx0aGlkZUxvZzogaGlkZUxvZyxcblx0XHRzaG93TG9nOiBzaG93TG9nLFxuXHR9O1xufSgpO1xud2luZG93Lk5TY29yZSA9IE5TY29yZTtcbndpbmRvdy5Mb2dQYW5lbCA9IExvZ1BhbmVsO1xuIiwiU0VRVUVOQ0UgPSByZXF1aXJlKCcuL3NlcXVlbmNlcy9zZXF1ZW5jZXMuanMnKTtcblZBTElET0VJUyA9IHJlcXVpcmUoJy4vdmFsaWRPRUlTLmpzJyk7XG5NT0RVTEVTID0gcmVxdWlyZSgnLi9tb2R1bGVzL21vZHVsZXMuanMnKTtcblxuXG5jb25zdCBWYWxpZGF0aW9uID0gZnVuY3Rpb24gKCkge1xuXG5cblx0Y29uc3QgbGlzdEVycm9yID0gZnVuY3Rpb24gKHRpdGxlKSB7XG5cdFx0bGV0IG1zZyA9IFwiY2FuJ3QgcGFyc2UgdGhlIGxpc3QsIHBsZWFzZSBwYXNzIG51bWJlcnMgc2VwZXJhdGVkIGJ5IGNvbW1hcyAoZXhhbXBsZTogMSwyLDMpXCI7XG5cdFx0aWYgKHRpdGxlICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0bXNnID0gdGl0bGUgKyBcIjogXCIgKyBtc2c7XG5cdFx0fVxuXHRcdHJldHVybiBtc2c7XG5cdH07XG5cblx0Y29uc3QgcmVxdWlyZWRFcnJvciA9IGZ1bmN0aW9uICh0aXRsZSkge1xuXHRcdHJldHVybiBgJHt0aXRsZX06IHRoaXMgaXMgYSByZXF1aXJlZCB2YWx1ZSwgZG9uJ3QgbGVhdmUgaXQgZW1wdHkhYDtcblx0fTtcblxuXHRjb25zdCB0eXBlRXJyb3IgPSBmdW5jdGlvbiAodGl0bGUsIHZhbHVlLCBleHBlY3RlZFR5cGUpIHtcblx0XHRyZXR1cm4gYCR7dGl0bGV9OiAke3ZhbHVlfSBpcyBhICR7dHlwZW9mKHZhbHVlKX0sIGV4cGVjdGVkIGEgJHtleHBlY3RlZFR5cGV9LiBgO1xuXHR9O1xuXG5cdGNvbnN0IG9laXNFcnJvciA9IGZ1bmN0aW9uIChjb2RlKSB7XG5cdFx0cmV0dXJuIGAke2NvZGV9OiBFaXRoZXIgYW4gaW52YWxpZCBPRUlTIGNvZGUgb3Igbm90IGRlZmluZWQgYnkgc2FnZSFgO1xuXHR9O1xuXG5cdGNvbnN0IGJ1aWx0SW4gPSBmdW5jdGlvbiAoc2VxT2JqKSB7XG5cdFx0bGV0IHNjaGVtYSA9IFNFUVVFTkNFLkJ1aWx0SW5TZXFzW3NlcU9iai5pbnB1dFZhbHVlXS5wYXJhbXNTY2hlbWE7XG5cdFx0bGV0IHJlY2VpdmVkUGFyYW1zID0gc2VxT2JqLnBhcmFtZXRlcnM7XG5cblx0XHRsZXQgdmFsaWRhdGlvblJlc3VsdCA9IHtcblx0XHRcdHBhcnNlZEZpZWxkczoge30sXG5cdFx0XHRlcnJvcnM6IFtdXG5cdFx0fTtcblx0XHRPYmplY3Qua2V5cyhyZWNlaXZlZFBhcmFtcykuZm9yRWFjaChcblx0XHRcdChwYXJhbWV0ZXIpID0+IHtcblx0XHRcdFx0dmFsaWRhdGVGcm9tU2NoZW1hKHNjaGVtYSwgcGFyYW1ldGVyLCByZWNlaXZlZFBhcmFtc1twYXJhbWV0ZXJdLCB2YWxpZGF0aW9uUmVzdWx0KTtcblx0XHRcdH1cblx0XHQpO1xuXHRcdHJldHVybiB2YWxpZGF0aW9uUmVzdWx0O1xuXHR9O1xuXG5cdGNvbnN0IG9laXMgPSBmdW5jdGlvbiAoc2VxT2JqKSB7XG5cdFx0bGV0IHZhbGlkYXRpb25SZXN1bHQgPSB7XG5cdFx0XHRwYXJzZWRGaWVsZHM6IHt9LFxuXHRcdFx0ZXJyb3JzOiBbXVxuXHRcdH07XG5cdFx0c2VxT2JqLmlucHV0VmFsdWUgPSBzZXFPYmouaW5wdXRWYWx1ZS50cmltKCk7XG5cdFx0bGV0IG9laXNDb2RlID0gc2VxT2JqLmlucHV0VmFsdWU7XG5cdFx0aWYgKCFWQUxJRE9FSVMuaW5jbHVkZXMob2Vpc0NvZGUpKSB7XG5cdFx0XHR2YWxpZGF0aW9uUmVzdWx0LmVycm9ycy5wdXNoKG9laXNFcnJvcihvZWlzQ29kZSkpO1xuXHRcdH1cblx0XHRyZXR1cm4gdmFsaWRhdGlvblJlc3VsdDtcblx0fTtcblxuXHRjb25zdCBsaXN0ID0gZnVuY3Rpb24gKHNlcU9iaikge1xuXHRcdGxldCB2YWxpZGF0aW9uUmVzdWx0ID0ge1xuXHRcdFx0cGFyc2VkRmllbGRzOiB7fSxcblx0XHRcdGVycm9yczogW11cblx0XHR9O1xuXHRcdHRyeSB7XG5cdFx0XHRpZiAodHlwZW9mIHNlcU9iai5pbnB1dFZhbHVlID09IFN0cmluZykgc2VxT2JqLmlucHV0VmFsdWUgPSBKU09OLnBhcnNlKHNlcU9iai5pbnB1dFZhbHVlKTtcblx0XHR9IGNhdGNoIChlcnIpIHtcblx0XHRcdHZhbGlkYXRpb25SZXN1bHQuZXJyb3JzLnB1c2gobGlzdEVycm9yKCkpO1xuXHRcdH1cblx0XHRyZXR1cm4gdmFsaWRhdGlvblJlc3VsdDtcblx0fTtcblxuXHRjb25zdCBfbW9kdWxlID0gZnVuY3Rpb24gKG1vZHVsZU9iaikge1xuXHRcdGxldCBzY2hlbWEgPSBNT0RVTEVTW21vZHVsZU9iai5tb2R1bGVLZXldLmNvbmZpZ1NjaGVtYTtcblx0XHRsZXQgcmVjZWl2ZWRDb25maWcgPSBtb2R1bGVPYmouY29uZmlnO1xuXG5cdFx0bGV0IHZhbGlkYXRpb25SZXN1bHQgPSB7XG5cdFx0XHRwYXJzZWRGaWVsZHM6IHt9LFxuXHRcdFx0ZXJyb3JzOiBbXVxuXHRcdH07XG5cblx0XHRPYmplY3Qua2V5cyhyZWNlaXZlZENvbmZpZykuZm9yRWFjaChcblx0XHRcdChjb25maWdGaWVsZCkgPT4ge1xuXHRcdFx0XHR2YWxpZGF0ZUZyb21TY2hlbWEoc2NoZW1hLCBjb25maWdGaWVsZCwgcmVjZWl2ZWRDb25maWdbY29uZmlnRmllbGRdLCB2YWxpZGF0aW9uUmVzdWx0KTtcblx0XHRcdH1cblx0XHQpO1xuXHRcdHJldHVybiB2YWxpZGF0aW9uUmVzdWx0O1xuXHR9O1xuXG5cdGNvbnN0IHZhbGlkYXRlRnJvbVNjaGVtYSA9IGZ1bmN0aW9uIChzY2hlbWEsIGZpZWxkLCB2YWx1ZSwgdmFsaWRhdGlvblJlc3VsdCkge1xuXHRcdGxldCB0aXRsZSA9IHNjaGVtYVtmaWVsZF0udGl0bGU7XG5cdFx0aWYgKHR5cGVvZiAodmFsdWUpID09IFwic3RyaW5nXCIpIHtcblx0XHRcdHZhbHVlID0gdmFsdWUudHJpbSgpO1xuXHRcdH1cblx0XHRsZXQgZXhwZWN0ZWRUeXBlID0gc2NoZW1hW2ZpZWxkXS50eXBlO1xuXHRcdGxldCByZXF1aXJlZCA9IChzY2hlbWFbZmllbGRdLnJlcXVpcmVkICE9PSB1bmRlZmluZWQpID8gc2NoZW1hW2ZpZWxkXS5yZXF1aXJlZCA6IGZhbHNlO1xuXHRcdGxldCBmb3JtYXQgPSAoc2NoZW1hW2ZpZWxkXS5mb3JtYXQgIT09IHVuZGVmaW5lZCkgPyBzY2hlbWFbZmllbGRdLmZvcm1hdCA6IGZhbHNlO1xuXHRcdGxldCBpc0VtcHR5ID0gKHZhbHVlID09PSAnJyk7XG5cdFx0aWYgKHJlcXVpcmVkICYmIGlzRW1wdHkpIHtcblx0XHRcdHZhbGlkYXRpb25SZXN1bHQuZXJyb3JzLnB1c2gocmVxdWlyZWRFcnJvcih0aXRsZSkpO1xuXHRcdH1cblx0XHRpZiAoaXNFbXB0eSkge1xuXHRcdFx0cGFyc2VkID0gJyc7XG5cdFx0fVxuXHRcdGlmICghaXNFbXB0eSAmJiAoZXhwZWN0ZWRUeXBlID09IFwibnVtYmVyXCIpKSB7XG5cdFx0XHRwYXJzZWQgPSBwYXJzZUludCh2YWx1ZSk7XG5cdFx0XHRpZiAocGFyc2VkICE9IHBhcnNlZCkgeyAvLyBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8zNDI2MTkzOC93aGF0LWlzLXRoZS1kaWZmZXJlbmNlLWJldHdlZW4tbmFuLW5hbi1hbmQtbmFuLW5hblxuXHRcdFx0XHR2YWxpZGF0aW9uUmVzdWx0LmVycm9ycy5wdXNoKHR5cGVFcnJvcih0aXRsZSwgdmFsdWUsIGV4cGVjdGVkVHlwZSkpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAoIWlzRW1wdHkgJiYgKGV4cGVjdGVkVHlwZSA9PSBcInN0cmluZ1wiKSkge1xuXHRcdFx0cGFyc2VkID0gdmFsdWU7XG5cdFx0fVxuXHRcdGlmICghaXNFbXB0eSAmJiAoZXhwZWN0ZWRUeXBlID09IFwiYm9vbGVhblwiKSkge1xuXHRcdFx0aWYgKHZhbHVlID09ICcxJykge1xuXHRcdFx0XHRwYXJzZWQgPSB0cnVlO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cGFyc2VkID0gZmFsc2U7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmIChmb3JtYXQgJiYgKGZvcm1hdCA9PSBcImxpc3RcIikpIHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdHBhcnNlZCA9IEpTT04ucGFyc2UoXCJbXCIgKyB2YWx1ZSArIFwiXVwiKTtcblx0XHRcdH0gY2F0Y2ggKGVycikge1xuXHRcdFx0XHR2YWxpZGF0aW9uUmVzdWx0LmVycm9ycy5wdXNoKGxpc3RFcnJvcih0aXRsZSkpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAocGFyc2VkICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdHZhbGlkYXRpb25SZXN1bHQucGFyc2VkRmllbGRzW2ZpZWxkXSA9IHBhcnNlZDtcblx0XHR9XG5cdH07XG5cblx0cmV0dXJuIHtcblx0XHRidWlsdEluOiBidWlsdEluLFxuXHRcdG9laXM6IG9laXMsXG5cdFx0bGlzdDogbGlzdCxcblx0XHRtb2R1bGU6IF9tb2R1bGVcblx0fTtcbn0oKTtcblxubW9kdWxlLmV4cG9ydHMgPSBWYWxpZGF0aW9uO1xuIiwiLypcbiAgICB2YXIgbGlzdD1bMiwgMywgNSwgNywgMTEsIDEzLCAxNywgMTksIDIzLCAyOSwgMzEsIDM3LCA0MSwgNDMsIDQ3LCA1MywgNTksIDYxLCA2NywgNzEsIDczLCA3OSwgODMsIDg5LCA5NywgMTAxLCAxMDMsIDEwNywgMTA5LCAxMTMsIDEyNywgMTMxLCAxMzcsIDEzOSwgMTQ5LCAxNTEsIDE1NywgMTYzLCAxNjcsIDE3MywgMTc5LCAxODEsIDE5MSwgMTkzLCAxOTcsIDE5OSwgMjExLCAyMjMsIDIyNywgMjI5LCAyMzMsIDIzOSwgMjQxLCAyNTEsIDI1NywgMjYzLCAyNjksIDI3MSwgMjc3LCAyODEsIDI4MywgMjkzLCAzMDcsIDMxMSwgMzEzLCAzMTcsIDMzMSwgMzM3LCAzNDcsIDM0OSwgMzUzLCAzNTksIDM2NywgMzczLCAzNzksIDM4MywgMzg5LCAzOTcsIDQwMSwgNDA5LCA0MTksIDQyMSwgNDMxLCA0MzMsIDQzOSwgNDQzLCA0NDksIDQ1NywgNDYxLCA0NjMsIDQ2NywgNDc5LCA0ODcsIDQ5MSwgNDk5LCA1MDMsIDUwOSwgNTIxLCA1MjMsIDU0MSwgNTQ3LCA1NTcsIDU2MywgNTY5LCA1NzEsIDU3NywgNTg3LCA1OTMsIDU5OSwgNjAxLCA2MDcsIDYxMywgNjE3LCA2MTksIDYzMSwgNjQxLCA2NDMsIDY0NywgNjUzLCA2NTksIDY2MSwgNjczLCA2NzcsIDY4MywgNjkxLCA3MDEsIDcwOSwgNzE5LCA3MjcsIDczMywgNzM5LCA3NDMsIDc1MSwgNzU3LCA3NjEsIDc2OSwgNzczLCA3ODcsIDc5NywgODA5LCA4MTEsIDgyMSwgODIzLCA4MjcsIDgyOSwgODM5LCA4NTMsIDg1NywgODU5LCA4NjMsIDg3NywgODgxLCA4ODMsIDg4NywgOTA3LCA5MTEsIDkxOSwgOTI5LCA5MzcsIDk0MSwgOTQ3LCA5NTMsIDk2NywgOTcxLCA5NzcsIDk4MywgOTkxLCA5OTcsIDEwMDksIDEwMTMsIDEwMTksIDEwMjEsIDEwMzEsIDEwMzMsIDEwMzksIDEwNDksIDEwNTEsIDEwNjEsIDEwNjMsIDEwNjksIDEwODcsIDEwOTEsIDEwOTMsIDEwOTcsIDExMDMsIDExMDksIDExMTcsIDExMjMsIDExMjksIDExNTEsIDExNTMsIDExNjMsIDExNzEsIDExODEsIDExODcsIDExOTMsIDEyMDEsIDEyMTMsIDEyMTcsIDEyMjNdO1xuXG4qL1xuXG5jbGFzcyBWSVpfRGlmZmVyZW5jZXMge1xuXHRjb25zdHJ1Y3RvcihzZXEsIHNrZXRjaCwgY29uZmlnKSB7XG5cblx0XHR0aGlzLm4gPSBjb25maWcubjsgLy9uIGlzIG51bWJlciBvZiB0ZXJtcyBvZiB0b3Agc2VxdWVuY2Vcblx0XHR0aGlzLmxldmVscyA9IGNvbmZpZy5MZXZlbHM7IC8vbGV2ZWxzIGlzIG51bWJlciBvZiBsYXllcnMgb2YgdGhlIHB5cmFtaWQvdHJhcGV6b2lkIGNyZWF0ZWQgYnkgd3JpdGluZyB0aGUgZGlmZmVyZW5jZXMuXG5cdFx0dGhpcy5zZXEgPSBzZXE7XG5cdFx0dGhpcy5za2V0Y2ggPSBza2V0Y2g7XG5cdH1cblxuXHRkcmF3RGlmZmVyZW5jZXMobiwgbGV2ZWxzLCBzZXF1ZW5jZSkge1xuXG5cdFx0Ly9jaGFuZ2VkIGJhY2tncm91bmQgY29sb3IgdG8gZ3JleSBzaW5jZSB5b3UgY2FuJ3Qgc2VlIHdoYXQncyBnb2luZyBvblxuXHRcdHRoaXMuc2tldGNoLmJhY2tncm91bmQoJ2JsYWNrJyk7XG5cblx0XHRuID0gTWF0aC5taW4obiwgc2VxdWVuY2UubGVuZ3RoKTtcblx0XHRsZXZlbHMgPSBNYXRoLm1pbihsZXZlbHMsIG4gLSAxKTtcblx0XHRsZXQgZm9udCwgZm9udFNpemUgPSAyMDtcblx0XHR0aGlzLnNrZXRjaC50ZXh0Rm9udChcIkFyaWFsXCIpO1xuXHRcdHRoaXMuc2tldGNoLnRleHRTaXplKGZvbnRTaXplKTtcblx0XHR0aGlzLnNrZXRjaC50ZXh0U3R5bGUodGhpcy5za2V0Y2guQk9MRCk7XG5cdFx0bGV0IHhEZWx0YSA9IDUwO1xuXHRcdGxldCB5RGVsdGEgPSA1MDtcblx0XHRsZXQgZmlyc3RYID0gMzA7XG5cdFx0bGV0IGZpcnN0WSA9IDMwO1xuXHRcdHRoaXMuc2tldGNoLmNvbG9yTW9kZSh0aGlzLnNrZXRjaC5IU0IsIDI1NSk7XG5cdFx0bGV0IG15Q29sb3IgPSB0aGlzLnNrZXRjaC5jb2xvcigxMDAsIDI1NSwgMTUwKTtcblx0XHRsZXQgaHVlO1xuXG5cdFx0bGV0IHdvcmtpbmdTZXF1ZW5jZSA9IFtdO1xuXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLm47IGkrKykge1xuXHRcdFx0d29ya2luZ1NlcXVlbmNlLnB1c2goc2VxdWVuY2UuZ2V0RWxlbWVudChpKSk7IC8vd29ya2luZ1NlcXVlbmNlIGNhbm5pYmFsaXplcyBmaXJzdCBuIGVsZW1lbnRzIG9mIHNlcXVlbmNlLlxuXHRcdH1cblxuXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmxldmVsczsgaSsrKSB7XG5cdFx0XHRodWUgPSAoaSAqIDI1NSAvIDYpICUgMjU1O1xuXHRcdFx0bXlDb2xvciA9IHRoaXMuc2tldGNoLmNvbG9yKGh1ZSwgMTUwLCAyMDApO1xuXHRcdFx0dGhpcy5za2V0Y2guZmlsbChteUNvbG9yKTtcblx0XHRcdGZvciAobGV0IGogPSAwOyBqIDwgd29ya2luZ1NlcXVlbmNlLmxlbmd0aDsgaisrKSB7XG5cdFx0XHRcdHRoaXMuc2tldGNoLnRleHQod29ya2luZ1NlcXVlbmNlW2pdLCBmaXJzdFggKyBqICogeERlbHRhLCBmaXJzdFkgKyBpICogeURlbHRhKTsgLy9EcmF3cyBhbmQgdXBkYXRlcyB3b3JraW5nU2VxdWVuY2Ugc2ltdWx0YW5lb3VzbHkuXG5cdFx0XHRcdGlmIChqIDwgd29ya2luZ1NlcXVlbmNlLmxlbmd0aCAtIDEpIHtcblx0XHRcdFx0XHR3b3JraW5nU2VxdWVuY2Vbal0gPSB3b3JraW5nU2VxdWVuY2VbaiArIDFdIC0gd29ya2luZ1NlcXVlbmNlW2pdO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHdvcmtpbmdTZXF1ZW5jZS5sZW5ndGggPSB3b3JraW5nU2VxdWVuY2UubGVuZ3RoIC0gMTsgLy9SZW1vdmVzIGxhc3QgZWxlbWVudC5cblx0XHRcdGZpcnN0WCA9IGZpcnN0WCArICgxIC8gMikgKiB4RGVsdGE7IC8vTW92ZXMgbGluZSBmb3J3YXJkIGhhbGYgZm9yIHB5cmFtaWQgc2hhcGUuXG5cblx0XHR9XG5cblx0fVxuXHRzZXR1cCgpIHt9XG5cdGRyYXcoKSB7XG5cdFx0dGhpcy5kcmF3RGlmZmVyZW5jZXModGhpcy5uLCB0aGlzLmxldmVscywgdGhpcy5zZXEpO1xuXHRcdHRoaXMuc2tldGNoLm5vTG9vcCgpO1xuXHR9XG59XG5cblxuXG5jb25zdCBTQ0hFTUFfRGlmZmVyZW5jZXMgPSB7XG5cdG46IHtcblx0XHR0eXBlOiAnbnVtYmVyJyxcblx0XHR0aXRsZTogJ04nLFxuXHRcdGRlc2NyaXB0aW9uOiAnTnVtYmVyIG9mIGVsZW1lbnRzJyxcblx0XHRyZXF1aXJlZDogdHJ1ZVxuXHR9LFxuXHRMZXZlbHM6IHtcblx0XHR0eXBlOiAnbnVtYmVyJyxcblx0XHR0aXRsZTogJ0xldmVscycsXG5cdFx0ZGVzY3JpcHRpb246ICdOdW1iZXIgb2YgbGV2ZWxzJyxcblx0XHRyZXF1aXJlZDogdHJ1ZVxuXHR9LFxufTtcblxuY29uc3QgTU9EVUxFX0RpZmZlcmVuY2VzID0ge1xuXHR2aXo6IFZJWl9EaWZmZXJlbmNlcyxcblx0bmFtZTogXCJEaWZmZXJlbmNlc1wiLFxuXHRkZXNjcmlwdGlvbjogXCJcIixcblx0Y29uZmlnU2NoZW1hOiBTQ0hFTUFfRGlmZmVyZW5jZXNcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBNT0RVTEVfRGlmZmVyZW5jZXM7XG4iLCJcblxuXG5cbmZ1bmN0aW9uIGNvbnN0cmFpbih2YWwsIG1pbl92YWwsIG1heF92YWwpIHtcbiAgICAgICAgcmV0dXJuIE1hdGgubWluKG1heF92YWwsIE1hdGgubWF4KG1pbl92YWwsIHZhbCkpO1xufVxuXG5mdW5jdGlvbiBkZWdyZWVzX3RvX3JhZGlhbnMoZGVncmVlcykge1xuICB2YXIgcGkgPSBNYXRoLlBJO1xuICByZXR1cm4gZGVncmVlcyAqIChwaS8xODApO1xufVxuXG5jbGFzcyBMaW5lIHtcbiAgICAgICAgY29uc3RydWN0b3IoeDAsIHgxLCB5MCwgeTEpIHtcbiAgICAgICAgICB0aGlzLngwID0geDA7XG4gICAgICAgICAgdGhpcy54MSA9IHgxO1xuICAgICAgICAgIHRoaXMueTAgPSB5MDtcbiAgICAgICAgICB0aGlzLnkxID0geTE7XG4gICAgICAgIH1cblxuICAgICAgICBkcmF3KHNrZXRjaCkge1xuICAgICAgICAgICAgICAgIHZhciB4MF8gPSBjb25zdHJhaW4oTWF0aC5yb3VuZCh0aGlzLngwKSwgMCwgc2tldGNoLndpZHRoIC0gMSk7XG4gICAgICAgICAgICAgICAgdmFyIHgxXyA9IGNvbnN0cmFpbihNYXRoLnJvdW5kKHRoaXMueDEpLCAwLCBza2V0Y2gud2lkdGggLSAxKTtcbiAgICAgICAgICAgICAgICB2YXIgeTBfID0gY29uc3RyYWluKE1hdGgucm91bmQodGhpcy55MCksIDAsIHNrZXRjaC5oZWlnaHQgLSAxKTtcbiAgICAgICAgICAgICAgICB2YXIgeTFfID0gY29uc3RyYWluKE1hdGgucm91bmQodGhpcy55MSksIDAsIHNrZXRjaC5oZWlnaHQgLSAxKTtcbiAgICAgICAgICAgICAgICBza2V0Y2gubGluZSh4MF8sIHkwXywgeDFfLCB5MV8pXG4gICAgICAgIH1cbn1cblxuXG5cbmNsYXNzIFZJWl9GcmFjdGFsTWFwIHtcbiAgICBjb25zdHJ1Y3RvcihzZXEsIHNrZXRjaCwgY29uZmlnKXtcbiAgICAgICAgdGhpcy5zZXEgPSBzZXFcbiAgICAgICAgdGhpcy5za2V0Y2ggPSBza2V0Y2hcbiAgICAgICAgdGhpcy5pdHRlcnMgPSAxNDtcbiAgICAgICAgY29uc29sZS5sb2coXCJoZXJlMjJcIik7XG4gICAgfVxuICAgIHNldHVwKCl7XG4gICAgICAgIHRoaXMubGluZXMgPSBbXVxuICAgICAgICB0aGlzLm9yaWdpbl95ID0gdGhpcy5za2V0Y2guaGVpZ2h0IC8gMjtcbiAgICAgICAgdGhpcy5vcmlnaW5feCA9IHRoaXMuc2tldGNoLndpZHRoIC8gMjtcbiAgICB9XG4gICAgICAgIFxuICAgIGRyYXdfbmV4dCh4MCwgeDEsIHkwLCB5MSwgbnVtLCBmcmFjXzEsIGZyYWNfMiwgYW5nbGVfMSwgYW5nbGVfMiwgc2VxdWVuY2Upe1xuICAgICAgICBudW0gPSBudW0gLSAxO1xuICAgICAgICBpZihudW0gPD0gMCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEJlc3QgdG8gc3dpdGNoIHRvIGEgbnVtZXJpY2FsIGxpYnJhcnlcbiAgICAgICAgbGV0IEEgPSBbeDEgLSB4MCwgeTEgLSB5MF07XG4gICAgICAgIC8vIHZhciBtYWcgPSBNYXRoLnNxcnQoQVswXSAqIEFbMF0gKyBBWzFdICogQVsxXSk7XG4gICAgICAgIC8vIEFbMF0gPSBBWzBdIC8gbWFnO1xuICAgICAgICAvLyBBWzFdID0gQVsxXSAvIG1hZztcbiAgICAgICAgLy9cblxuXG4gICAgICAgIC8vIFR3byByb3RhdGlvbiBtYXRyaWNlcyBmb3IgbGVmdCBcbiAgICAgICAgLy8gYW5kIHJpZ2h0IGJyYW5jaGVzIHJlc3BlY3RpdmVseVxuICAgICAgICBsZXQgUjEgPSBbW01hdGguY29zKGFuZ2xlXzEpLCAtTWF0aC5zaW4oYW5nbGVfMSldLCBbTWF0aC5zaW4oYW5nbGVfMSksIE1hdGguY29zKGFuZ2xlXzEpXV07XG4gICAgICAgIGxldCBSMiA9IFtbTWF0aC5jb3MoLWFuZ2xlXzIpLCAtTWF0aC5zaW4oLWFuZ2xlXzIpXSwgW01hdGguc2luKC1hbmdsZV8yKSwgTWF0aC5jb3MoLWFuZ2xlXzIpXV07XG5cbiAgICAgICAgdGhpcy5saW5lcy5wdXNoKG5ldyBMaW5lKHgwLCB4MSwgeTAsIHkxKSk7XG4gICAgICAgIFxuICAgICAgICBsZXQgcmlnaHQgPSBbMCwgMF07XG4gICAgICAgIGxldCBsZWZ0ID0gWzAsIDBdO1xuICAgICAgICBcbiAgICAgICAgLy8gbWFudWFsIG1hdHJpeCBtdWx0aXBsaWNhdGlvblxuICAgICAgICByaWdodFswXSA9IHgxICsgZnJhY18xICogKFIxWzBdWzBdICogQVswXSArIFIxWzBdWzFdICogQVsxXSk7XG4gICAgICAgIHJpZ2h0WzFdID0geTEgKyBmcmFjXzEgKiAoUjFbMV1bMF0gKiBBWzBdICsgUjFbMV1bMV0gKiBBWzFdKTtcbiAgICAgICAgbGVmdFswXSA9IHgxICsgZnJhY18yICogKFIyWzBdWzBdICogQVswXSArIFIyWzBdWzFdICogQVsxXSk7XG4gICAgICAgIGxlZnRbMV0gPSB5MSArIGZyYWNfMiAqIChSMlsxXVswXSAqIEFbMF0gKyBSMlsxXVsxXSAqIEFbMV0pO1xuXG4gICAgICAgIFxuICAgICAgICAvLyBmcmFjXzEgPSBzZXF1ZW5jZS5nZXRFbGVtZW50KHRoaXMuaXR0ZXJzIC0gbnVtKSAvIHNlcXVlbmNlLmdldEVsZW1lbnQodGhpcy5pdHRlcnMgLSBudW0gKyAxKTtcbiAgICAgICAgLy8gZnJhY18yID0gc2VxdWVuY2UuZ2V0RWxlbWVudCh0aGlzLml0dGVycyAtIG51bSkgLyBzZXF1ZW5jZS5nZXRFbGVtZW50KHRoaXMuaXR0ZXJzIC0gbnVtICsgMSk7XG5cbiAgICAgICAgYW5nbGVfMSArPSBzZXF1ZW5jZS5nZXRFbGVtZW50KHRoaXMuaXR0ZXJzIC0gbnVtKTtcbiAgICAgICAgYW5nbGVfMiArPSBzZXF1ZW5jZS5nZXRFbGVtZW50KHRoaXMuaXR0ZXJzIC0gbnVtKTtcblxuICAgICAgICAvLyBSZWN1cnNpdmUgc3RlcFxuICAgICAgICB0aGlzLmRyYXdfbmV4dCh4MSwgcmlnaHRbMF0sIHkxLCByaWdodFsxXSwgbnVtLCBmcmFjXzEsIGZyYWNfMiwgYW5nbGVfMSwgYW5nbGVfMiwgc2VxdWVuY2UpO1xuICAgICAgICB0aGlzLmRyYXdfbmV4dCh4MSwgbGVmdFswXSwgeTEsIGxlZnRbMV0sIG51bSwgZnJhY18xLCBmcmFjXzIsIGFuZ2xlXzEsIGFuZ2xlXzIsIHNlcXVlbmNlKTtcbiAgICB9XG5cbiAgICBkcmF3KCl7XG4gICAgICAgIHZhciBhbmdsZV8xID0gZGVncmVlc190b19yYWRpYW5zKDkwKTtcbiAgICAgICAgdmFyIGFuZ2xlXzIgPSBkZWdyZWVzX3RvX3JhZGlhbnMoOTApO1xuICAgICAgICB2YXIgZnJhY18xID0gMC42O1xuICAgICAgICB2YXIgZnJhY18yID0gMC42O1xuXG4gICAgICAgIHRoaXMuZHJhd19uZXh0KHRoaXMuc2tldGNoLndpZHRoIC8gMiAtIDEsIHRoaXMub3JpZ2luX3ggLSAxLCB0aGlzLnNrZXRjaC5oZWlnaHQgLSAxLCB0aGlzLm9yaWdpbl95IC0gMSwgdGhpcy5pdHRlcnMsIGZyYWNfMSwgZnJhY18yLCBhbmdsZV8xLCBhbmdsZV8yLCB0aGlzLnNlcSk7XG5cbiAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IHRoaXMubGluZXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmxpbmVzW2ldLmRyYXcodGhpcy5za2V0Y2gpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5za2V0Y2gubm9Mb29wKCk7XG4gICAgfVxufVxuXG5jb25zdCBTQ0hFTUFfRnJhY3RhbE1hcCA9IHtcbiAgICAgICAgbjoge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgIHRpdGxlOiAnTicsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdOdW1iZXIgb2YgZWxlbWVudHMnLFxuICAgICAgICAgICAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIExldmVsczoge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgIHRpdGxlOiAnTGV2ZWxzJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ051bWJlciBvZiBsZXZlbHMnLFxuICAgICAgICAgICAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgICAgIH0sXG59O1xuXG5jb25zdCBNT0RVTEVfRnJhY3RhbE1hcCA9IHtcbiAgICB2aXo6IFZJWl9GcmFjdGFsTWFwLFxuICAgIG5hbWU6ICdGcmFjdGFsTWFwJyxcbiAgICBkZXNjcmlwdGlvbjogJycsXG4gICAgY29uZmlnU2NoZW1hOiBTQ0hFTUFfRnJhY3RhbE1hcFxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNT0RVTEVfRnJhY3RhbE1hcFxuICAgIFxuIiwiLy9BbiBleGFtcGxlIG1vZHVsZVxuXG5cbmNsYXNzIFZJWl9Nb2RGaWxsIHtcblx0Y29uc3RydWN0b3Ioc2VxLCBza2V0Y2gsIGNvbmZpZykge1xuXHRcdHRoaXMuc2tldGNoID0gc2tldGNoO1xuXHRcdHRoaXMuc2VxID0gc2VxO1xuXHRcdHRoaXMubW9kRGltZW5zaW9uID0gY29uZmlnLm1vZERpbWVuc2lvbjtcblx0XHR0aGlzLmkgPSAwO1xuXHR9XG5cblx0ZHJhd05ldyhudW0sIHNlcSkge1xuXHRcdGxldCBibGFjayA9IHRoaXMuc2tldGNoLmNvbG9yKDApO1xuXHRcdHRoaXMuc2tldGNoLmZpbGwoYmxhY2spO1xuXHRcdGxldCBpO1xuXHRcdGxldCBqO1xuXHRcdGZvciAobGV0IG1vZCA9IDE7IG1vZCA8PSB0aGlzLm1vZERpbWVuc2lvbjsgbW9kKyspIHtcblx0XHRcdGkgPSBzZXEuZ2V0RWxlbWVudChudW0pICUgbW9kO1xuXHRcdFx0aiA9IG1vZCAtIDE7XG5cdFx0XHR0aGlzLnNrZXRjaC5yZWN0KGogKiB0aGlzLnJlY3RXaWR0aCwgdGhpcy5za2V0Y2guaGVpZ2h0IC0gKGkgKyAxKSAqIHRoaXMucmVjdEhlaWdodCwgdGhpcy5yZWN0V2lkdGgsIHRoaXMucmVjdEhlaWdodCk7XG5cdFx0fVxuXG5cdH1cblxuXHRzZXR1cCgpIHtcblx0XHR0aGlzLnJlY3RXaWR0aCA9IHRoaXMuc2tldGNoLndpZHRoIC8gdGhpcy5tb2REaW1lbnNpb247XG5cdFx0dGhpcy5yZWN0SGVpZ2h0ID0gdGhpcy5za2V0Y2guaGVpZ2h0IC8gdGhpcy5tb2REaW1lbnNpb247XG5cdFx0dGhpcy5za2V0Y2gubm9TdHJva2UoKTtcblx0fVxuXG5cdGRyYXcoKSB7XG5cdFx0dGhpcy5kcmF3TmV3KHRoaXMuaSwgdGhpcy5zZXEpO1xuXHRcdHRoaXMuaSsrO1xuXHRcdGlmIChpID09IDEwMDApIHtcblx0XHRcdHRoaXMuc2tldGNoLm5vTG9vcCgpO1xuXHRcdH1cblx0fVxuXG59XG5cbmNvbnN0IFNDSEVNQV9Nb2RGaWxsID0ge1xuXHRtb2REaW1lbnNpb246IHtcblx0XHR0eXBlOiBcIm51bWJlclwiLFxuXHRcdHRpdGxlOiBcIk1vZCBkaW1lbnNpb25cIixcblx0XHRkZXNjcmlwdGlvbjogXCJcIixcblx0XHRyZXF1aXJlZDogdHJ1ZVxuXHR9XG59O1xuXG5cbmNvbnN0IE1PRFVMRV9Nb2RGaWxsID0ge1xuXHR2aXo6IFZJWl9Nb2RGaWxsLFxuXHRuYW1lOiBcIk1vZCBGaWxsXCIsXG5cdGRlc2NyaXB0aW9uOiBcIlwiLFxuXHRjb25maWdTY2hlbWE6IFNDSEVNQV9Nb2RGaWxsXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1PRFVMRV9Nb2RGaWxsOyIsImNsYXNzIFZJWl9zaGlmdENvbXBhcmUge1xuXHRjb25zdHJ1Y3RvcihzZXEsIHNrZXRjaCwgY29uZmlnKSB7XG5cdFx0Ly9Ta2V0Y2ggaXMgeW91ciBjYW52YXNcblx0XHQvL2NvbmZpZyBpcyB0aGUgcGFyYW1ldGVycyB5b3UgZXhwZWN0XG5cdFx0Ly9zZXEgaXMgdGhlIHNlcXVlbmNlIHlvdSBhcmUgZHJhd2luZ1xuXHRcdHRoaXMuc2tldGNoID0gc2tldGNoO1xuXHRcdHRoaXMuc2VxID0gc2VxO1xuXHRcdHRoaXMuTU9EID0gMjtcblx0XHQvLyBTZXQgdXAgdGhlIGltYWdlIG9uY2UuXG5cdH1cblxuXG5cdHNldHVwKCkge1xuXHRcdGNvbnNvbGUubG9nKHRoaXMuc2tldGNoLmhlaWdodCwgdGhpcy5za2V0Y2gud2lkdGgpO1xuXHRcdHRoaXMuaW1nID0gdGhpcy5za2V0Y2guY3JlYXRlSW1hZ2UodGhpcy5za2V0Y2gud2lkdGgsIHRoaXMuc2tldGNoLmhlaWdodCk7XG5cdFx0dGhpcy5pbWcubG9hZFBpeGVscygpOyAvLyBFbmFibGVzIHBpeGVsLWxldmVsIGVkaXRpbmcuXG5cdH1cblxuXHRjbGlwKGEsIG1pbiwgbWF4KSB7XG5cdFx0aWYgKGEgPCBtaW4pIHtcblx0XHRcdHJldHVybiBtaW47XG5cdFx0fSBlbHNlIGlmIChhID4gbWF4KSB7XG5cdFx0XHRyZXR1cm4gbWF4O1xuXHRcdH1cblx0XHRyZXR1cm4gYTtcblx0fVxuXG5cblx0ZHJhdygpIHsgLy9UaGlzIHdpbGwgYmUgY2FsbGVkIGV2ZXJ5dGltZSB0byBkcmF3XG5cdFx0Ly8gRW5zdXJlIG1vdXNlIGNvb3JkaW5hdGVzIGFyZSBzYW5lLlxuXHRcdC8vIE1vdXNlIGNvb3JkaW5hdGVzIGxvb2sgdGhleSdyZSBmbG9hdHMgYnkgZGVmYXVsdC5cblxuXHRcdGxldCBkID0gdGhpcy5za2V0Y2gucGl4ZWxEZW5zaXR5KCk7XG5cdFx0bGV0IG14ID0gdGhpcy5jbGlwKE1hdGgucm91bmQodGhpcy5za2V0Y2gubW91c2VYKSwgMCwgdGhpcy5za2V0Y2gud2lkdGgpO1xuXHRcdGxldCBteSA9IHRoaXMuY2xpcChNYXRoLnJvdW5kKHRoaXMuc2tldGNoLm1vdXNlWSksIDAsIHRoaXMuc2tldGNoLmhlaWdodCk7XG5cdFx0aWYgKHRoaXMuc2tldGNoLmtleSA9PSAnQXJyb3dVcCcpIHtcblx0XHRcdHRoaXMuTU9EICs9IDE7XG5cdFx0XHR0aGlzLnNrZXRjaC5rZXkgPSBudWxsO1xuXHRcdFx0Y29uc29sZS5sb2coXCJVUCBQUkVTU0VELCBORVcgTU9EOiBcIiArIHRoaXMuTU9EKTtcblx0XHR9IGVsc2UgaWYgKHRoaXMuc2tldGNoLmtleSA9PSAnQXJyb3dEb3duJykge1xuXHRcdFx0dGhpcy5NT0QgLT0gMTtcblx0XHRcdHRoaXMuc2tldGNoLmtleSA9IG51bGw7XG5cdFx0XHRjb25zb2xlLmxvZyhcIkRPV04gUFJFU1NFRCwgTkVXIE1PRDogXCIgKyB0aGlzLk1PRCk7XG5cdFx0fSBlbHNlIGlmICh0aGlzLnNrZXRjaC5rZXkgPT0gJ0Fycm93UmlnaHQnKSB7XG5cdFx0XHRjb25zb2xlLmxvZyhjb25zb2xlLmxvZyhcIk1YOiBcIiArIG14ICsgXCIgTVk6IFwiICsgbXkpKTtcblx0XHR9XG5cdFx0Ly8gV3JpdGUgdG8gaW1hZ2UsIHRoZW4gdG8gc2NyZWVuIGZvciBzcGVlZC5cblx0XHRmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMuc2tldGNoLndpZHRoOyB4KyspIHtcblx0XHRcdGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5za2V0Y2guaGVpZ2h0OyB5KyspIHtcblx0XHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBkOyBpKyspIHtcblx0XHRcdFx0XHRmb3IgKGxldCBqID0gMDsgaiA8IGQ7IGorKykge1xuXHRcdFx0XHRcdFx0bGV0IGluZGV4ID0gNCAqICgoeSAqIGQgKyBqKSAqIHRoaXMuc2tldGNoLndpZHRoICogZCArICh4ICogZCArIGkpKTtcblx0XHRcdFx0XHRcdGlmICh0aGlzLnNlcS5nZXRFbGVtZW50KHgpICUgKHRoaXMuTU9EKSA9PSB0aGlzLnNlcS5nZXRFbGVtZW50KHkpICUgKHRoaXMuTU9EKSkge1xuXHRcdFx0XHRcdFx0XHR0aGlzLmltZy5waXhlbHNbaW5kZXhdID0gMjU1O1xuXHRcdFx0XHRcdFx0XHR0aGlzLmltZy5waXhlbHNbaW5kZXggKyAxXSA9IDI1NTtcblx0XHRcdFx0XHRcdFx0dGhpcy5pbWcucGl4ZWxzW2luZGV4ICsgMl0gPSAyNTU7XG5cdFx0XHRcdFx0XHRcdHRoaXMuaW1nLnBpeGVsc1tpbmRleCArIDNdID0gMjU1O1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0dGhpcy5pbWcucGl4ZWxzW2luZGV4XSA9IDA7XG5cdFx0XHRcdFx0XHRcdHRoaXMuaW1nLnBpeGVsc1tpbmRleCArIDFdID0gMDtcblx0XHRcdFx0XHRcdFx0dGhpcy5pbWcucGl4ZWxzW2luZGV4ICsgMl0gPSAwO1xuXHRcdFx0XHRcdFx0XHR0aGlzLmltZy5waXhlbHNbaW5kZXggKyAzXSA9IDI1NTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzLmltZy51cGRhdGVQaXhlbHMoKTsgLy8gQ29waWVzIG91ciBlZGl0ZWQgcGl4ZWxzIHRvIHRoZSBpbWFnZS5cblxuXHRcdHRoaXMuc2tldGNoLmltYWdlKHRoaXMuaW1nLCAwLCAwKTsgLy8gRGlzcGxheSBpbWFnZSB0byBzY3JlZW4udGhpcy5za2V0Y2gubGluZSg1MCw1MCwxMDAsMTAwKTtcblx0fVxufVxuXG5cbmNvbnN0IE1PRFVMRV9TaGlmdENvbXBhcmUgPSB7XG5cdHZpejogVklaX3NoaWZ0Q29tcGFyZSxcblx0bmFtZTogXCJTaGlmdCBDb21wYXJlXCIsXG5cdGRlc2NyaXB0aW9uOiBcIlwiLFxuXHRjb25maWdTY2hlbWE6IHt9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1PRFVMRV9TaGlmdENvbXBhcmU7IiwiY2xhc3MgVklaX1R1cnRsZSB7XG5cdGNvbnN0cnVjdG9yKHNlcSwgc2tldGNoLCBjb25maWcpIHtcblx0XHR2YXIgZG9tYWluID0gY29uZmlnLmRvbWFpbjtcblx0XHR2YXIgcmFuZ2UgPSBjb25maWcucmFuZ2U7XG5cdFx0dGhpcy5yb3RNYXAgPSB7fTtcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGRvbWFpbi5sZW5ndGg7IGkrKykge1xuXHRcdFx0dGhpcy5yb3RNYXBbZG9tYWluW2ldXSA9IChNYXRoLlBJIC8gMTgwKSAqIHJhbmdlW2ldO1xuXHRcdH1cblx0XHR0aGlzLnN0ZXBTaXplID0gY29uZmlnLnN0ZXBTaXplO1xuXHRcdHRoaXMuYmdDb2xvciA9IGNvbmZpZy5iZ0NvbG9yO1xuXHRcdHRoaXMuc3Ryb2tlQ29sb3IgPSBjb25maWcuc3Ryb2tlQ29sb3I7XG5cdFx0dGhpcy5zdHJva2VXaWR0aCA9IGNvbmZpZy5zdHJva2VXZWlnaHQ7XG5cdFx0dGhpcy5zZXEgPSBzZXE7XG5cdFx0dGhpcy5jdXJyZW50SW5kZXggPSAwO1xuXHRcdHRoaXMub3JpZW50YXRpb24gPSAwO1xuXHRcdHRoaXMuc2tldGNoID0gc2tldGNoO1xuXHRcdGlmIChjb25maWcuc3RhcnRpbmdYICE9IFwiXCIpIHtcblx0XHRcdHRoaXMuWCA9IGNvbmZpZy5zdGFydGluZ1g7XG5cdFx0XHR0aGlzLlkgPSBjb25maWcuc3RhcnRpbmdZO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLlggPSBudWxsO1xuXHRcdFx0dGhpcy5ZID0gbnVsbDtcblx0XHR9XG5cblx0fVxuXHRzdGVwRHJhdygpIHtcblx0XHRsZXQgb2xkWCA9IHRoaXMuWDtcblx0XHRsZXQgb2xkWSA9IHRoaXMuWTtcblx0XHRsZXQgY3VyckVsZW1lbnQgPSB0aGlzLnNlcS5nZXRFbGVtZW50KHRoaXMuY3VycmVudEluZGV4KyspO1xuXHRcdGxldCBhbmdsZSA9IHRoaXMucm90TWFwW2N1cnJFbGVtZW50XTtcblx0XHRpZiAoYW5nbGUgPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR0aHJvdyAoJ2FuZ2xlIHVuZGVmaW5lZCBmb3IgZWxlbWVudDogJyArIGN1cnJFbGVtZW50KTtcblx0XHR9XG5cdFx0dGhpcy5vcmllbnRhdGlvbiA9ICh0aGlzLm9yaWVudGF0aW9uICsgYW5nbGUpO1xuXHRcdHRoaXMuWCArPSB0aGlzLnN0ZXBTaXplICogTWF0aC5jb3ModGhpcy5vcmllbnRhdGlvbik7XG5cdFx0dGhpcy5ZICs9IHRoaXMuc3RlcFNpemUgKiBNYXRoLnNpbih0aGlzLm9yaWVudGF0aW9uKTtcblx0XHR0aGlzLnNrZXRjaC5saW5lKG9sZFgsIG9sZFksIHRoaXMuWCwgdGhpcy5ZKTtcblx0fVxuXHRzZXR1cCgpIHtcblx0XHR0aGlzLlggPSB0aGlzLnNrZXRjaC53aWR0aCAvIDI7XG5cdFx0dGhpcy5ZID0gdGhpcy5za2V0Y2guaGVpZ2h0IC8gMjtcblx0XHR0aGlzLnNrZXRjaC5iYWNrZ3JvdW5kKHRoaXMuYmdDb2xvcik7XG5cdFx0dGhpcy5za2V0Y2guc3Ryb2tlKHRoaXMuc3Ryb2tlQ29sb3IpO1xuXHRcdHRoaXMuc2tldGNoLnN0cm9rZVdlaWdodCh0aGlzLnN0cm9rZVdpZHRoKTtcblx0fVxuXHRkcmF3KCkge1xuXHRcdHRoaXMuc3RlcERyYXcoKTtcblx0fVxufVxuXG5cbmNvbnN0IFNDSEVNQV9UdXJ0bGUgPSB7XG5cdGRvbWFpbjoge1xuXHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdHRpdGxlOiAnU2VxdWVuY2UgRG9tYWluJyxcblx0XHRkZXNjcmlwdGlvbjogJ0NvbW1hIHNlcGVyYXRlZCBudW1iZXJzJyxcblx0XHRmb3JtYXQ6ICdsaXN0Jyxcblx0XHRkZWZhdWx0OiBcIjAsMSwyLDMsNFwiLFxuXHRcdHJlcXVpcmVkOiB0cnVlXG5cdH0sXG5cdHJhbmdlOiB7XG5cdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0dGl0bGU6ICdBbmdsZXMnLFxuXHRcdGRlZmF1bHQ6IFwiMzAsNDUsNjAsOTAsMTIwXCIsXG5cdFx0Zm9ybWF0OiAnbGlzdCcsXG5cdFx0ZGVzY3JpcHRpb246ICdDb21tYSBzZXBlcmF0ZWQgbnVtYmVycycsXG5cdFx0cmVxdWlyZWQ6IHRydWVcblx0fSxcblx0c3RlcFNpemU6IHtcblx0XHR0eXBlOiAnbnVtYmVyJyxcblx0XHR0aXRsZTogJ1N0ZXAgU2l6ZScsXG5cdFx0ZGVmYXVsdDogMjAsXG5cdFx0cmVxdWlyZWQ6IHRydWVcblx0fSxcblx0c3Ryb2tlV2VpZ2h0OiB7XG5cdFx0dHlwZTogJ251bWJlcicsXG5cdFx0dGl0bGU6ICdTdHJva2UgV2lkdGgnLFxuXHRcdGRlZmF1bHQ6IDUsXG5cdFx0cmVxdWlyZWQ6IHRydWVcblx0fSxcblx0c3RhcnRpbmdYOiB7XG5cdFx0dHlwZTogJ251bWJlcicsXG5cdFx0dGl0ZTogJ1ggc3RhcnQnXG5cdH0sXG5cdHN0YXJ0aW5nWToge1xuXHRcdHR5cGU6ICdudW1iZXInLFxuXHRcdHRpdGU6ICdZIHN0YXJ0J1xuXHR9LFxuXHRiZ0NvbG9yOiB7XG5cdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0dGl0bGU6ICdCYWNrZ3JvdW5kIENvbG9yJyxcblx0XHRmb3JtYXQ6ICdjb2xvcicsXG5cdFx0ZGVmYXVsdDogXCIjNjY2NjY2XCIsXG5cdFx0cmVxdWlyZWQ6IGZhbHNlXG5cdH0sXG5cdHN0cm9rZUNvbG9yOiB7XG5cdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0dGl0bGU6ICdTdHJva2UgQ29sb3InLFxuXHRcdGZvcm1hdDogJ2NvbG9yJyxcblx0XHRkZWZhdWx0OiAnI2ZmMDAwMCcsXG5cdFx0cmVxdWlyZWQ6IGZhbHNlXG5cdH0sXG59O1xuXG5jb25zdCBNT0RVTEVfVHVydGxlID0ge1xuXHR2aXo6IFZJWl9UdXJ0bGUsXG5cdG5hbWU6IFwiVHVydGxlXCIsXG5cdGRlc2NyaXB0aW9uOiBcIlwiLFxuXHRjb25maWdTY2hlbWE6IFNDSEVNQV9UdXJ0bGVcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBNT0RVTEVfVHVydGxlOyIsIiAgICAgICAgXG4vLyBudW1iZXIgb2YgaXRlcmF0aW9ucyBmb3Jcbi8vIHRoZSByZWltYW4gemV0YSBmdW5jdGlvbiBjb21wdXRhdGlvblxuY29uc3QgbnVtX2l0ZXIgPSAxMFxuXG5jbGFzcyBWSVpfWmV0YSB7XG4gICAgICAgIGNvbnN0cnVjdG9yKHNlcSwgc2tldGNoLCBjb25maWcpe1xuICAgICAgICAgICAgICAgIC8vIFNlcXVlbmNlIGxhYmVsXG4gICAgICAgICAgICAgICAgdGhpcy5zZXEgPSBzZXFcblxuICAgICAgICAgICAgICAgIC8vIFA1IHNrZXRjaCBvYmplY3RcbiAgICAgICAgICAgICAgICB0aGlzLnNrZXRjaCA9IHNrZXRjaFxuICAgICAgICAgICAgICAgIHRoaXMuc2l6ZSA9IDIwMDtcbiAgICAgICAgfVxuXG4gICAgICAgIHNldHVwKCl7XG4gICAgICAgICAgICAgICAgdGhpcy5pdGVyID0gMDtcbiAgICAgICAgICAgICAgICB0aGlzLnNrZXRjaC5waXhlbERlbnNpdHkoMSk7XG4gICAgICAgICAgICAgICAgdGhpcy5za2V0Y2guZnJhbWVSYXRlKDEpO1xuXG4gICAgICAgICAgICAgICAgLy8gdGhpcy53b3JraW5nU2VxdWVuY2UgPSBbXTtcbiAgICAgICAgICAgICAgICB2YXIgaiA9IDA7XG4gICAgICAgICAgICAgICAgdmFyIGsgPSAxO1xuICAgICAgICAgICAgICAgIC8vIGZvcihsZXQgaSA9IDA7IGkgPCB0aGlzLnNrZXRjaC53aWR0aDsgKytpKSB7XG4gICAgICAgICAgICAgICAgLy8gICAgICAgICB0aGlzLndvcmtpbmdTZXF1ZW5jZS5wdXNoKGsgJSA0MCk7XG4gICAgICAgICAgICAgICAgLy8gICAgICAgICB2YXIgdGVtcCA9IGo7XG4gICAgICAgICAgICAgICAgLy8gICAgICAgICBqID0gaztcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgIGsgPSBrICsgdGVtcDtcbiAgICAgICAgICAgICAgICAvLyB9XG4gICAgICAgIH1cblxuXG4gICAgICAgIG1hcHBpbmdGdW5jKHhfLCB5XywgaXRlcnMpIHtcbiAgICAgICAgICAgICAgICBsZXQgYSA9IHhfO1xuICAgICAgICAgICAgICAgIGxldCBiID0geV87XG4gICAgICAgICAgICAgICAgbGV0IG5fID0gMDtcbiAgICAgICAgICAgICAgICB3aGlsZShuXyA8IGl0ZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhYSA9IGEqYTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGJiID0gYipiO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYWIgPSAyLjAgKiBhICogYjtcblxuICAgICAgICAgICAgICAgICAgICAgICAgYSA9IGFhIC0gYmIgKyB4XztcbiAgICAgICAgICAgICAgICAgICAgICAgIGIgPSBhYiArIHlfO1xuICAgICAgICAgICAgICAgICAgICAgICAgbl8rKztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIE1hdGguc3FydChhICogYSArIGIgKiBiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIG1hcHBpbmdGdW5jKHhfLCB5XywgaXRlcnMpIHtcbiAgICAgICAgLy8gICAgICAgICBsZXQgYSA9IHhfO1xuICAgICAgICAvLyAgICAgICAgIGxldCBuXyA9IDA7XG4gICAgICAgIC8vICAgICAgICAgbGV0IFIgPSAyLjA7XG4gICAgICAgIC8vICAgICAgICAgd2hpbGUobl8gPCBpdGVycykge1xuICAgICAgICAvLyAgICAgICAgICAgICAgICAgY29uc3QgbmV4dCA9IFIgKiBhICogKDEgLSBhKTtcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgIGEgPSBuZXh0O1xuICAgICAgICAvLyAgICAgICAgICAgICAgICAgbl8gKys7XG4gICAgICAgIC8vICAgICAgICAgfVxuICAgICAgICAvLyAgICAgICAgIHJldHVybiBhO1xuICAgICAgICAvLyB9XG4gICAgICAgIC8vXG5cbiAgICAgICAgZHJhd01hcChtYXhpdGVyYXRpb25zKXtcbiAgICAgICAgICAgICAgICB0aGlzLnNrZXRjaC5iYWNrZ3JvdW5kKDApO1xuICAgICAgICAgICAgICAgIGNvbnN0IHcgPSA0O1xuICAgICAgICAgICAgICAgIGNvbnN0IGggPSAodyAqIHRoaXMuc2tldGNoLmhlaWdodCkgLyB0aGlzLnNrZXRjaC53aWR0aDtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHhtaW4gPSAtdy8yO1xuICAgICAgICAgICAgICAgIGNvbnN0IHltaW4gPSAtaC8yO1xuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2codGhpcy5za2V0Y2gpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHRoaXMuc2tldGNoLnBpeGVscyk7XG4gICAgICAgICAgICAgICAgdGhpcy5za2V0Y2gubG9hZFBpeGVscygpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgeG1heCA9IHhtaW4gKyB3O1xuICAgICAgICAgICAgICAgIGNvbnN0IHltYXggPSB5bWluICsgaDtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGR4ID0gKHhtYXggLSB4bWluKSAvICh0aGlzLnNrZXRjaC53aWR0aCk7XG4gICAgICAgICAgICAgICAgY29uc3QgZHkgPSAoeW1heCAtIHltaW4pIC8gKHRoaXMuc2tldGNoLmhlaWdodCk7XG5cbiAgICAgICAgICAgICAgICAvLyBJbWFnaW5hcnkgcGFydFxuICAgICAgICAgICAgICAgIGxldCB5ID0geW1pbjtcbiAgICAgICAgICAgICAgICBmb3IobGV0IGkgPSAwOyBpIDwgdGhpcy5za2V0Y2guaGVpZ2h0OyArK2kpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVhbCBwYXJ0IFxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHggPSB4bWluO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yKGxldCBqID0gMDsgaiA8IHRoaXMuc2tldGNoLndpZHRoOyArK2opIHtcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuID0gdGhpcy5tYXBwaW5nRnVuYyh4LCB5LCBtYXhpdGVyYXRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTXVsdGlwbHkgY29tcGxleCBudW1iZXJzIG1heGl0ZXJhdGlvbnMgdGltZXNcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGluZGV4IG9mIHRoZSBwaXhlbCBiYXNlZCBvbiBpLCBqICg0IHNwYW5uZWQgYXJyYXkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHBpeCA9IChqICsgaSp0aGlzLnNrZXRjaC53aWR0aCkgKiA0O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFByb3BvcnRpb25hbGl0eSBzb2x2ZXI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG1hcHMgbiAgXFxpbiBbMCwgbWF4aXRlcmF0aW9uc10gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRvICAgbicgXFxpbiBbMCwgMV1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgbm9ybSA9IHRoaXMuc2tldGNoLm1hcChuLCAwLCBtYXhpdGVyYXRpb25zLCAwLCAxKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjb25zdHJhaW4gYmV0d2VlbiAwIGFuZCAyNTVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGNvbG8gPSB0aGlzLnNrZXRjaC5tYXAoTWF0aC5zcXJ0KG5vcm0pLCAwLCAxLCAwLCAyNTUpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuID09IG1heGl0ZXJhdGlvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xvID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBSR0IgY29sb3JpbmcgZ2V0cyBpbmRleGVkIGhlcmVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNrZXRjaC5waXhlbHNbcGl4ICsgMF0gPSBjb2xvO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2tldGNoLnBpeGVsc1twaXggKyAxXSA9IGNvbG87XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5za2V0Y2gucGl4ZWxzW3BpeCArIDJdID0gY29sbztcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFscGhhOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1JHQkFfY29sb3JfbW9kZWxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGlzIGlzIG9wYWNpdHlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNrZXRjaC5waXhlbHNbcGl4ICsgM10gPSAyNTU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeCArPSBkeDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHkgKz0gZHk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdGhpcy5za2V0Y2gudXBkYXRlUGl4ZWxzKCk7XG4gICAgICAgIH1cblxuICAgICAgICBkcmF3KCkge1xuICAgICAgICAgICAgICAgIHRoaXMuZHJhd01hcCh0aGlzLml0ZXIpO1xuICAgICAgICAgICAgICAgIHRoaXMuaXRlciA9ICh0aGlzLml0ZXIgKyAxKSAlIDIwMDtcbiAgICAgICAgfVxuXG5cblxuXG59XG5cbmNvbnN0IFNDSEVNQV9aZXRhID0ge1xuICAgICAgICAgICAgbjoge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICB0aXRsZTogJ04nLFxuICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdOdW1iZXIgb2YgZWxlbWVudHMnLFxuICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICAgICAgICB9LFxuICAgICAgICAgIExldmVsczoge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICB0aXRsZTogJ0xldmVscycsXG4gICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ051bWJlciBvZiBsZXZlbHMnLFxuICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICAgICAgICB9LFxuICB9O1xuXG5cbmNvbnN0IE1PRFVMRV9aZXRhID0ge1xuICAgIHZpejogVklaX1pldGEsXG4gICAgbmFtZTogJ1pldGEnLFxuICAgIGRlc2NyaXB0aW9uOiAnJyxcbiAgICBjb25maWdTY2hlbWE6IFNDSEVNQV9aZXRhXG59XG5cbm1vZHVsZS5leHBvcnRzID0gTU9EVUxFX1pldGFcbiAgICBcbiIsIi8vQWRkIGFuIGltcG9ydCBsaW5lIGhlcmUgZm9yIG5ldyBtb2R1bGVzXG5cblxuLy9BZGQgbmV3IG1vZHVsZXMgdG8gdGhpcyBjb25zdGFudC5cbmNvbnN0IE1PRFVMRVMgPSB7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBNT0RVTEVTO1xuXG4vKmpzaGludCBpZ25vcmU6c3RhcnQgKi9cbk1PRFVMRVNbXCJUdXJ0bGVcIl0gPSByZXF1aXJlKCcuL21vZHVsZVR1cnRsZS5qcycpO1xuTU9EVUxFU1tcIlNoaWZ0Q29tcGFyZVwiXSA9IHJlcXVpcmUoJy4vbW9kdWxlU2hpZnRDb21wYXJlLmpzJyk7XG5NT0RVTEVTW1wiRGlmZmVyZW5jZXNcIl0gPSByZXF1aXJlKCcuL21vZHVsZURpZmZlcmVuY2VzLmpzJyk7XG5NT0RVTEVTW1wiTW9kRmlsbFwiXSA9IHJlcXVpcmUoJy4vbW9kdWxlTW9kRmlsbC5qcycpO1xuTU9EVUxFU1snWmV0YSddID0gcmVxdWlyZSgnLi9tb2R1bGVaZXRhLmpzJylcblxuTU9EVUxFU1snRnJhY3RhbE1hcCddID0gcmVxdWlyZSgnLi9tb2R1bGVGcmFjdGFsTWFwLmpzJylcbiIsIlNFUV9saW5lYXJSZWN1cnJlbmNlID0gcmVxdWlyZSgnLi9zZXF1ZW5jZUxpblJlYy5qcycpO1xuXG5mdW5jdGlvbiBHRU5fZmlib25hY2NpKHtcbiAgICBtXG59KSB7XG4gICAgcmV0dXJuIFNFUV9saW5lYXJSZWN1cnJlbmNlLmdlbmVyYXRvcih7XG4gICAgICAgIGNvZWZmaWNpZW50TGlzdDogWzEsIDFdLFxuICAgICAgICBzZWVkTGlzdDogWzEsIDFdLFxuICAgICAgICBtXG4gICAgfSk7XG59XG5cbmNvbnN0IFNDSEVNQV9GaWJvbmFjY2kgPSB7XG4gICAgbToge1xuICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgdGl0bGU6ICdNb2QnLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ0EgbnVtYmVyIHRvIG1vZCB0aGUgc2VxdWVuY2UgYnkgYnknLFxuICAgICAgICByZXF1aXJlZDogZmFsc2VcbiAgICB9XG59O1xuXG5cbmNvbnN0IFNFUV9maWJvbmFjY2kgPSB7XG4gICAgZ2VuZXJhdG9yOiBHRU5fZmlib25hY2NpLFxuICAgIG5hbWU6IFwiRmlib25hY2NpXCIsXG4gICAgZGVzY3JpcHRpb246IFwiXCIsXG4gICAgcGFyYW1zU2NoZW1hOiBTQ0hFTUFfRmlib25hY2NpXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNFUV9maWJvbmFjY2k7IiwiZnVuY3Rpb24gR0VOX2xpbmVhclJlY3VycmVuY2Uoe1xuICAgIGNvZWZmaWNpZW50TGlzdCxcbiAgICBzZWVkTGlzdCxcbiAgICBtXG59KSB7XG4gICAgaWYgKGNvZWZmaWNpZW50TGlzdC5sZW5ndGggIT0gc2VlZExpc3QubGVuZ3RoKSB7XG4gICAgICAgIC8vTnVtYmVyIG9mIHNlZWRzIHNob3VsZCBtYXRjaCB0aGUgbnVtYmVyIG9mIGNvZWZmaWNpZW50c1xuICAgICAgICBjb25zb2xlLmxvZyhcIm51bWJlciBvZiBjb2VmZmljaWVudHMgbm90IGVxdWFsIHRvIG51bWJlciBvZiBzZWVkcyBcIik7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBsZXQgayA9IGNvZWZmaWNpZW50TGlzdC5sZW5ndGg7XG4gICAgbGV0IGdlbmVyaWNMaW5SZWM7XG4gICAgaWYgKG0gIT0gbnVsbCkge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNvZWZmaWNpZW50TGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY29lZmZpY2llbnRMaXN0W2ldID0gY29lZmZpY2llbnRMaXN0W2ldICUgbTtcbiAgICAgICAgICAgIHNlZWRMaXN0W2ldID0gc2VlZExpc3RbaV0gJSBtO1xuICAgICAgICB9XG4gICAgICAgIGdlbmVyaWNMaW5SZWMgPSBmdW5jdGlvbiAobiwgY2FjaGUpIHtcbiAgICAgICAgICAgIGlmIChuIDwgc2VlZExpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY2FjaGVbbl0gPSBzZWVkTGlzdFtuXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FjaGVbbl07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gY2FjaGUubGVuZ3RoOyBpIDw9IG47IGkrKykge1xuICAgICAgICAgICAgICAgIGxldCBzdW0gPSAwO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgazsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgIHN1bSArPSBjYWNoZVtpIC0gaiAtIDFdICogY29lZmZpY2llbnRMaXN0W2pdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYWNoZVtpXSA9IHN1bSAlIG07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVbbl07XG4gICAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZ2VuZXJpY0xpblJlYyA9IGZ1bmN0aW9uIChuLCBjYWNoZSkge1xuICAgICAgICAgICAgaWYgKG4gPCBzZWVkTGlzdC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjYWNoZVtuXSA9IHNlZWRMaXN0W25dO1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWNoZVtuXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IGNhY2hlLmxlbmd0aDsgaSA8PSBuOyBpKyspIHtcbiAgICAgICAgICAgICAgICBsZXQgc3VtID0gMDtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGs7IGorKykge1xuICAgICAgICAgICAgICAgICAgICBzdW0gKz0gY2FjaGVbaSAtIGogLSAxXSAqIGNvZWZmaWNpZW50TGlzdFtqXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FjaGVbaV0gPSBzdW07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVbbl07XG4gICAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiBnZW5lcmljTGluUmVjO1xufVxuXG5jb25zdCBTQ0hFTUFfbGluZWFyUmVjdXJyZW5jZSA9IHtcbiAgICBjb2VmZmljaWVudExpc3Q6IHtcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgIHRpdGxlOiAnQ29lZmZpY2llbnRzIGxpc3QnLFxuICAgICAgICBmb3JtYXQ6ICdsaXN0JyxcbiAgICAgICAgZGVzY3JpcHRpb246ICdDb21tYSBzZXBlcmF0ZWQgbnVtYmVycycsXG4gICAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgfSxcbiAgICBzZWVkTGlzdDoge1xuICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgdGl0bGU6ICdTZWVkIGxpc3QnLFxuICAgICAgICBmb3JtYXQ6ICdsaXN0JyxcbiAgICAgICAgZGVzY3JpcHRpb246ICdDb21tYSBzZXBlcmF0ZWQgbnVtYmVycycsXG4gICAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgfSxcbiAgICBtOiB7XG4gICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICB0aXRsZTogJ01vZCcsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnQSBudW1iZXIgdG8gbW9kIHRoZSBzZXF1ZW5jZSBieSBieScsXG4gICAgICAgIHJlcXVpcmVkOiBmYWxzZVxuICAgIH1cbn07XG5cblxuY29uc3QgU0VRX2xpbmVhclJlY3VycmVuY2UgPSB7XG4gICAgZ2VuZXJhdG9yOiBHRU5fbGluZWFyUmVjdXJyZW5jZSxcbiAgICBuYW1lOiBcIkxpbmVhciBSZWN1cnJlbmNlXCIsXG4gICAgZGVzY3JpcHRpb246IFwiXCIsXG4gICAgcGFyYW1zU2NoZW1hOiBTQ0hFTUFfbGluZWFyUmVjdXJyZW5jZVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTRVFfbGluZWFyUmVjdXJyZW5jZTsiLCJjb25zdCBTRVFfbGluZWFyUmVjdXJyZW5jZSA9IHJlcXVpcmUoJy4vc2VxdWVuY2VMaW5SZWMuanMnKTtcblxuZnVuY3Rpb24gR0VOX0x1Y2FzKHtcbiAgICBtXG59KSB7XG4gICAgcmV0dXJuIFNFUV9saW5lYXJSZWN1cnJlbmNlLmdlbmVyYXRvcih7XG4gICAgICAgIGNvZWZmaWNpZW50TGlzdDogWzEsIDFdLFxuICAgICAgICBzZWVkTGlzdDogWzIsIDFdLFxuICAgICAgICBtXG4gICAgfSk7XG59XG5cbmNvbnN0IFNDSEVNQV9MdWNhcyA9IHtcbiAgICBtOiB7XG4gICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICB0aXRsZTogJ01vZCcsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnQSBudW1iZXIgdG8gbW9kIHRoZSBzZXF1ZW5jZSBieSBieScsXG4gICAgICAgIHJlcXVpcmVkOiBmYWxzZVxuICAgIH1cbn07XG5cblxuY29uc3QgU0VRX0x1Y2FzID0ge1xuICAgIGdlbmVyYXRvcjogR0VOX0x1Y2FzLFxuICAgIG5hbWU6IFwiTHVjYXNcIixcbiAgICBkZXNjcmlwdGlvbjogXCJcIixcbiAgICBwYXJhbXNTY2hlbWE6IFNDSEVNQV9MdWNhc1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTRVFfTHVjYXM7IiwiZnVuY3Rpb24gR0VOX05hdHVyYWxzKHtcbiAgICBpbmNsdWRlemVyb1xufSkge1xuICAgIGlmIChpbmNsdWRlemVybykge1xuICAgICAgICByZXR1cm4gKChuKSA9PiBuKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gKChuKSA9PiBuICsgMSk7XG4gICAgfVxufVxuXG5jb25zdCBTQ0hFTUFfTmF0dXJhbHMgPSB7XG4gICAgaW5jbHVkZXplcm86IHtcbiAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICB0aXRsZTogJ0luY2x1ZGUgemVybycsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnJyxcbiAgICAgICAgZGVmYXVsdDogJ2ZhbHNlJyxcbiAgICAgICAgcmVxdWlyZWQ6IGZhbHNlXG4gICAgfVxufTtcblxuXG5jb25zdCBTRVFfTmF0dXJhbHMgPSB7XG4gICAgZ2VuZXJhdG9yOiBHRU5fTmF0dXJhbHMsXG4gICAgbmFtZTogXCJOYXR1cmFsc1wiLFxuICAgIGRlc2NyaXB0aW9uOiBcIlwiLFxuICAgIHBhcmFtc1NjaGVtYTogU0NIRU1BX05hdHVyYWxzXG59O1xuXG4vLyBleHBvcnQgZGVmYXVsdCBTRVFfTmF0dXJhbHNcbm1vZHVsZS5leHBvcnRzID0gU0VRX05hdHVyYWxzOyIsImZ1bmN0aW9uIEdFTl9QcmltZXMoKSB7XG4gICAgY29uc3QgcHJpbWVzID0gZnVuY3Rpb24gKG4sIGNhY2hlKSB7XG4gICAgICAgIGlmIChjYWNoZS5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgY2FjaGUucHVzaCgyKTtcbiAgICAgICAgICAgIGNhY2hlLnB1c2goMyk7XG4gICAgICAgICAgICBjYWNoZS5wdXNoKDUpO1xuICAgICAgICB9XG4gICAgICAgIGxldCBpID0gY2FjaGVbY2FjaGUubGVuZ3RoIC0gMV0gKyAxO1xuICAgICAgICBsZXQgayA9IDA7XG4gICAgICAgIHdoaWxlIChjYWNoZS5sZW5ndGggPD0gbikge1xuICAgICAgICAgICAgbGV0IGlzUHJpbWUgPSB0cnVlO1xuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBjYWNoZS5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIGlmIChpICUgY2FjaGVbal0gPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBpc1ByaW1lID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpc1ByaW1lKSB7XG4gICAgICAgICAgICAgICAgY2FjaGUucHVzaChpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGkrKztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2FjaGVbbl07XG4gICAgfTtcbiAgICByZXR1cm4gcHJpbWVzO1xufVxuXG5cbmNvbnN0IFNDSEVNQV9QcmltZXMgPSB7XG4gICAgbToge1xuICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgdGl0bGU6ICdNb2QnLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ0EgbnVtYmVyIHRvIG1vZCB0aGUgc2VxdWVuY2UgYnknLFxuICAgICAgICByZXF1aXJlZDogZmFsc2VcbiAgICB9XG59O1xuXG5cbmNvbnN0IFNFUV9QcmltZXMgPSB7XG4gICAgZ2VuZXJhdG9yOiBHRU5fUHJpbWVzLFxuICAgIG5hbWU6IFwiUHJpbWVzXCIsXG4gICAgZGVzY3JpcHRpb246IFwiXCIsXG4gICAgcGFyYW1zU2NoZW1hOiBTQ0hFTUFfUHJpbWVzXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNFUV9QcmltZXM7IiwiLyoqXG4gKlxuICogQGNsYXNzIFNlcXVlbmNlR2VuZXJhdG9yXG4gKi9cbmNsYXNzIFNlcXVlbmNlR2VuZXJhdG9yIHtcbiAgICAvKipcbiAgICAgKkNyZWF0ZXMgYW4gaW5zdGFuY2Ugb2YgU2VxdWVuY2VHZW5lcmF0b3IuXG4gICAgICogQHBhcmFtIHsqfSBnZW5lcmF0b3IgYSBmdW5jdGlvbiB0aGF0IHRha2VzIGEgbmF0dXJhbCBudW1iZXIgYW5kIHJldHVybnMgYSBudW1iZXIsIGl0IGNhbiBvcHRpb25hbGx5IHRha2UgdGhlIGNhY2hlIGFzIGEgc2Vjb25kIGFyZ3VtZW50XG4gICAgICogQHBhcmFtIHsqfSBJRCB0aGUgSUQgb2YgdGhlIHNlcXVlbmNlXG4gICAgICogQG1lbWJlcm9mIFNlcXVlbmNlR2VuZXJhdG9yXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoSUQsIGdlbmVyYXRvcikge1xuICAgICAgICB0aGlzLmdlbmVyYXRvciA9IGdlbmVyYXRvcjtcbiAgICAgICAgdGhpcy5JRCA9IElEO1xuICAgICAgICB0aGlzLmNhY2hlID0gW107XG4gICAgICAgIHRoaXMubmV3U2l6ZSA9IDE7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIGlmIHdlIG5lZWQgdG8gZ2V0IHRoZSBudGggZWxlbWVudCBhbmQgaXQncyBub3QgcHJlc2VudCBpblxuICAgICAqIGluIHRoZSBjYWNoZSwgdGhlbiB3ZSBlaXRoZXIgZG91YmxlIHRoZSBzaXplLCBvciB0aGUgXG4gICAgICogbmV3IHNpemUgYmVjb21lcyBuKzFcbiAgICAgKiBAcGFyYW0geyp9IG4gXG4gICAgICogQG1lbWJlcm9mIFNlcXVlbmNlR2VuZXJhdG9yXG4gICAgICovXG4gICAgcmVzaXplQ2FjaGUobikge1xuICAgICAgICB0aGlzLm5ld1NpemUgPSB0aGlzLmNhY2hlLmxlbmd0aCAqIDI7XG4gICAgICAgIGlmIChuICsgMSA+IHRoaXMubmV3U2l6ZSkge1xuICAgICAgICAgICAgdGhpcy5uZXdTaXplID0gbiArIDE7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogUG9wdWxhdGVzIHRoZSBjYWNoZSB1cCB1bnRpbCB0aGUgY3VycmVudCBuZXdTaXplXG4gICAgICogdGhpcyBpcyBjYWxsZWQgYWZ0ZXIgcmVzaXplQ2FjaGVcbiAgICAgKiBAbWVtYmVyb2YgU2VxdWVuY2VHZW5lcmF0b3JcbiAgICAgKi9cbiAgICBmaWxsQ2FjaGUoKSB7XG4gICAgICAgIGZvciAobGV0IGkgPSB0aGlzLmNhY2hlLmxlbmd0aDsgaSA8IHRoaXMubmV3U2l6ZTsgaSsrKSB7XG4gICAgICAgICAgICAvL3RoZSBnZW5lcmF0b3IgaXMgZ2l2ZW4gdGhlIGNhY2hlIHNpbmNlIGl0IHdvdWxkIG1ha2UgY29tcHV0YXRpb24gbW9yZSBlZmZpY2llbnQgc29tZXRpbWVzXG4gICAgICAgICAgICAvL2J1dCB0aGUgZ2VuZXJhdG9yIGRvZXNuJ3QgbmVjZXNzYXJpbHkgbmVlZCB0byB0YWtlIG1vcmUgdGhhbiBvbmUgYXJndW1lbnQuXG4gICAgICAgICAgICB0aGlzLmNhY2hlW2ldID0gdGhpcy5nZW5lcmF0b3IoaSwgdGhpcy5jYWNoZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogR2V0IGVsZW1lbnQgaXMgd2hhdCB0aGUgZHJhd2luZyB0b29scyB3aWxsIGJlIGNhbGxpbmcsIGl0IHJldHJpZXZlc1xuICAgICAqIHRoZSBudGggZWxlbWVudCBvZiB0aGUgc2VxdWVuY2UgYnkgZWl0aGVyIGdldHRpbmcgaXQgZnJvbSB0aGUgY2FjaGVcbiAgICAgKiBvciBpZiBpc24ndCBwcmVzZW50LCBieSBidWlsZGluZyB0aGUgY2FjaGUgYW5kIHRoZW4gZ2V0dGluZyBpdFxuICAgICAqIEBwYXJhbSB7Kn0gbiB0aGUgaW5kZXggb2YgdGhlIGVsZW1lbnQgaW4gdGhlIHNlcXVlbmNlIHdlIHdhbnRcbiAgICAgKiBAcmV0dXJucyBhIG51bWJlclxuICAgICAqIEBtZW1iZXJvZiBTZXF1ZW5jZUdlbmVyYXRvclxuICAgICAqL1xuICAgIGdldEVsZW1lbnQobikge1xuICAgICAgICBpZiAodGhpcy5jYWNoZVtuXSAhPSB1bmRlZmluZWQgfHwgdGhpcy5maW5pdGUpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiY2FjaGUgaGl0XCIpXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jYWNoZVtuXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiY2FjaGUgbWlzc1wiKVxuICAgICAgICAgICAgdGhpcy5yZXNpemVDYWNoZShuKTtcbiAgICAgICAgICAgIHRoaXMuZmlsbENhY2hlKCk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jYWNoZVtuXTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG4vKipcbiAqXG4gKlxuICogQHBhcmFtIHsqfSBjb2RlIGFyYml0cmFyeSBzYWdlIGNvZGUgdG8gYmUgZXhlY3V0ZWQgb24gYWxlcGhcbiAqIEByZXR1cm5zIGFqYXggcmVzcG9uc2Ugb2JqZWN0XG4gKi9cbmZ1bmN0aW9uIHNhZ2VFeGVjdXRlKGNvZGUpIHtcbiAgICByZXR1cm4gJC5hamF4KHtcbiAgICAgICAgdHlwZTogJ1BPU1QnLFxuICAgICAgICBhc3luYzogZmFsc2UsXG4gICAgICAgIHVybDogJ2h0dHA6Ly9hbGVwaC5zYWdlbWF0aC5vcmcvc2VydmljZScsXG4gICAgICAgIGRhdGE6IFwiY29kZT1cIiArIGNvZGVcbiAgICB9KTtcbn1cblxuLyoqXG4gKlxuICpcbiAqIEBwYXJhbSB7Kn0gY29kZSBhcmJpdHJhcnkgc2FnZSBjb2RlIHRvIGJlIGV4ZWN1dGVkIG9uIGFsZXBoXG4gKiBAcmV0dXJucyBhamF4IHJlc3BvbnNlIG9iamVjdFxuICovXG5hc3luYyBmdW5jdGlvbiBzYWdlRXhlY3V0ZUFzeW5jKGNvZGUpIHtcbiAgICByZXR1cm4gYXdhaXQgJC5hamF4KHtcbiAgICAgICAgdHlwZTogJ1BPU1QnLFxuICAgICAgICB1cmw6ICdodHRwOi8vYWxlcGguc2FnZW1hdGgub3JnL3NlcnZpY2UnLFxuICAgICAgICBkYXRhOiBcImNvZGU9XCIgKyBjb2RlXG4gICAgfSk7XG59XG5cblxuY2xhc3MgT0VJU1NlcXVlbmNlR2VuZXJhdG9yIHtcbiAgICBjb25zdHJ1Y3RvcihJRCwgT0VJUykge1xuICAgICAgICB0aGlzLk9FSVMgPSBPRUlTO1xuICAgICAgICB0aGlzLklEID0gSUQ7XG4gICAgICAgIHRoaXMuY2FjaGUgPSBbXTtcbiAgICAgICAgdGhpcy5uZXdTaXplID0gMTtcbiAgICAgICAgdGhpcy5wcmVmaWxsQ2FjaGUoKTtcbiAgICB9XG4gICAgb2Vpc0ZldGNoKG4pIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJGZXRjaGluZy4uXCIpO1xuICAgICAgICBsZXQgY29kZSA9IGBwcmludChzbG9hbmUuJHt0aGlzLk9FSVN9Lmxpc3QoJHtufSkpYDtcbiAgICAgICAgbGV0IHJlc3AgPSBzYWdlRXhlY3V0ZShjb2RlKTtcbiAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UocmVzcC5yZXNwb25zZUpTT04uc3Rkb3V0KTtcbiAgICB9XG4gICAgYXN5bmMgcHJlZmlsbENhY2hlKCkge1xuICAgICAgICB0aGlzLnJlc2l6ZUNhY2hlKDMwMDApO1xuICAgICAgICBsZXQgY29kZSA9IGBwcmludChzbG9hbmUuJHt0aGlzLk9FSVN9Lmxpc3QoJHt0aGlzLm5ld1NpemV9KSlgO1xuICAgICAgICBsZXQgcmVzcCA9IGF3YWl0IHNhZ2VFeGVjdXRlQXN5bmMoY29kZSk7XG4gICAgICAgIGNvbnNvbGUubG9nKHJlc3ApO1xuICAgICAgICB0aGlzLmNhY2hlID0gdGhpcy5jYWNoZS5jb25jYXQoSlNPTi5wYXJzZShyZXNwLnN0ZG91dCkpO1xuICAgIH1cbiAgICByZXNpemVDYWNoZShuKSB7XG4gICAgICAgIHRoaXMubmV3U2l6ZSA9IHRoaXMuY2FjaGUubGVuZ3RoICogMjtcbiAgICAgICAgaWYgKG4gKyAxID4gdGhpcy5uZXdTaXplKSB7XG4gICAgICAgICAgICB0aGlzLm5ld1NpemUgPSBuICsgMTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmaWxsQ2FjaGUoKSB7XG4gICAgICAgIGxldCBuZXdMaXN0ID0gdGhpcy5vZWlzRmV0Y2godGhpcy5uZXdTaXplKTtcbiAgICAgICAgdGhpcy5jYWNoZSA9IHRoaXMuY2FjaGUuY29uY2F0KG5ld0xpc3QpO1xuICAgIH1cbiAgICBnZXRFbGVtZW50KG4pIHtcbiAgICAgICAgaWYgKHRoaXMuY2FjaGVbbl0gIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jYWNoZVtuXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMucmVzaXplQ2FjaGUoKTtcbiAgICAgICAgICAgIHRoaXMuZmlsbENhY2hlKCk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jYWNoZVtuXTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gQnVpbHRJbk5hbWVUb1NlcShJRCwgc2VxTmFtZSwgc2VxUGFyYW1zKSB7XG4gICAgbGV0IGdlbmVyYXRvciA9IEJ1aWx0SW5TZXFzW3NlcU5hbWVdLmdlbmVyYXRvcihzZXFQYXJhbXMpO1xuICAgIHJldHVybiBuZXcgU2VxdWVuY2VHZW5lcmF0b3IoSUQsIGdlbmVyYXRvcik7XG59XG5cblxuZnVuY3Rpb24gTGlzdFRvU2VxKElELCBsaXN0KSB7XG4gICAgbGV0IGxpc3RHZW5lcmF0b3IgPSBmdW5jdGlvbiAobikge1xuICAgICAgICByZXR1cm4gbGlzdFtuXTtcbiAgICB9O1xuICAgIHJldHVybiBuZXcgU2VxdWVuY2VHZW5lcmF0b3IoSUQsIGxpc3RHZW5lcmF0b3IpO1xufVxuXG5mdW5jdGlvbiBPRUlTVG9TZXEoSUQsIE9FSVMpIHtcbiAgICByZXR1cm4gbmV3IE9FSVNTZXF1ZW5jZUdlbmVyYXRvcihJRCwgT0VJUyk7XG59XG5cblxuY29uc3QgQnVpbHRJblNlcXMgPSB7fTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAnQnVpbHRJbk5hbWVUb1NlcSc6IEJ1aWx0SW5OYW1lVG9TZXEsXG4gICAgJ0xpc3RUb1NlcSc6IExpc3RUb1NlcSxcbiAgICAnT0VJU1RvU2VxJzogT0VJU1RvU2VxLFxuICAgICdCdWlsdEluU2Vxcyc6IEJ1aWx0SW5TZXFzXG59O1xuXG4vKmpzaGludCBpZ25vcmU6IHN0YXJ0ICovXG5CdWlsdEluU2Vxc1tcIkZpYm9uYWNjaVwiXSA9IHJlcXVpcmUoJy4vc2VxdWVuY2VGaWJvbmFjY2kuanMnKTtcbkJ1aWx0SW5TZXFzW1wiTHVjYXNcIl0gPSByZXF1aXJlKCcuL3NlcXVlbmNlTHVjYXMuanMnKTtcbkJ1aWx0SW5TZXFzW1wiUHJpbWVzXCJdID0gcmVxdWlyZSgnLi9zZXF1ZW5jZVByaW1lcy5qcycpO1xuQnVpbHRJblNlcXNbXCJOYXR1cmFsc1wiXSA9IHJlcXVpcmUoJy4vc2VxdWVuY2VOYXR1cmFscy5qcycpO1xuQnVpbHRJblNlcXNbXCJMaW5SZWNcIl0gPSByZXF1aXJlKCcuL3NlcXVlbmNlTGluUmVjLmpzJyk7XG5CdWlsdEluU2Vxc1snUHJpbWVzJ10gPSByZXF1aXJlKCcuL3NlcXVlbmNlUHJpbWVzLmpzJyk7IiwibW9kdWxlLmV4cG9ydHMgPSBbXCJBMDAwMDAxXCIsIFwiQTAwMDAyN1wiLCBcIkEwMDAwMDRcIiwgXCJBMDAwMDA1XCIsIFwiQTAwMDAwOFwiLCBcIkEwMDAwMDlcIiwgXCJBMDAwNzk2XCIsIFwiQTAwMzQxOFwiLCBcIkEwMDczMThcIiwgXCJBMDA4Mjc1XCIsIFwiQTAwODI3N1wiLCBcIkEwNDkzMTBcIiwgXCJBMDAwMDEwXCIsIFwiQTAwMDAwN1wiLCBcIkEwMDU4NDNcIiwgXCJBMDAwMDM1XCIsIFwiQTAwMDE2OVwiLCBcIkEwMDAyNzJcIiwgXCJBMDAwMzEyXCIsIFwiQTAwMTQ3N1wiLCBcIkEwMDQ1MjZcIiwgXCJBMDAwMzI2XCIsIFwiQTAwMjM3OFwiLCBcIkEwMDI2MjBcIiwgXCJBMDA1NDA4XCIsIFwiQTAwMDAxMlwiLCBcIkEwMDAxMjBcIiwgXCJBMDEwMDYwXCIsIFwiQTAwMDA2OVwiLCBcIkEwMDE5NjlcIiwgXCJBMDAwMjkwXCIsIFwiQTAwMDIyNVwiLCBcIkEwMDAwMTVcIiwgXCJBMDAwMDE2XCIsIFwiQTAwMDAzMlwiLCBcIkEwMDQwODZcIiwgXCJBMDAyMTEzXCIsIFwiQTAwMDAzMFwiLCBcIkEwMDAwNDBcIiwgXCJBMDAyODA4XCIsIFwiQTAxODI1MlwiLCBcIkEwMDAwNDNcIiwgXCJBMDAwNjY4XCIsIFwiQTAwMDM5NlwiLCBcIkEwMDUxMDBcIiwgXCJBMDA1MTAxXCIsIFwiQTAwMjExMFwiLCBcIkEwMDA3MjBcIiwgXCJBMDY0NTUzXCIsIFwiQTAwMTA1NVwiLCBcIkEwMDY1MzBcIiwgXCJBMDAwOTYxXCIsIFwiQTAwNTExN1wiLCBcIkEwMjA2MzlcIiwgXCJBMDAwMDQxXCIsIFwiQTAwMDA0NVwiLCBcIkEwMDAxMDhcIiwgXCJBMDAxMDA2XCIsIFwiQTAwMDA3OVwiLCBcIkEwMDA1NzhcIiwgXCJBMDAwMjQ0XCIsIFwiQTAwMDMwMlwiLCBcIkEwMDA1ODNcIiwgXCJBMDAwMTQyXCIsIFwiQTAwMDA4NVwiLCBcIkEwMDExODlcIiwgXCJBMDAwNjcwXCIsIFwiQTAwNjMxOFwiLCBcIkEwMDAxNjVcIiwgXCJBMDAxMTQ3XCIsIFwiQTAwNjg4MlwiLCBcIkEwMDA5ODRcIiwgXCJBMDAxNDA1XCIsIFwiQTAwMDI5MlwiLCBcIkEwMDAzMzBcIiwgXCJBMDAwMTUzXCIsIFwiQTAwMDI1NVwiLCBcIkEwMDAyNjFcIiwgXCJBMDAxOTA5XCIsIFwiQTAwMTkxMFwiLCBcIkEwOTAwMTBcIiwgXCJBMDU1NzkwXCIsIFwiQTA5MDAxMlwiLCBcIkEwOTAwMTNcIiwgXCJBMDkwMDE0XCIsIFwiQTA5MDAxNVwiLCBcIkEwOTAwMTZcIiwgXCJBMDAwMTY2XCIsIFwiQTAwMDIwM1wiLCBcIkEwMDExNTdcIiwgXCJBMDA4NjgzXCIsIFwiQTAwMDIwNFwiLCBcIkEwMDAyMTdcIiwgXCJBMDAwMTI0XCIsIFwiQTAwMjI3NVwiLCBcIkEwMDExMTBcIiwgXCJBMDUxOTU5XCIsIFwiQTAwMTIyMVwiLCBcIkEwMDEyMjJcIiwgXCJBMDQ2NjYwXCIsIFwiQTAwMTIyN1wiLCBcIkEwMDEzNThcIiwgXCJBMDAxNjk0XCIsIFwiQTAwMTgzNlwiLCBcIkEwMDE5MDZcIiwgXCJBMDAxMzMzXCIsIFwiQTAwMTA0NVwiLCBcIkEwMDAxMjlcIiwgXCJBMDAxMTA5XCIsIFwiQTAxNTUyMVwiLCBcIkEwMTU1MjNcIiwgXCJBMDE1NTMwXCIsIFwiQTAxNTUzMVwiLCBcIkEwMTU1NTFcIiwgXCJBMDgyNDExXCIsIFwiQTA4MzEwM1wiLCBcIkEwODMxMDRcIiwgXCJBMDgzMTA1XCIsIFwiQTA4MzIxNlwiLCBcIkEwNjEwODRcIiwgXCJBMDAwMjEzXCIsIFwiQTAwMDA3M1wiLCBcIkEwNzk5MjJcIiwgXCJBMDc5OTIzXCIsIFwiQTEwOTgxNFwiLCBcIkExMTE3NzRcIiwgXCJBMTExNzc1XCIsIFwiQTExMTc4N1wiLCBcIkEwMDAxMTBcIiwgXCJBMDAwNTg3XCIsIFwiQTAwMDEwMFwiXVxuIl19

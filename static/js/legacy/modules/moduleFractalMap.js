



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
    

const { src, dest, series, watch } = require('gulp');
const sass = require('gulp-sass');
sass.compiler = require('node-sass');

// Compile SASS to CSS and puts it all into styles.css in static/css/ folder
function compileSass() {
  return src('./src/scss/**/*.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(dest('./static/css'));
}

// Minifies styles.css into styles.css.min
function cssMinify(cb) {
    return cb();
}

exports.default = function(){
    watch('./src/scss/**/*.scss', series(compileSass, cssMinify));
}


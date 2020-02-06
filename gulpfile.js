
const { series } = require('gulp');

// Compile SASS to CSS and puts it all into styles.css in static/css/ folder
function sass() {
}

// Minifies styles.css into styles.css.min
function cssMinify() {
}

exports.default = series(sass, cssMinify);

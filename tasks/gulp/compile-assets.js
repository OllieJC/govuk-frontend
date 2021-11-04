'use strict'

const path = require('path')

const gulp = require('gulp')
const configPaths = require('../../config/paths.json')
const sass = require('gulp-sass')(require('node-sass'))
const plumber = require('gulp-plumber')
const postcss = require('gulp-postcss')
const autoprefixer = require('autoprefixer')
const rollup = require('rollup')
const taskArguments = require('./task-arguments')
const gulpif = require('gulp-if')
const uglify = require('gulp-uglify')
const eol = require('gulp-eol')
const rename = require('gulp-rename')
const cssnano = require('cssnano')
const { glob } = require('glob')
const postcsspseudoclasses = require('postcss-pseudo-classes')({
  // Work around a bug in pseudo classes plugin that badly transforms
  // :not(:whatever) pseudo selectors
  blacklist: [':not(', ':disabled)', ':last-child)', ':focus)', ':active)', ':hover)']
})

// Compile CSS and JS task --------------
// --------------------------------------

// check if destination flag is public (this is the default)
const isPublic = taskArguments.destination === 'public' || false

// check if destination flag is dist
const isDist = taskArguments.destination === 'dist' || false

// Set the destination
const destinationPath = function () {
  // Public & Dist directories do no need namespaced with `govuk`
  if (taskArguments.destination === 'dist' || taskArguments.destination === 'public') {
    return taskArguments.destination
  } else {
    return `${taskArguments.destination}/govuk/`
  }
}

const errorHandler = function (error) {
  // Log the error to the console
  console.error(error.message)

  // Ensure the task we're running exits with an error code
  this.once('finish', () => process.exit(1))
  this.emit('end')
}

function compileStyles (done) {
  const compileStylesheet = isDist ? configPaths.src + 'all.scss' : configPaths.app + 'assets/scss/app.scss'

  gulp.src(compileStylesheet)
    .pipe(plumber(errorHandler))
    .pipe(sass())
    // minify css add vendor prefixes and normalize to compiled css
    .pipe(gulpif(isDist, postcss([
      autoprefixer,
      cssnano
    ])))
    .pipe(gulpif(!isDist, postcss([
      autoprefixer,
      // Auto-generate 'companion' classes for pseudo-selector states - e.g. a
      // :hover class you can use to simulate the hover state in the review app
      postcsspseudoclasses
    ])))
    .pipe(gulpif(isDist,
      rename({
        basename: 'govuk-frontend',
        extname: '.min.css'
      })
    ))
    .pipe(gulp.dest(taskArguments.destination + '/'))

  done()
}

function compileOldIE (done) {
  const compileOldIeStylesheet = isDist ? configPaths.src + 'all-ie8.scss' : configPaths.app + 'assets/scss/app-ie8.scss'

  gulp.src(compileOldIeStylesheet)
    .pipe(plumber(errorHandler))
    .pipe(sass())
    // minify css add vendor prefixes and normalize to compiled css
    .pipe(gulpif(isDist, postcss([
      autoprefixer,
      cssnano,
      // transpile css for ie https://github.com/jonathantneal/oldie
      require('oldie')({
        rgba: { filter: true },
        rem: { disable: true },
        unmq: { disable: true },
        pseudo: { disable: true }
      })
    ])))
    .pipe(gulpif(!isDist, postcss([
      autoprefixer,
      require('oldie')({
        rgba: { filter: true },
        rem: { disable: true },
        unmq: { disable: true },
        pseudo: { disable: true }
        // more rules go here
      })
    ])))
    .pipe(gulpif(isDist,
      rename({
        basename: 'govuk-frontend-ie8',
        extname: '.min.css'
      })
    ))
    .pipe(gulp.dest(taskArguments.destination + '/'))

  done()
}

function compileLegacy (done) {
  gulp.src(path.join(configPaths.app, 'assets/scss/app-legacy.scss'))
    .pipe(plumber(errorHandler))
    .pipe(sass({
      includePaths: ['node_modules/govuk_frontend_toolkit/stylesheets', 'node_modules']
    }))
    .pipe(postcss([
      autoprefixer,
      // Auto-generate 'companion' classes for pseudo-selector states - e.g. a
      // :hover class you can use to simulate the hover state in the review app
      postcsspseudoclasses
    ]))
    .pipe(gulp.dest(taskArguments.destination + '/'))

  done()
}

function compileLegacyIE (done) {
  gulp.src(path.join(configPaths.app, 'assets/scss/app-legacy-ie8.scss'))
    .pipe(plumber(errorHandler))
    .pipe(sass({
      includePaths: ['node_modules/govuk_frontend_toolkit/stylesheets', 'node_modules']
    }))
    .pipe(postcss([
      autoprefixer,
      postcsspseudoclasses,
      require('oldie')({
        rgba: { filter: true },
        rem: { disable: true },
        unmq: { disable: true },
        pseudo: { disable: true }
      })
    ]))
    .pipe(gulp.dest(taskArguments.destination + '/'))

  done()
}

function compileFullPageStyles (done) {
  const compileFullPageExampleStylesheets = configPaths.fullPageExamples + '**/styles.scss'

  gulp.src(compileFullPageExampleStylesheets)
    .pipe(plumber(errorHandler))
    .pipe(sass())
    .pipe(rename(function (path) {
      path.basename = path.dirname
      path.dirname = ''
    }))
    .pipe(gulp.dest(taskArguments.destination + '/full-page-examples/'))

  done()
}

gulp.task('scss:compile', function (done) {
  // Default tasks if compiling for dist
  var tasks = gulp.parallel(compileStyles, compileOldIE)

  if (isPublic) {
    tasks = gulp.parallel(compileStyles, compileOldIE, compileLegacy, compileLegacyIE, compileFullPageStyles)
  } else if (!isDist) {
    tasks = gulp.parallel(compileStyles, compileOldIE, compileLegacy, compileLegacyIE)
  }

  tasks()
  done()
})

// Compile js task for preview ----------
// --------------------------------------
gulp.task('js:compile', async () => {
  // for dist/ folder we only want compiled 'all.js' file

  // TODO: handle dist
  if (isDist) {
    return rollup
    .rollup({
      input: configPaths.src + 'all.js',
    })
    .then(test => {
      console.log(test)
      return test.write({
        file: destinationPath() + '/govuk-frontend.min.js',
        format: 'umd',
        legacy: true, // needed for IE8 support, dropped in v0.60.0 of rollup
        name: 'GOVUKFrontend',
      });
    });
  } else {
    glob(configPaths.src + '**/*.js', {ignore: '**/*.test.js'}, function (error, files) {
      files.forEach(function (file) {
        return rollup
        .rollup({
          input: file,
        })
        .then(bundle => {
          let filename = file.replace('src/govuk', '')
          let modulename = path.basename(file).replace('.js', '')
          return bundle.write({
            file: destinationPath() + filename,
            format: 'umd',
            legacy: true, // needed for IE8 support, dropped in v0.60.0 of rollup
            name: modulename == 'all' ? 'GOVUKFrontend' : 'GOVUKFrontend.' + modulename
          });
        });
      })
    })
  }
})

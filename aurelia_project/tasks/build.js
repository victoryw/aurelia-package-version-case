import gulp from 'gulp';
import transpile from './transpile';
import processMarkup from './process-markup';
import processCSS from './process-css';
import {build} from 'aurelia-cli';
import project from '../aurelia.json';
import revReplace from 'gulp-rev-replace'

export default gulp.series(
  readProjectConfiguration,
  gulp.parallel(
    transpile,
    processMarkup,
    processCSS
  ),
  writeBundles,
  updateIndexFileRef
);

function readProjectConfiguration() {
  return build.src(project);
}

function writeBundles() {
  return build.dest();
}

function replaceJsIfMap(filename) {
  return filename.replace('scripts/', '');
}

function updateIndexFileRef() {
  var manifest = gulp.src("./rev-manifest.json");

  return gulp.src(["./index.html","./index2.html"])
    .pipe(revReplace({
        manifest: manifest,
        modifyUnreved: replaceJsIfMap,
        modifyReved: replaceJsIfMap
    }))
    .pipe(gulp.dest("./scripts"));

}





import gulp from 'gulp';
import transpile from './transpile';
import processMarkup from './process-markup';
import processCSS from './process-css';
import {build} from 'aurelia-cli';
import project from '../aurelia.json';
import revReplace from 'gulp-rev-replace'
import fileFinder from 'fs-finder'
import fs from 'fs'
import find from 'find'
import _ from 'underscore'
import jsonfile from 'jsonfile'
import path from 'path'


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

function updateIndexFileRef() {
  let revFileLocation = path.join('./','scripts/rev-manifest.json');
  var manifest = gulp.src(revFileLocation);
  getBundleFileNames(revFileLocation);

  return gulp.src(["./index.html","./index2.html"])
    .pipe(revReplace({
        manifest: manifest
    }))
    .pipe(gulp.dest("./"));
}


function getBundleFileNames(revFileLocation) {
  let files = find.fileSync(/\.js$/,'./scripts');

  var fileVecMappings = files.map(file => {
    let names = file.split(/[-.]/); //the name should be app-bundle-c8a2963f94.js
    ///TODO:app-bundle.js
    return {
      name : file.replace('scripts/',''),
      source: file.replace('scripts/','').replace("-"+names[names.length - 2],""),
      createTime: fs.statSync(file).mtime.getTime()
    }});


  // console.log(_.max(value,file=>file.createTime));
  var mapping = _.object(
    _.map(_.chain(fileVecMappings)
      .groupBy(file=> {return file.source})
      .map((value, key)=> {
        return {
          source : key,
          fileRev: _.max(value, file=> {return file.createTime}).name
        }
      })
      .value(),
      _.values));

  jsonfile.writeFileSync(revFileLocation, mapping);

}





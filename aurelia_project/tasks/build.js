import gulp from 'gulp';
import transpile from './transpile';
import processMarkup from './process-markup';
import processCSS from './process-css';
import project from '../aurelia.json';
import revReplace from 'gulp-rev-replace'
import fileFinder from 'fs-finder'
import fs from 'fs';
import find from 'find';
import _ from 'underscore';
import jsonfile from 'jsonfile';
import path from 'path';
import fse from 'fs-extra';
import {CLIOptions, build} from 'aurelia-cli';


export default gulp.series(
  readProjectConfiguration,
  //should clean the output folder when the rev is enabled
  gulp.parallel(
    transpile,
    processMarkup,
    processCSS
  ),
  writeBundles,
  updateIndexFileRef2
);

function readProjectConfiguration() {
  return build.src(project);
}

function writeBundles() {
  return build.dest();
}


function copyFileToDestin(){
  return gulp.src
}

function updateIndexFileRef2(){
  //delete  rev-manifest.json, file location should be accorded to aurelia.json setting
  let outputFolder = project.build.targets[0].output;
  let revFileLocation = path.join('./',outputFolder,'/rev-manifest.json');

  if(fs.existsSync(revFileLocation)){
    fs.unlinkSync(revFileLocation);
  }

  let mapping = {};
  let files = find.fileSync(/\.js$/,outputFolder).filter(file => {return file.split('/').length <=2;});
  
  if(isEnableRev(project.build.options)){


    var fileVecMappings = files.map(file => {
      let names = file.split(/[-.]/); //the name should be app-bundle-c8a2963f94.js
      ///TODO:app-bundle.js
      return {
        name : file.replace(outputFolder+'/',''),
        source: file.replace(outputFolder+'/','').replace("-"+names[names.length - 2],""),
        createTime: fs.statSync(file).mtime.getTime()
      }});


    // console.log(_.max(value,file=>file.createTime));
    mapping = _.object(
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
    fileVecMappings.map(file=>file.name).forEach(file => fse.copySync('./'+outputFolder+'/'+file, './'+outputFolder+'/'+outputFolder+'/'+file));
  }
  else{
    jsonfile.writeFileSync(revFileLocation, mapping);
    files.forEach(file => fse.copySync(outputFolder+'/'+file, outputFolder+'/'+'/'+file));
  }


  var manifest = gulp.src(revFileLocation);
  return gulp.src(["./index.html","./index2.html"])
    .pipe(revReplace(
      {manifest: manifest}
    ))
    .pipe(gulp.dest(outputFolder));

  //if rev enable in the env then create actully rev-manifest.json
  //else output empty rev-manifest.json

  //replace the build entry point reference of bundle.js by rev-manifest.json
  //if rev-manifest is empty should keep the origin reference
  //and out put the replaced entry point to output file
}

function isEnableRev(options) {
  let env = CLIOptions.getEnvironment();
  let revValue = options['rev'];

  if (typeof revValue === 'boolean'){
    return revValue;
  } else if (typeof revValue === 'string'){
    let parts = revValue.split('&').map(x => x.trim().toLowerCase());
    return parts.indexOf(env) !== -1;
  } else {
    return false;
  }
}

function updateIndexFileRef() {
  let revFileLocation = path.join('./','scripts/rev-manifest.json');
  getBundleFileNames(revFileLocation);
  var manifest = gulp.src(revFileLocation);

  return gulp.src(["./index.html","./index2.html"])
    .pipe(revReplace({
        manifest: manifest
    }))
    .pipe(gulp.dest("./scripts"));
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

  console.log(fileVecMappings);
  // fse.copySync('./scripts/'+file.name, './scripts/scripts'+file.name)
  fileVecMappings.forEach(file => fse.copySync('./scripts/'+file.name, './scripts/scripts/'+file.name));

  jsonfile.writeFileSync(revFileLocation, mapping);

}





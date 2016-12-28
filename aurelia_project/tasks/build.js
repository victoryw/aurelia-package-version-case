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
  cleanEnv,
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


function cleanEnv(callback) {
  if(isEnableRev()){
    let outputFolder = project.build.targets[0].output;
    deleteFolderRecursive(outputFolder);
  }
  callback();
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

  if(isEnableRev()){
    var fileVecMappings = files.map(file => {
      let names = file.split(/[-.]/); //the name should be app-bundle-c8a2963f94.js
      ///TODO:app-bundle.js
      return {
        name : file.replace(outputFolder+'/',''),
        source: file.replace(outputFolder+'/','').replace("-"+names[names.length - 2],""),
        createTime: fs.statSync(file).mtime.getTime()
      }});
    ;
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
    console.log(files);
    files.map(file=>file.replace(outputFolder+'/','')).forEach(file => fse.copySync('./'+outputFolder+'/'+file, './'+outputFolder+'/'+outputFolder+'/'+file));
  }


  var manifest = gulp.src(revFileLocation);
  return gulp.src(["./index.html","./index2.html"])
    .pipe(revReplace(
      {manifest: manifest}
    ))
    .pipe(gulp.dest(outputFolder));
}

function isEnableRev() {
  let options = project.build.options;
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

var deleteFolderRecursive = function(path) {
  if( fs.existsSync(path) ) {
    fs.readdirSync(path).forEach(function(file,index){
      var curPath = path + "/" + file;
      if(fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};



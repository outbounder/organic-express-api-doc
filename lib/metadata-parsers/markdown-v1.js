var markedejs = require("markedejs")
var fs = require("fs")
var path = require("path")
var async = require("async")
var glob = require("glob-stream")

var allowedMethods = ["get", "post", "put", "delete"]
var findMethod = function(line){
  var parts = line.replace("## ", "").split(" ")
  return parts.shift().trim().toLowerCase()

}
var findUrl = function(line){
  var parts = line.replace("## ", "").split(" ")
  parts.shift() // pass method
  var url = parts.shift()
  if(url)
    return url.trim()
}

module.exports.loadMetada = function(metadataDefinition, done){
  var files = []
  var result = {}
  var loadFileAndStoreMetadata = function(value, next) {
    fs.readFile(value, function(err, contents){
      if(err) return next(err)

      var lines = contents.toString().split("\n")
      var actionMethod
      var actionUrl
      var actionMetadata

      lines.forEach(function(line){
        if(line.indexOf("## ") == 0) {

          var recognizedMethod = findMethod(line)
          var recognizedUrl = findUrl(line)
          if(allowedMethods.indexOf(recognizedMethod) == -1)
            return

          if(actionMethod && actionUrl) {
            if(!result[actionMethod])
              result[actionMethod] = {}
            if(!result[actionMethod][actionUrl])
              result[actionMethod][actionUrl] = ""
            result[actionMethod][actionUrl] += actionMetadata
          }

          actionMetadata = ""
          actionMethod = recognizedMethod
          actionUrl = recognizedUrl
        } else
          if(actionMethod && actionUrl)
            actionMetadata += line+"\n"
      })

      if(actionUrl && actionMethod && actionMetadata) {
        if(!result[actionMethod])
          result[actionMethod] = {}
        if(!result[actionMethod][actionUrl])
          result[actionMethod][actionUrl] = ""
        result[actionMethod][actionUrl] += actionMetadata
      }

      next()
    })
  }
  glob.create(path.join(process.cwd(), metadataDefinition.source)+"/**/*.md")
    .on('data', function(file){
      files.push(file.path)
    })
    .on('end', function(){
      async.eachSeries(files, loadFileAndStoreMetadata, function(err){
        if(err) return done(err)
        done(null, result)
      })
    })
}

module.exports.loadAndRenderMetadata = function(metadataDefinition, doc, done) {
  var self = this
  module.exports.loadMetada(metadataDefinition, function(err, metadataStore){
    if(err) return done(err)
    async.mapSeries(doc.apis, function(api, nextApi){
      async.mapSeries(api.actions, function(action, nextAction){
        if(metadataStore[action.method] && metadataStore[action.method][action.actionUrl]) {

          action.metadata = metadataStore[action.method][action.actionUrl]
          markedejs.render(action.metadata, {api: api, doc: doc, action: action}, function(err, html){
            if(err) return nextAction(err)
            action.metadata = html
            nextAction()
          })
        } else
          nextAction()
      }, nextApi)
    }, done)
  })
}
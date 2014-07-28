var Nucleus = require("organic-nucleus")
var clone = require("clone")
var markedejs = require("markedejs")
var fs = require("fs")
var path = require("path")
var esprima = require("esprima")
var async = require("async")
var _ = require("underscore")

var addSpaces = function(count) {
  var result = ""
  for(var i = 0; i<count; i++)
    result += " "
  return result
}

var ExpressMock = function(){
  var self = this
  var methods = ["get", "post", "put", "delete", "all"]

  this.documentation = {
    actions: [/*{
      url: "/api/bla/:id",
      method: "POST",
      comments: "# Markdown"
    }*/]
  }

  this.use = function(){
    console.warn("used `use` but not implemented", arguments)
  }
  methods.forEach(function(method){
    self[method] = function(url, handlers){
      if(!Array.isArray(handlers))
        handlers = [handlers]
      var action = {
        url: url,
        method: method,
        comments: ""
      }
      handlers.forEach(function(handler, index){
        var handler_source = "module.exports = "+handler.toString()
        var ast = esprima.parse(handler_source, {comment: true})
        var comments = ast.comments.map(function(c){
          return c.value
        }).join("\n")
        if(comments.indexOf("# action") == -1) return
        comments = comments.replace("# action", "")
        action.comments += comments
      })
      
      if(action.comments)
        self.documentation.actions.push(action)
    }
  })
}
var generateStaticHtml = function(doc, done){
  
  doc.actions = _.sortBy(doc.actions, function(a){
    return a.url+a.method
  })

  async.map(doc.actions, function(action, next){
    markedejs.render(action.comments, {doc: doc, action: action}, function(err, html){
      if(err) return next(err)
      action.comments = html
      next()
    })
  }, function(err){
    if(err) return done(err)
    fs.readFile(path.join(__dirname,"template.html"), function(err, templateData){
      if(err) return done(err)
      var filepath = path.join(__dirname, "output.html")
      markedejs.render(templateData.toString(), doc, function(err, html){
        if(err) return done(err)
        fs.writeFile(filepath, html, function(err){
          if(err) return done(err)
          done(null, filepath)
        })  
      })
    })
  })
  
}
module.exports = function(plasma, dna) {
  var documentExpressDNA = { plasma: clone(dna.dna) }
  for(var key in documentExpressDNA.plasma) {
    documentExpressDNA.plasma[key].reactOn = "document"
    documentExpressDNA.plasma[key].emitReady = "documentDone"
    documentExpressDNA.plasma[key].log = false
  }
  var nucleus = new Nucleus(plasma, documentExpressDNA)
  nucleus.build("plasma")
  plasma.on(dna.reactOn, function(c){
    var app = c.data || c[0].data
    var fakeExpressMock = new ExpressMock()
    plasma.on("documentDone", function(){
      generateStaticHtml(fakeExpressMock.documentation, function(err, file){
        if(err) console.error(err)
        console.info("documentation updated and accessible at -> ", dna.mount)
        app.get(dna.mount, function(req, res, next){
          res.sendfile(file)
        })
      })
    })
    plasma.emit({
      type: "document",
      data: fakeExpressMock
    })
  })
}
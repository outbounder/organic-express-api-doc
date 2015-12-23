var esprima = require("esprima")
var path = require("path")
var _ = require("lodash")

var Documentation = require("./models/documentation")
var Api = require("./models/api")
var Action = require("./models/action")

var methods = require('methods')
methods.push("all")

module.exports = function(dna){
  this.actions = [
    /*
      {
        url: String,
        method: String,
        handlers : Array[ Function ]
      }
    */
  ]
}

module.exports.prototype.use = function(){
  console.warn("used `use` but not implemented", arguments)
}

methods.forEach(function(method){
  module.exports.prototype[method] = function(url, handlers){
    if(!Array.isArray(handlers))
      handlers = [handlers]
    var isNew = true
    for(var i = 0; i<this.actions.length; i++)
      if(this.actions[i].url == url && this.actions[i].method == method) {
        this.actions[i].handlers = this.actions[i].handlers.concat(handlers)
        isNew = false
        break
      }
    if(isNew) {
      this.actions.push({
        url: url,
        method: method,
        handlers: handlers
      })
    }
  }
})

module.exports.prototype.generateDocumentation = function() {
  var packagejson = require(path.join(process.cwd(), "package.json"))
  var result = new Documentation({})
  result.name = packagejson.name
  result.version = packagejson.version
  result.apis = this.extractApis(this.actions)
  return result
}

module.exports.prototype.extractApis = function(actions){
  actions = _.sortBy(actions, 'url')

  var apis = []
  /*
   0 /api/vesrion
   1 /api/users/me
   2 /api/users/:userId
   3 /api/users/:userId/test
   4 /api/groups
   5 /api/groups/:id
   6 /api/groups/:id
  */
  for(var i = 0; i<actions.length; i++) {
    var isNew = true
    var recognizedActionBaseUrl = actions[i].url
    if(recognizedActionBaseUrl.indexOf("/:") > -1)
      recognizedActionBaseUrl = recognizedActionBaseUrl.split("/:").shift()
    if(recognizedActionBaseUrl.indexOf("*") > -1)
      recognizedActionBaseUrl = recognizedActionBaseUrl.split("*").shift()

    for(var k = 0; k<apis.length; k++) {
      if(recognizedActionBaseUrl == apis[k].baseUrl) {
        isNew = false
        apis[k].actions.push(this.extractAction(actions[i]))
        break
      }
    }

    if(isNew)
      for(var k = 0; k<apis.length; k++) {
        if(recognizedActionBaseUrl.indexOf(apis[k].baseUrl) == 0 &&
          (actions[i].url.indexOf("/:") != -1 || actions[i].url.indexOf("*") != -1)) {
          isNew = false
          apis[k].actions.push(this.extractAction(actions[i]))
          break
        }
      }

    if(isNew) {
      apis.push(new Api({
        baseUrl: recognizedActionBaseUrl,
        actions: [ this.extractAction(actions[i]) ]
      }))
    }
  }

  apis = _.sortBy(apis, 'baseUrl')

  var CRUD = ["all", "post", "get", "put", "delete"]
  for(var i = 0; i<apis.length; i++) {
    apis[i].actions = _(apis[i].actions)
      .sortBy(function(a){
        return CRUD.indexOf(a.method)
      })
      .sortBy(function(a){
        if(a.method == "all" || a.actionUrl.indexOf("*") > -1)
          return "A"+a.actionUrl
        else
        if(a.actionUrl.indexOf("/:") == -1)
          return "B"+a.actionUrl
        else
        if(a.actionUrl.indexOf("/:") == a.actionUrl.lastIndexOf("/"))
          return "C"+a.actionUrl
        else
        if(a.actionUrl.indexOf("/:") == a.actionUrl.lastIndexOf("/:"))
          return "D"+a.actionUrl
        else
          return "E"+a.actionUrl
      })
      .value()
  }
  return apis
}

module.exports.prototype.extractAction = function(actionData){
  var result = new Action({
    method: actionData.method,
    actionUrl: actionData.url,
    handlers: actionData.handlers
  })
  result.handlers.forEach(function(handler, index){
    var handler_source = "module.exports = "+handler.toString()
    var ast = esprima.parse(handler_source, {comment: true})
    var comments = ast.comments.map(function(c){
      return c.value
    }).join("\n")
    result.comments += "<br />"+comments
  })
  return result
}

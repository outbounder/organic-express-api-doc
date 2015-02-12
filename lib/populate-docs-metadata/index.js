var fs = require('fs')
var BufferRes = require('express-buffer-response')

var routes_map = {/*
  "method" : {
    "route": {
      success_samples: [{
        req: {
          path: String,
          headers: {...},
          body: {...}
        },
        res: {
          headers: {...},
          body: {...}
        }
      }],
      invalid_samples: [...]
    }
  }
*/}

var dumpSuccessfulRequests = function(action){
  var result = ""
  for(var i = 0; i<action.success_samples.length; i++) {
    var success = action.success_samples[i]
    result += [
      "### successful request",
      "",
      "```",
      success.req.method.toUpperCase()+" "+success.req.path,
      "headers:"+JSON.stringify(success.req.headers, null, 2),
      "body:"+JSON.stringify(success.req.body, null, 2),
      "```",
      "#### response",
      "```",
      "headers:"+JSON.stringify(success.res.headers || {}, null, 2),
      "body:"+JSON.stringify(success.res.body || {}, null, 2),
      "```",
      ""
    ].join("\n")
  }
  return result
}

var dumpStatusCodes = function(action) {
  var codes = []
  if(action.success_samples.length > 0)
    codes.push({
      code: 200,
      message: "successful request"
    })
  for(var i = 0; i<action.invalid_samples.length; i++)
    codes.push({
      code: action.invalid_samples[i].res.statusCode,
      message: JSON.stringify(action.invalid_samples[i].res.body, null, 2)
    })
  return [
    "### response codes",
    "",
    codes.map(function(c){
      if(c.code == 200)
        return "* "+c.code+" - "+c.message
      return [
        "* **"+c.code+"**",
        "  ```",
        "  body: "+c.message,
        "  ```"
      ].join("\n")
    }).join("\n"),
    ""
  ].join("\n")
}

var dumpAction = function(method, route, action){
  return [
    "## "+method.toUpperCase()+" "+route,
    "",
    dumpSuccessfulRequests(action),
    dumpStatusCodes(action)
  ].join("\n")
}

var remember = function(req, res, res_body) {
  if(!routes_map[req.method])
    routes_map[req.method] = {}
  if(!routes_map[req.method][req.route.path])
    routes_map[req.method][req.route.path] = {
      success_samples: [],
      invalid_samples: []
    }

  var samples
  if(res.statusCode == 200)
    samples = routes_map[req.method][req.route.path].success_samples
  else
    samples = routes_map[req.method][req.route.path].invalid_samples

  try {
    res_body = JSON.parse(res_body)
  } catch(err){
    res_body = "..."
  }

  samples.push({
    req: {
      path: req.path,
      method: req.method,
      headers: req.headers,
      body: req.body
    },
    res: {
      headers: res.headers,
      body: res_body,
      statusCode: res.statusCode
    }
  })
}

module.exports.middleware = function(req, res, next){
  BufferRes(res, function(err, res_body){
    remember(req, res, res_body.toString())
  })
  next()
}

module.exports.dumpToFile = function(filepath, next) {
  var fileContent = ""
  for(var method in routes_map) {
    for(var route in routes_map[method]) {
      fileContent += dumpAction(method, route, routes_map[method][route])
    }
  }

  fs.writeFile(filepath, fileContent, next)
}
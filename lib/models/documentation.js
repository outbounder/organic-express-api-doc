module.exports = function(data){
  this.name = data.name
  this.version = data.version
  this.apis = data.apis || []
}
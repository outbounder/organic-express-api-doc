module.exports = function(data){
  this.method = data.method
  this.actionUrl = data.actionUrl
  this.handlers = data.handlers || []
  this.comments = data.comments || ""
  this.metadata = data.metadata || ""
}
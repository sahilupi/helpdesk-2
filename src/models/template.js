const mongoose = require('mongoose')

const COLLECTION = 'templates'

const templateSchema = mongoose.Schema({
  name: { type: String, required: true },
  subject: { type: String, required: true },
  displayName: String,
  description: String,
  data: { type: Object, required: true }
})

templateSchema.pre('save', function (next) {
  this.name = this.name.trim()

  return next()
})

templateSchema.statics.get = function (name, callback) {
  return this.model(COLLECTION)
    .findOne({ name })
    .exec(callback)
}

module.exports = mongoose.model(COLLECTION, templateSchema)

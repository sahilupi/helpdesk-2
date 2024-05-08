

const mongoose = require('mongoose')

const COLLECTION = 'counters'

const countersSchema = mongoose.Schema({
  _id: String,
  next: { type: Number, default: 0 },
})

countersSchema.statics.increment = function (counter, callback) {
  return this.collection.findOneAndUpdate({ _id: counter }, { $inc: { next: 1 } }, { upsert: true }, callback)
}

countersSchema.statics.setCounter = function (counter, count, callback) {
  return this.collection.findOneAndUpdate({ _id: counter }, { $set: { next: count } }, { upsert: true }, callback)
}

module.exports = mongoose.model(COLLECTION, countersSchema)

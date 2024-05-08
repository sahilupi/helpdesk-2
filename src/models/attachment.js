

const mongoose = require('mongoose')
const utils = require('../helpers/utils')

const attachmentSchema = mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'accounts' },
  name: { type: String, required: true },
  date: { type: Date, required: true, default: Date.now },
  path: { type: String, required: true },
  type: { type: String, required: true }
})

attachmentSchema.pre('save', function (next) {
  this.name = utils.sanitizeFieldPlainText(this.name.trim())

  return next()
})

module.exports = attachmentSchema

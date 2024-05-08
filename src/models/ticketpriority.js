// var _               = require('lodash');
const mongoose = require('mongoose')
const moment = require('moment')
require('moment-duration-format')
const utils = require('../helpers/utils')

const COLLECTION = 'priorities'

const prioritySchema = mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    overdueIn: { type: Number, required: true, default: 2880 }, // Minutes until overdue (48 Hours)
    htmlColor: { type: String, default: '#29b955' },

    migrationNum: { type: Number, index: true }, // Needed to convert <1.0 priorities to new format.
    default: { type: Boolean }
  },
  {
    toJSON: {
      virtuals: true
    }
  }
)

prioritySchema.pre('save', function (next) {
  this.name = utils.sanitizeFieldPlainText(this.name.trim())

  return next()
})

prioritySchema.virtual('durationFormatted').get(function () {
  const priority = this
  return moment
    .duration(priority.overdueIn, 'minutes')
    .format('Y [year], M [month], d [day], h [hour], m [min]', { trim: 'both' })
})

prioritySchema.statics.getPriority = function (_id, callback) {
  return this.model(COLLECTION)
    .findOne({ _id })
    .exec(callback)
}

prioritySchema.statics.getPriorities = function (callback) {
  return this.model(COLLECTION)
    .find({})
    .exec(callback)
}

prioritySchema.statics.getByMigrationNum = function (num, callback) {
  const q = this.model(COLLECTION).findOne({ migrationNum: num })

  return q.exec(callback)
}

module.exports = mongoose.model(COLLECTION, prioritySchema)

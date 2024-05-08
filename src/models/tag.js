const mongoose = require('mongoose')
const utils = require('../helpers/utils')

const COLLECTION = 'tags'

/**
 * Tag Schema
 * @module models/tag
 * @class Tag

 *
 * @property {object} _id ```Required``` ```unique``` MongoDB Object ID
 * @property {String} name ```Required``` ```unique``` Name of Tag
 */
const tagSchema = mongoose.Schema({
  name: { type: String, required: true, unique: true },
  normalized: String
})

tagSchema.pre('save', function (next) {
  this.name = utils.sanitizeFieldPlainText(this.name.trim())
  this.normalized = utils.sanitizeFieldPlainText(this.name.toLowerCase().trim())

  return next()
})

tagSchema.statics.getTag = function (id, callback) {
  const q = this.model(COLLECTION).findOne({ _id: id })

  return q.exec(callback)
}

/**
 * Return all Tags
 *
 * @memberof Tag
 * @static
 * @method getTags
 *
 * @param {QueryCallback} callback MongoDB Query Callback
 */
tagSchema.statics.getTags = function (callback) {
  const q = this.model(COLLECTION)
    .find({})
    .sort('normalized')

  return q.exec(callback)
}

tagSchema.statics.getTagsWithLimit = function (limit, page, callback) {
  const q = this.model(COLLECTION)
    .find({})
    .sort('normalized')

  if (limit !== -1) {
    q.limit(limit).skip(page * limit)
  }

  return q.exec(callback)
}

tagSchema.statics.getTagByName = function (tagName, callback) {
  const q = this.model(COLLECTION)
    .find({ name: tagName })
    .limit(1)

  return q.exec(callback)
}

tagSchema.statics.tagExist = function (tagName, callback) {
  const q = this.model(COLLECTION).countDocuments({ name: tagName })

  return q.exec(callback)
}

tagSchema.statics.getTagCount = function (callback) {
  const q = this.model(COLLECTION)
    .countDocuments({})
    .lean()

  return q.exec(callback)
}

module.exports = mongoose.model(COLLECTION, tagSchema)

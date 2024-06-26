const _ = require('lodash')
const mongoose = require('mongoose')
const utils = require('../helpers/utils')

// Refs
require('./user')

const COLLECTION = 'teams'

const teamSchema = mongoose.Schema({
  name: { type: String, required: true, unique: true },
  normalized: { type: String, required: true, unique: true, lowercase: true },
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'accounts',
      autopopulate: { select: '-hasL2Auth -preferences -__v' }
    }
  ]
})

teamSchema.plugin(require('mongoose-autopopulate'))

teamSchema.pre('validate', function () {
  this.normalized = utils.sanitizeFieldPlainText(this.name.trim().toLowerCase())
})

teamSchema.pre('save', function (next) {
  this.name = utils.sanitizeFieldPlainText(this.name.trim())

  return next()
})

teamSchema.methods.addMember = async function (memberId, callback) {
  return new Promise((resolve, reject) => {
    ; (async () => {
      if (_.isUndefined(memberId)) {
        if (typeof callback === 'function') return callback({ message: 'Invalid MemberId - TeamSchema.AddMember()' })
        return reject(new Error('Invalid MemberId - TeamSchema.AddMember()'))
      }

      if (this.members === null) this.members = []

      this.members.push(memberId)
      this.members = _.uniq(this.members)

      if (typeof callback === 'function') return callback(null, true)

      return resolve(true)
    })()
  })
}

teamSchema.methods.removeMember = function (memberId, callback) {
  return new Promise((resolve, reject) => {
    ; (async () => {
      if (_.isUndefined(memberId)) {
        if (typeof callback === 'function') return callback({ message: 'Invalid MemberId - TeamSchema.RemoveMember()' })
        return reject(new Error('Invalid MemberId - TeamSchema.RemoveMember()'))
      }

      // if (!isMember(this.members, memberId)) {
      //   if (typeof callback === 'function') return callback(null, false)
      //   return reject(false)
      // }
      this.members.splice(_.indexOf(this.members, _.find(this.members, { _id: memberId })), 1)
      this.members = _.uniq(this.members)

      if (typeof callback === 'function') return callback(null, true)

      return resolve(true)
    })()
  })
}

teamSchema.methods.isMember = function (memberId) {
  return isMember(this.members, memberId)
}

teamSchema.statics.getWithObject = function (obj, callback) {
  if (!obj) return callback({ message: 'Invalid Team Object - TeamSchema.GetWithObject()' })

  const q = this.model(COLLECTION)
    .find({})
    .skip(obj.limit * obj.page)
    .limit(obj.limit)
    .sort('name')

  return q.exec(callback)
}

teamSchema.statics.getTeamByName = function (name, callback) {
  if (_.isUndefined(name) || name.length < 1) return callback('Invalid Team Name - TeamSchema.GetTeamByName()')

  const q = this.model(COLLECTION).findOne({ normalized: name })

  return q.exec(callback)
}

teamSchema.statics.getTeams = function (callback) {
  const q = this.model(COLLECTION)
    .find({})
    .sort('name')

  return q.exec(callback)
}

teamSchema.statics.getTeamsByIds = function (ids, callback) {
  return this.model(COLLECTION)
    .find({ _id: { $in: ids } })
    .sort('name')
    .exec(callback)
}

teamSchema.statics.getTeamsNoPopulate = function (callback) {
  const q = this.model(COLLECTION)
    .find({})
    .sort('name')

  return q.exec(callback)
}

teamSchema.statics.getTeamsOfUser = function (userId, callback) {
  return new Promise((resolve, reject) => {
    ; (async () => {
      if (_.isUndefined(userId)) {
        if (typeof callback === 'function') callback('Invalid UserId - TeamSchema.GetTeamsOfUser()')
        return reject(new Error('Invalid UserId - TeamSchema.GetTeamsOfUser()'))
      }

      try {
        const q = this.model(COLLECTION)
          .find({ members: userId })
          .sort('name')

        if (typeof callback === 'function') return q.exec(callback)

        const teams = await q.exec()

        return resolve(teams)
      } catch (error) {
        if (typeof callback === 'function') return callback(error)

        return reject(error)
      }
    })()
  })
}

teamSchema.statics.getTeamsOfUserNoPopulate = function (userId, callback) {
  if (_.isUndefined(userId)) return callback('Invalid UserId - TeamSchema.GetTeamsOfUserNoPopulate()')

  const q = this.model(COLLECTION)
    .find({ members: userId })
    .sort('name')

  return q.exec(callback)
}

teamSchema.statics.getTeam = function (id, callback) {
  if (_.isUndefined(id)) return callback('Invalid TeamId - TeamSchema.GetTeam()')

  const q = this.model(COLLECTION).findOne({ _id: id })

  return q.exec(callback)
}

function isMember(arr, id) {
  const matches = _.filter(arr, function (value) {
    if (value._id.toString() === id.toString()) return value
  })

  return matches.length > 0
}

module.exports = mongoose.model(COLLECTION, teamSchema)

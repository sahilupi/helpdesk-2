const mongoose = require('mongoose')
const mongooseLeanVirtuals = require('mongoose-lean-virtuals')
const _ = require('lodash')
const utils = require('../helpers/utils')

const COLLECTION = 'roles'

const roleSchema = mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    normalized: String,
    description: String,
    grants: [{ type: String, required: true }],
    hierarchy: { type: Boolean, required: true, default: true }
  },
  {
    toObject: { getters: true, virtuals: true },
    toJSON: { virtuals: true }
  }
)

roleSchema.virtual('isAdmin').get(function () {
  if (_.isUndefined(global.roles)) return false
  const role = _.find(global.roles, { normalized: this.normalized })
  if (!role) return false

  return _.indexOf(role.grants, 'admin:*') !== -1
})

roleSchema.virtual('isAgent').get(function () {
  if (_.isUndefined(global.roles)) return false
  const role = _.find(global.roles, { normalized: this.normalized })
  if (!role) return false

  return _.indexOf(role.grants, 'agent:*') !== -1
})

roleSchema.plugin(mongooseLeanVirtuals)

roleSchema.pre('save', function (next) {
  this.name = utils.sanitizeFieldPlainText(this.name.trim())
  this.normalized = utils.sanitizeFieldPlainText(this.name.toLowerCase().trim())

  return next()
})

roleSchema.methods.updateGrants = function (grants, callback) {
  this.grants = grants
  this.save(callback)
}

roleSchema.methods.updateGrantsAndHierarchy = function (grants, hierarchy, callback) {
  this.grants = grants
  this.hierarchy = hierarchy
  this.save(callback)
}

roleSchema.statics.getRoles = function (callback) {
  return this.model(COLLECTION)
    .find({})
    .exec(callback)
}

roleSchema.statics.getRolesLean = function (callback) {
  return this.model(COLLECTION)
    .find({})
    .lean({ virtuals: true })
    .exec(callback)
}

roleSchema.statics.getRole = function (id, callback) {
  const q = this.model(COLLECTION).findOne({ _id: id })

  return q.exec(callback)
}

roleSchema.statics.getRoleByName = function (name, callback) {
  const q = this.model(COLLECTION).findOne({ normalized: new RegExp('^' + name.trim() + '$', 'i') })

  return q.exec(callback)
}

roleSchema.statics.getAgentRoles = function (callback) {
  const q = this.model(COLLECTION).find({})
  q.exec(function (err, roles) {
    if (err) return callback(err)

    const rolesWithAgent = _.filter(roles, function (role) {
      return _.indexOf(role.grants, 'agent:*') !== -1
    })

    return callback(null, rolesWithAgent)
  })
}

// Alias
roleSchema.statics.get = roleSchema.statics.getRole

module.exports = mongoose.model(COLLECTION, roleSchema)

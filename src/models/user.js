const async = require('async')
const mongoose = require('mongoose')
const winston = require('winston')
const bcrypt = require('bcrypt')
const _ = require('lodash')
const Chance = require('chance')
const utils = require('../helpers/utils')

// Required for linkage
require('./role')

const SALT_FACTOR = 10
const COLLECTION = 'accounts'

/**
 * User Schema
 * @module models/user
 * @class User
 *
 * @property {object} _id ```Required``` ```unique``` MongoDB Object ID
 * @property {String} username ```Required``` ```unique``` Username of user
 * @property {String} password ```Required``` Bcrypt password
 * @property {String} fullname ```Required``` Full name of user
 * @property {String} email ```Required``` ```unique``` Email Address of user
 * @property {String} role ```Required``` Permission role of the given user. See {@link Permissions}
 * @property {Date} lastOnline Last timestamp given user was online.
 * @property {String} title Job Title of user
 * @property {String} image Filename of user image
 * @property {String} resetPassHash Password reset has for recovery password link.
 * @property {Date} resetPassExpire Date when the password recovery link will expire
 * @property {String} tOTPKey One Time Password Secret Key
 * @property {Number} tOTPPeriod One Time Password Key Length (Time) - Default 30 Seconds
 * @property {String} accessToken API Access Token
 * @property {Object} preferences Object to hold user preferences
 * @property {Boolean} preferences.autoRefreshTicketGrid Enable the auto refresh of the ticket grid.
 * @property {Boolean} deleted Account Deleted
 */
const userSchema = mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  fullname: { type: String, required: true, index: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  role: { type: mongoose.Schema.Types.ObjectId, ref: 'roles', required: true },
  lastOnline: Date,
  title: String,
  image: String,

  workNumber: { type: String },
  mobileNumber: { type: String },
  companyName: { type: String },
  facebookUrl: { type: String },
  linkedinUrl: { type: String },
  twitterUrl: { type: String },

  resetPassHash: { type: String, select: false },
  resetPassExpire: { type: Date, select: false },
  tOTPKey: { type: String, select: false },
  tOTPPeriod: { type: Number, select: false },
  resetL2AuthHash: { type: String, select: false },
  resetL2AuthExpire: { type: Date, select: false },
  hasL2Auth: { type: Boolean, required: true, default: false },
  accessToken: { type: String, sparse: true, select: false },

  preferences: {
    tourCompleted: { type: Boolean, default: false },
    autoRefreshTicketGrid: { type: Boolean, default: true },
    openChatWindows: [{ type: String, default: [] }],
    keyboardShortcuts: { type: Boolean, default: true },
    timezone: { type: String }
  },

  deleted: { type: Boolean, default: false }
})

userSchema.set('toObject', { getters: true })

const autoPopulateRole = function (next) {
  this.populate('role', 'name description normalized _id')
  next()
}

userSchema.pre('findOne', autoPopulateRole).pre('find', autoPopulateRole)

userSchema.pre('save', function (next) {
  const user = this

  user.username = utils.applyMaxShortTextLength(utils.sanitizeFieldPlainText(user.username.toLowerCase().trim()))
  user.email = utils.sanitizeFieldPlainText(user.email.trim())

  if (user.fullname) user.fullname = utils.applyMaxShortTextLength(utils.sanitizeFieldPlainText(user.fullname.trim()))
  if (user.title) user.title = utils.applyMaxShortTextLength(utils.sanitizeFieldPlainText(user.title.trim()))

  if (!user.isModified('password')) {
    return next()
  }

  if (user.password.toString().length > 255) user.password = utils.applyMaxTextLength(user.password)

  bcrypt.genSalt(SALT_FACTOR, function (err, salt) {
    if (err) return next(err)

    bcrypt.hash(user.password, salt, function (err, hash) {
      if (err) return next(err)

      user.password = hash
      return next()
    })
  })
})

userSchema.methods.addAccessToken = function (callback) {
  const user = this
  const date = new Date()
  const salt = user.username.toString() + date.toISOString()
  const chance = new Chance(salt)
  user.accessToken = chance.hash()
  user.save(function (err) {
    if (err) return callback(err, null)

    return callback(null, user.accessToken)
  })
}

userSchema.methods.removeAccessToken = function (callback) {
  const user = this
  if (!user.accessToken) return callback()

  user.accessToken = undefined
  user.save(function (err) {
    if (err) return callback(err, null)

    return callback()
  })
}

userSchema.methods.generateL2Auth = function (callback) {
  const user = this
  return new Promise((resolve, reject) => {
    ; (async () => {
      if (_.isUndefined(user.tOTPKey) || _.isNull(user.tOTPKey)) {
        const chance = new Chance()
        const base32 = require('thirty-two')

        const genOTPKey = chance.string({
          length: 7,
          pool: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ23456789'
        })

        const base32GenOTPKey = base32
          .encode(genOTPKey)
          .toString()
          .replace(/=/g, '')

        if (typeof callback === 'function') return callback(null, base32GenOTPKey)

        return resolve(base32GenOTPKey)
      } else {
        const error = new Error('FATAL: Key already assigned!')
        if (typeof callback === 'function') return callback(error)

        return reject(error)
      }
    })()
  })
}

userSchema.methods.removeL2Auth = function (callback) {
  const user = this

  user.tOTPKey = undefined
  user.hasL2Auth = false
  user.save(function (err) {
    if (err) return callback(err, null)

    return callback()
  })
}

userSchema.methods.addOpenChatWindow = function (convoId, callback) {
  if (convoId === undefined) {
    if (!_.isFunction(callback)) return false
    return callback('Invalid convoId')
  }
  const user = this
  const hasChatWindow =
    _.filter(user.preferences.openChatWindows, function (value) {
      return value.toString() === convoId.toString()
    }).length > 0

  if (hasChatWindow) {
    if (!_.isFunction(callback)) return false
    return callback()
  }
  user.preferences.openChatWindows.push(convoId.toString())
  user.save(function (err, u) {
    if (err) {
      if (!_.isFunction(callback)) return false
      return callback(err)
    }

    if (!_.isFunction(callback)) return false
    return callback(null, u.preferences.openChatWindows)
  })
}

userSchema.methods.removeOpenChatWindow = function (convoId, callback) {
  if (convoId === undefined) {
    if (!_.isFunction(callback)) return false
    return callback('Invalid convoId')
  }
  const user = this
  const hasChatWindow =
    _.filter(user.preferences.openChatWindows, function (value) {
      return value.toString() === convoId.toString()
    }).length > 0

  if (!hasChatWindow) {
    if (!_.isFunction(callback)) return false
    return callback()
  }
  user.preferences.openChatWindows.splice(
    _.findIndex(user.preferences.openChatWindows, function (item) {
      return item.toString() === convoId.toString()
    }),
    1
  )

  user.save(function (err, u) {
    if (err) {
      if (!_.isFunction(callback)) return false
      return callback(err)
    }

    if (!_.isFunction(callback)) return false
    return callback(null, u.preferences.openChatWindows)
  })
}

userSchema.methods.softDelete = function (callback) {
  const user = this

  user.deleted = true

  user.save(function (err) {
    if (err) return callback(err, false)

    callback(null, true)
  })
}

userSchema.statics.validate = function (password, dbPass) {
  return bcrypt.compareSync(password, dbPass)
}

/**
 * Gets all users
 *
 * @memberof User
 * @static
 * @method findAll
 *
 * @param {QueryCallback} callback MongoDB Query Callback
 */
userSchema.statics.findAll = function (callback) {
  return this.model(COLLECTION).find({}, callback)
}

/**
 * Gets user via object _id
 *
 * @memberof User
 * @static
 * @method getUser
 *
 * @param {Object} oId Object _id to Query MongoDB
 * @param {QueryCallback} callback MongoDB Query Callback
 */
userSchema.statics.getUser = function (oId, callback) {
  if (_.isUndefined(oId)) {
    return callback('Invalid ObjectId - UserSchema.GetUser()', null)
  }

  return this.model(COLLECTION).findOne({ _id: oId }, callback)
}

/**
 * Gets user via username
 *
 * @memberof User
 * @static
 * @method getUserByUsername
 *
 * @param {String} user Username to Query MongoDB
 * @param {QueryCallback} callback MongoDB Query Callback
 */
userSchema.statics.getUserByUsername = function (user, callback) {
  if (_.isUndefined(user)) {
    return callback('Invalid Username - UserSchema.GetUserByUsername()', null)
  }

  return this.model(COLLECTION)
    .findOne({ username: new RegExp('^' + user + '$', 'i') })
    .select('+password +accessToken')
    .exec(callback)
}

userSchema.statics.getByUsername = userSchema.statics.getUserByUsername

/**
 * Gets user via email
 *
 * @memberof User
 * @static
 * @method getUserByEmail
 *
 * @param {String} email Email to Query MongoDB
 * @param {QueryCallback} callback MongoDB Query Callback
 */
userSchema.statics.getUserByEmail = function (email, callback) {
  if (_.isUndefined(email)) {
    return callback('Invalid Email - UserSchema.GetUserByEmail()', null)
  }

  return this.model(COLLECTION).findOne({ email: email.toLowerCase() }, callback)
}

/**
 * Gets user via reset password hash
 *
 * @memberof User
 * @static
 * @method getUserByResetHash
 *
 * @param {String} hash Hash to Query MongoDB
 * @param {QueryCallback} callback MongoDB Query Callback
 */
userSchema.statics.getUserByResetHash = function (hash, callback) {
  if (_.isUndefined(hash)) {
    return callback('Invalid Hash - UserSchema.GetUserByResetHash()', null)
  }

  return this.model(COLLECTION).findOne(
    { resetPassHash: hash, deleted: false },
    '+resetPassHash +resetPassExpire',
    callback
  )
}

userSchema.statics.getUserByL2ResetHash = function (hash, callback) {
  if (_.isUndefined(hash)) {
    return callback('Invalid Hash - UserSchema.GetUserByL2ResetHash()', null)
  }

  return this.model(COLLECTION).findOne(
    { resetL2AuthHash: hash, deleted: false },
    '+resetL2AuthHash +resetL2AuthExpire',
    callback
  )
}

/**
 * Gets user via API Access Token
 *
 * @memberof User
 * @static
 * @method getUserByAccessToken
 *
 * @param {String} token Access Token to Query MongoDB
 * @param {QueryCallback} callback MongoDB Query Callback
 */
userSchema.statics.getUserByAccessToken = function (token, callback) {
  if (_.isUndefined(token)) {
    return callback('Invalid Token - UserSchema.GetUserByAccessToken()', null)
  }

  return this.model(COLLECTION).findOne({ accessToken: token, deleted: false }, '+password', callback)
}

userSchema.statics.getUserWithObject = function (object, callback) {
  if (!_.isObject(object)) {
    return callback('Invalid Object (Must be of type Object) - UserSchema.GetUserWithObject()', null)
  }

  const self = this

  const limit = object.limit === null ? 10 : object.limit
  const page = object.page === null ? 0 : object.page
  const search = object.search === null ? '' : object.search

  const q = self
    .model(COLLECTION)
    .find({}, '-password -resetPassHash -resetPassExpire')
    .sort({ fullname: 1 })
    .skip(page * limit)
  if (limit !== -1) {
    q.limit(limit)
  }

  if (!object.showDeleted) q.where({ deleted: false })

  if (!_.isEmpty(search)) {
    q.where({ fullname: new RegExp('^' + search.toLowerCase(), 'i') })
  }

  return q.exec(callback)
}

/**
 * Gets users based on permissions > mod
 *
 * @memberof User
 * @static
 * @method getAssigneeUsers
 *
 * @param {QueryCallback} callback MongoDB Query Callback
 */
userSchema.statics.getAssigneeUsers = function (callback) {
  const roles = global.roles
  if (_.isUndefined(roles)) return callback(null, [])

  const assigneeRoles = []
  async.each(roles, function (role) {
    if (role.isAgent) assigneeRoles.push(role._id)
  })

  assigneeRoles = _.uniq(assigneeRoles)
  this.model(COLLECTION).find({ role: { $in: assigneeRoles }, deleted: false }, function (err, users) {
    if (err) {
      winston.warn(err)
      return callback(err, null)
    }

    return callback(null, _.sortBy(users, 'fullname'))
  })
}

/**
 * Gets users based on roles
 *
 * @memberof User
 * @static
 * @method getUsersByRoles
 *
 * @param {Array} roles Array of role ids
 * @param {QueryCallback} callback MongoDB Query Callback
 */
userSchema.statics.getUsersByRoles = function (roles, callback) {
  if (_.isUndefined(roles)) return callback('Invalid roles array', null)
  if (!_.isArray(roles)) {
    roles = [roles]
  }

  const q = this.model(COLLECTION).find({ role: { $in: roles }, deleted: false })

  return q.exec(callback)
}

/**
 * Creates a user with the given data object
 *
 * @memberof User
 * @static
 * @method createUser
 *
 * @param {User} data JSON data object of new User
 * @param {QueryCallback} callback MongoDB Query Callback
 */
userSchema.statics.createUser = function (data, callback) {
  if (_.isUndefined(data) || _.isUndefined(data.username)) {
    return callback('Invalid User Data - UserSchema.CreateUser()', null)
  }

  const self = this

  self.model(COLLECTION).find({ username: data.username }, function (err, items) {
    if (err) {
      return callback(err, null)
    }

    if (_.size(items) > 0) {
      return callback('Username Already Exists', null)
    }

    return self.collection.insert(data, callback)
  })
}

/**
 * Creates a user with only Email address. Emails user password.
 *
 * @param email
 * @param callback
 */
userSchema.statics.createUserFromEmail = function (email, callback) {
  if (_.isUndefined(email)) {
    return callback('Invalid User Data - UserSchema.CreatePublicUser()', null)
  }

  const self = this

  const settingSchema = require('./setting')
  settingSchema.getSetting('role:user:default', function (err, userRoleDefault) {
    if (err || !userRoleDefault) return callback('Invalid Setting - UserRoleDefault')

    const Chance = require('chance')

    const chance = new Chance()

    const plainTextPass = chance.string({
      length: 6,
      pool: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890'
    })

    const user = new self({
      username: email,
      email: email,
      password: plainTextPass,
      fullname: email,
      role: userRoleDefault.value
    })

    self.model(COLLECTION).find({ username: user.username }, function (err, items) {
      if (err) return callback(err)
      if (_.size(items) > 0) return callback('Username already exists')

      user.save(function (err, savedUser) {
        if (err) return callback(err)

        // Create a group for this user
        const GroupSchema = require('./group')
        const group = new GroupSchema({
          name: savedUser.email,
          members: [savedUser._id],
          sendMailTo: [savedUser._id],
          public: true
        })

        group.save(function (err, group) {
          if (err) return callback(err)

          // Send welcome email
          const path = require('path')
          const mailer = require('../mailer')
          const Email = require('email-templates')
          const templateDir = path.resolve(__dirname, '..', 'mailer', 'templates')

          const email = new Email({
            views: {
              root: templateDir,
              options: {
                extension: 'handlebars'
              }
            }
          })

          const settingSchema = require('./setting')
          settingSchema.getSetting('gen:siteurl', function (err, setting) {
            if (err) return callback(err)

            if (!setting) {
              setting = { value: '' }
            }

            const dataObject = {
              user: savedUser,
              username: savedUser.username,
              fullname: savedUser.fullname,
              plainTextPassword: plainTextPass,
              baseUrl: setting.value
            }

            email
              .render('public-account-created', dataObject)
              .then(function (html) {
                const mailOptions = {
                  to: savedUser.email,
                  subject: 'Welcome to Helpdesk! - Here are your account details.',
                  html: html,
                  generateTextFromHTML: true
                }

                mailer.sendMail(mailOptions, function (err) {
                  if (err) {
                    winston.warn(err)
                    return callback(err)
                  }

                  return callback(null, { user: savedUser, group: group })
                })
              })
              .catch(function (err) {
                winston.warn(err)
                return callback(err)
              })
          })
        })
      })
    })
  })
}

userSchema.statics.getCustomers = function (obj, callback) {
  const limit = obj.limit || 10
  const page = obj.page || 0
  const self = this
  return self
    .model(COLLECTION)
    .find({}, '-password -resetPassHash -resetPassExpire')
    .exec(function (err, accounts) {
      if (err) return callback(err)

      const customerRoleIds = _.filter(accounts, function (a) {
        return !a.role.isAdmin && !a.role.isAgent
      }).map(function (a) {
        return a.role._id
      })

      const q = self
        .find({ role: { $in: customerRoleIds } }, '-password -resetPassHash -resetPassExpire')
        .sort({ fullname: 1 })
        .skip(page * limit)
        .limit(limit)

      if (!obj.showDeleted) q.where({ deleted: false })

      q.exec(callback)
    })
}

userSchema.statics.getAgents = function (obj, callback) {
  const limit = obj.limit || 10
  const page = obj.page || 0
  const self = this

  return self
    .model(COLLECTION)
    .find({})
    .exec(function (err, accounts) {
      if (err) return callback(err)

      const agentRoleIds = _.filter(accounts, function (a) {
        return a.role.isAgent
      }).map(function (a) {
        return a.role._id
      })

      const q = self
        .model(COLLECTION)
        .find({ role: { $in: agentRoleIds } }, '-password -resetPassHash -resetPassExpire')
        .sort({ fullname: 1 })
        .skip(page * limit)
        .limit(limit)

      if (!obj.showDeleted) q.where({ deleted: false })

      q.exec(callback)
    })
}

userSchema.statics.getAdmins = function (obj, callback) {
  const limit = obj.limit || 10
  const page = obj.page || 0
  const self = this

  return self
    .model(COLLECTION)
    .find({})
    .exec(function (err, accounts) {
      if (err) return callback(err)

      const adminRoleIds = _.filter(accounts, function (a) {
        return a.role.isAdmin
      }).map(function (a) {
        return a.role._id
      })

      const q = self
        .model(COLLECTION)
        .find({ role: { $in: adminRoleIds } }, '-password -resetPassHash -resetPassExpire')
        .sort({ fullname: 1 })
        .skip(page * limit)
        .limit(limit)

      if (!obj.showDeleted) q.where({ deleted: false })

      q.exec(callback)
    })
}

module.exports = mongoose.model(COLLECTION, userSchema)

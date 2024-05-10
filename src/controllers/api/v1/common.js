const _ = require('lodash')
const async = require('async')
const winston = require('../../../logger')

const commonV1 = {}

/**
 * Preforms login with username/password and adds
 * an access token to the {@link User} object.
 *
 * @param {object} req Express Request
 * @param {object} res Express Response
 * @return {JSON} {@link User} object
 * @see {@link User}
 * @example
 * //Accepts Content-Type:application/json
 * {
 *    username: req.body.username,
 *    password: req.body.password
 * }
 *
 * @example
 * //Object Returned has the following properties removed
 * var resUser = _.clone(user._doc);
 * delete resUser.resetPassExpire;
 * delete resUser.resetPassHash;
 * delete resUser.password;
 * delete resUser.iOSDeviceToken;
 *
 */
commonV1.login = function (req, res) {
  const userModel = require('../../../models/user')
  const username = req.body.username
  const password = req.body.password

  if (_.isUndefined(username) || _.isUndefined(password)) {
    return res.sendStatus(403)
  }

  userModel.getUserByUsername(username, function (err, user) {
    if (err) return res.status(401).json({ success: false, error: err.message })
    if (!user) return res.status(401).json({ success: false, error: 'Invalid User' })

    if (!userModel.validate(password, user.password))
      return res.status(401).json({ success: false, error: 'Invalid Password' })

    const resUser = _.clone(user._doc)
    delete resUser.resetPassExpire
    delete resUser.resetPassHash
    delete resUser.password
    delete resUser.iOSDeviceTokens
    delete resUser.tOTPKey
    delete resUser.__v
    delete resUser.preferences

    if (_.isUndefined(resUser.accessToken) || _.isNull(resUser.accessToken)) {
      return res.status(200).json({ success: false, error: 'No API Key assigned to this User.' })
    }

    req.user = resUser
    res.header('X-Subject-Token', resUser.accessToken)
    return res.json({
      success: true,
      accessToken: resUser.accessToken,
      user: resUser
    })
  })
}

commonV1.getLoggedInUser = function (req, res) {
  if (!req.user) {
    return res.status(400).json({ success: false, error: 'Invalid Auth' })
  }

  const resUser = _.clone(req.user._doc)
  delete resUser.resetPassExpire
  delete resUser.accessToken
  delete resUser.resetPassHash
  delete resUser.password
  delete resUser.iOSDeviceTokens
  delete resUser.tOTPKey
  delete resUser.__v

  return res.json({ success: true, user: resUser })
}

/**
 * Preforms logout
 * {@link User} object.
 *
 * @param {object} req Express Request
 * @param {object} res Express Response
 * @return {JSON} Success/Error object
 *
 * @example
 * //Tokens are sent in the HTTP Header
 * var token = req.headers.token;
 * var deviceToken = req.headers.devicetoken;
 */
commonV1.logout = function (req, res) {
  const deviceToken = req.headers.devicetoken
  const user = req.user

  async.series(
    [
      function (callback) {
        if (!deviceToken) return callback()
        user.removeDeviceToken(deviceToken, 1, function (err) {
          if (err) return callback(err)

          callback()
        })
      }
    ],
    function (err) {
      if (err) return res.status(400).json({ success: false, error: err.message })

      return res.status(200).json({ success: true })
    }
  )
}

commonV1.privacyPolicy = async (req, res) => {
  const SettingsUtil = require('../../../settings/settingsUtil')
  try {
    const results = await SettingsUtil.getSettings()

    return res.json({ success: true, privacyPolicy: results.data.settings.privacyPolicy.value })
  } catch (err) {
    winston.warn(err)
    return res.status(500).json({ success: false, error: err })
  }
}

module.exports = commonV1

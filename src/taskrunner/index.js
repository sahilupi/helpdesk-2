const _ = require('lodash')
const async = require('async')
const request = require('request')
const ticketSchema = require('../models/ticket')
const userSchema = require('../models/user')
const groupSchema = require('../models/group')
const conversationSchema = require('../models/chat/conversation')
const settingSchema = require('../models/setting')

const taskRunner = {}

taskRunner.init = function (callback) {
  // taskRunner.sendStats(function (err) {
  //   if (!err) setInterval(taskRunner.sendStats, 86400000) // 24 hours
  // })

  return callback()
}

taskRunner.sendStats = function (callback) {
  settingSchema.getSettingsByName(['gen:installid', 'gen:version', 'gen:siteurl'], function (err, settings) {
    if (err) return callback(err)
    if (!settings || settings.length < 1) return callback()

    let versionSetting = _.find(settings, function (x) {
      return x.name === 'gen:version'
    })
    const installIdSetting = _.find(settings, function (x) {
      return x.name === 'gen:installid'
    })

    let hostnameSetting = _.find(settings, function (x) {
      return x.name === 'gen:siteurl'
    })

    if (!installIdSetting) return callback()

    versionSetting = _.isUndefined(versionSetting) ? { value: '--' } : versionSetting

    hostnameSetting = _.isUndefined(hostnameSetting) ? { value: '--' } : hostnameSetting

    const result = {
      ticketCount: 0,
      agentCount: 0,
      customerGroupCount: 0,
      conversationCount: 0
    }

    async.parallel(
      [
        function (done) {
          ticketSchema.countDocuments({ deleted: false }, function (err, count) {
            if (err) return done(err)

            result.ticketCount = count
            return done()
          })
        },
        function (done) {
          userSchema.getAgents({}, function (err, agents) {
            if (err) return done(err)

            if (!agents) return done()
            result.agentCount = agents.length

            return done()
          })
        },
        function (done) {
          groupSchema.countDocuments({}, function (err, count) {
            if (err) return done(err)

            result.customerGroupCount = count

            return done()
          })
        },
        function (done) {
          conversationSchema.countDocuments({}, function (err, count) {
            if (err) return done(err)

            result.conversationCount = count

            return done()
          })
        }
      ],
      function (err) {
        // if (typeof callback === 'function') return callback()
        // return
        if (err) return callback()
        request(
          'https://stats.trudesk.app/api/v1/installation',
          {
            method: 'POST',
            json: true,
            body: {
              statsKey: 'trudesk',
              id: installIdSetting.value,
              version: versionSetting.value,
              hostname: hostnameSetting.value,
              ticketCount: result.ticketCount,
              agentCount: result.agentCount,
              customerGroupCount: result.customerGroupCount,
              conversationCount: result.conversationCount
            }
          },
          callback
        )
      }
    )
  })
}

module.exports = taskRunner

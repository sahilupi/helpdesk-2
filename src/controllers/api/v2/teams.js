const _ = require('lodash')
// const async = require('async')
const Team = require('../../../models/team')
const apiUtils = require('../apiUtils')

const apiTeams = {}

apiTeams.get = function (req, res) {
  let limit = 10
  if (!_.isUndefined(req.query.limit)) {
    try {
      limit = parseInt(req.query.limit)
    } catch (err) {
      limit = 10
    }
  }

  let page = 0
  if (req.query.page) {
    try {
      page = parseInt(req.query.page)
    } catch (err) {
      page = 0
    }
  }

  const obj = {
    limit,
    page
  }

  Team.getWithObject(obj, function (err, results) {
    if (err) return apiUtils.sendApiError(res, 400, err.message)

    return apiUtils.sendApiSuccess(res, { count: results.length, teams: results })
  })
}

apiTeams.create = function (req, res) {
  const postData = req.body
  if (!postData) return apiUtils.sendApiError_InvalidPostData(res)

  Team.create(postData, function (err, team) {
    if (err) return apiUtils.sendApiError(res, 500, err.message)

    team.populate('members', function (err, team) {
      if (err) return apiUtils.sendApiError(res, 500, err.message)

      return apiUtils.sendApiSuccess(res, { team })
    })
  })
}

apiTeams.update = function (req, res) {
  const id = req.params.id
  if (!id) return apiUtils.sendApiError(res, 400, 'Invalid Team Id')

  const putData = req.body
  if (!putData) return apiUtils.sendApiError_InvalidPostData(res)

  Team.findOne({ _id: id }, function (err, team) {
    if (err || !team) return apiUtils.sendApiError(res, 400, 'Invalid Team')

    if (putData.name) team.name = putData.name
    if (putData.members) team.members = putData.members

    team.save(function (err, team) {
      if (err) return apiUtils.sendApiError(res, 500, err.message)

      team.populate('members', function (err, team) {
        if (err) return apiUtils.sendApiError(res, 500, err.message)

        return apiUtils.sendApiSuccess(res, { team })
      })
    })
  })
}

apiTeams.delete = function (req, res) {
  const id = req.params.id
  if (!id) return apiUtils.sendApiError(res, 400, 'Invalid Team Id')

  Team.deleteOne({ _id: id }, function (err, success) {
    if (err) return apiUtils.sendApiError(res, 500, err.message)
    if (!success) return apiUtils.sendApiError(res, 500, 'Unable to delete team. Contact your administrator.')

    return apiUtils.sendApiSuccess(res, { _id: id })
  })
}

module.exports = apiTeams

const winston = require('../../../logger')
const apiUtils = require('../apiUtils')
const Notice = require('../../../models/notice')

const apiNotices = {}

apiNotices.create = async (req, res) => {
  const payload = req.body

  try {
    const notice = await Notice.create({
      name: payload.name,
      message: payload.message,
      color: payload.color,
      fontColor: payload.fontColor
    })

    return apiUtils.sendApiSuccess(res, { notice })
  } catch (err) {
    winston.debug(err)
    return apiUtils.sendApiError(res, 500, err.message)
  }
}

apiNotices.get = function (req, res) {
  Notice.find({}, function (err, notices) {
    if (err) return apiUtils.sendApiError(res, 500, err.message)

    return apiUtils.sendApiSuccess(res, { notices: notices })
  })
}

apiNotices.update = function (req, res) {
  var id = req.params.id
  var payload = req.body
  if (!id || !payload || !payload.name || !payload.message || !payload.color || !payload.fontColor)
    return apiUtils.sendApiError_InvalidPostData(res)

  Notice.findOneAndUpdate({ _id: id }, payload, { new: true }, function (err, updatedNotice) {
    if (err) return apiUtils.sendApiError(res, 500, err.message)

    return apiUtils.sendApiSuccess(res, { notice: updatedNotice })
  })
}

apiNotices.activate = function (req, res) {
  var id = req.params.id
  if (!id) return apiUtils.sendApiError_InvalidPostData(res)

  Notice.updateMany({}, { active: false }, function (err) {
    if (err) return apiUtils.sendApiError(res, 500, err.message)

    Notice.findOneAndUpdate({ _id: id }, { active: true }, function (err) {
      if (err) return apiUtils.sendApiError(res, 500, err.message)

      return apiUtils.sendApiSuccess(res)
    })
  })
}

apiNotices.clear = function (req, res) {
  Notice.updateMany({}, { active: false }, function (err) {
    if (err) return apiUtils.sendApiError(res, 500, err.message)

    return apiUtils.sendApiSuccess(res)
  })
}

apiNotices.delete = function (req, res) {
  var id = req.params.id
  if (!id) return apiUtils.sendApiError_InvalidPostData(res)

  Notice.findOneAndDelete({ _id: id }, function (err) {
    if (err) return apiUtils.sendApiError(res, 500, err.message)

    return apiUtils.sendApiSuccess(res)
  })
}

module.exports = apiNotices

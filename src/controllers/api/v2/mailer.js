var mailCheck = require('../../../mailer/mailCheck')
var apiUtils = require('../apiUtils')

var mailerApi = {}

mailerApi.check = function (req, res) {
  mailCheck.refetch()
  return apiUtils.sendApiSuccess(res)
}

module.exports = mailerApi

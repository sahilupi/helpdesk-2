var _ = require('lodash')
var ldap = require('ldapjs')

var ldapClient = {}
ldapClient.client = null

ldapClient.bind = function (url, userDN, password, callback) {
  ldapClient.client = ldap.createClient({
    url: url
  })

  ldapClient.client.bind(userDN, password, callback)

  ldapClient.client.on('error', function (err) {
    if (_.isFunction(callback)) {
      return callback(err)
    }

    throw err
  })
}

ldapClient.search = function (base, filter, callback) {
  if (ldapClient.client === null) return callback('Client is not initialized.')

  var entries = []

  ldapClient.client.on('error', function (err) {
    if (_.isFunction(callback)) {
      return callback(err)
    }

    throw err
  })

  ldapClient.client.search(
    base,
    {
      filter: filter,
      scope: 'sub',
      attributes: ['dn', 'displayName', 'cn', 'samAccountName', 'title', 'mail']
    },
    function (err, res) {
      if (err) return callback(err)
      res.on('searchEntry', function (entry) {
        entries.push(entry.object)
      })

      // res.on('searchReference', function(referral) {
      //     console.log('referral: ' + referral.uris.join());
      // });

      res.on('error', function (err) {
        return callback(err)
      })

      res.on('end', function (result) {
        return callback(null, { entries: entries, result: result })
      })
    }
  )
}

ldapClient.unbind = function (callback) {
  if (ldapClient.client === null) return callback('Client is not initialized')

  return ldapClient.client.unbind(callback)
}

module.exports = ldapClient

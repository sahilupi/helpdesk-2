

define('modules/socket.io/accountsImporter', ['jquery', 'modules/helpers', 'history'], function ($, helpers) {
  var accountsImporter = {}

  var socket

  function onStatusChange(type, item, percent) {
    var $statusBox = $('#' + type + '-import-status-box > ul')
    if (item) {
      if (item.state === 1) {
        $statusBox.append(
          '<li><div data-import-username="' +
          item.username +
          '" style="display:flex;">Importing ' +
          item.username +
          '<span>...</span></div></li>'
        )
      } else if (item.state === 2) {
        var span = $statusBox.find('div[data-import-username="' + item.username + '"] > span')
        if (span.length > 0) {
          span.css({ display: 'inline-flex', marginLeft: '5px' })
          span.html(
            '<i class="md-color-green material-icons" style="font-size:18px;line-height:18px;vertical-align:middle;">check</i>'
          )
        }
      } else if (item.state === 3) {
        var span1 = $statusBox.find('div[data-import-username="' + item.username + '"] > span')
        if (span1.length > 0) {
          span1.css({ display: 'inline-flex', marginLeft: '5px' })
          span1.html(
            '<i class="md-color-red material-icons" style="font-size:18px;line-height:18px;vertical-align:middle;">close</i>'
          )
        }
      }
    }

    scrollStatusBox()

    $('.js-' + type + '-progress')
      .find('.uk-progress-bar')
      .css({ width: percent + '%' })
  }

  function finishImport(type, completedCount) {
    var $statusBox = $('#' + type + '-import-status-box')
    if (completedCount === 1) {
      $statusBox.find('ul').append('<li>Imported ' + completedCount + ' account</li>')
    } else {
      $statusBox.find('ul').append('<li>Imported ' + completedCount + ' accounts</li>')
    }

    scrollStatusBox()

    var $wizard = $('#wizard_' + type)
    $wizard.find('.button_finish').removeClass('disabled')
  }

  accountsImporter.init = function (sock) {
    socket = sock

    socket.removeAllListeners('$trudesk:accounts:import:error')
    socket.on('$trudesk:accounts:import:error', function (data) {
      var error = data.error

      console.error(error)
      helpers.showSnackbar(error, true)
    })

    socket.removeAllListeners('$trudesk:accounts:import:onStatusChange')
    socket.on('$trudesk:accounts:import:onStatusChange', function (data) {
      var type = data.type
      var item = data.item
      var totalCount = data.totalCount
      var completedCount = data.completedCount
      var percent = Math.floor((completedCount / totalCount) * 100)

      onStatusChange(type, item, percent)

      // See if we are done
      if (completedCount >= totalCount) {
        finishImport(type, completedCount)
      }
    })
  }

  accountsImporter.sendAccountData = function (type, addedUsers, updatedUsers) {
    if (socket === null || socket === undefined) return

    socket.emit('$trudesk:accounts:import:' + type, {
      addedUsers: addedUsers,
      updatedUsers: updatedUsers
    })
  }

  function scrollStatusBox() {
    var e = $('#ldap-import-status-box')
    if (e.length > 0) {
      e = e[0]
      e.scrollTop = e.scrollHeight - e.getBoundingClientRect().height
    }
  }

  return accountsImporter
})

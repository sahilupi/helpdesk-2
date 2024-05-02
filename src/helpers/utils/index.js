

const _ = require('lodash')
const xss = require('xss')
const fs = require('fs')
const winston = require('../../logger')
const piexifjs = require('piexifjs')

const MAX_FIELD_TEXT_LENGTH = 255
const MAX_SHORT_FIELD_TEXT_LENGTH = 25
const MAX_EXTREME_TEXT_LENGTH = 2000

module.exports.applyMaxTextLength = function (text) {
  return text.toString().substring(0, MAX_FIELD_TEXT_LENGTH)
}

module.exports.applyMaxShortTextLength = function (text) {
  return text.toString().substring(0, MAX_SHORT_FIELD_TEXT_LENGTH)
}

module.exports.applyExtremeTextLength = function (text) {
  return text.toString().substring(0, MAX_EXTREME_TEXT_LENGTH)
}

module.exports.sanitizeFieldPlainText = function (text) {
  return xss(text, {
    whileList: {},
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script']
  })
}

module.exports.stripExifData = function (path) {
  try {
    const imgData = fs.readFileSync(path).toString('binary')
    const newImgData = piexifjs.remove(imgData)
    fs.writeFileSync(path, newImgData, 'binary')
  } catch (e) {
    winston.warn(e)
  }
}

module.exports.sendToSelf = function (socket, method, data) {
  socket.emit(method, data)
}

module.exports._sendToSelf = function (io, socketId, method, data) {
  _.each(io.sockets.sockets, function (socket) {
    if (socket.id === socketId) {
      socket.emit(method, data)
    }
  })
}

module.exports.sendToAllConnectedClients = function (io, method, data) {
  io.sockets.emit(method, data)
}

module.exports.sendToAllClientsInRoom = function (io, room, method, data) {
  io.sockets.in(room).emit(method, data)
}

module.exports.sendToUser = function (socketList, userList, username, method, data) {
  let userOnline = null
  _.forEach(userList, function (v, k) {
    if (k.toLowerCase() === username.toLowerCase()) {
      userOnline = v
      return true
    }
  })

  if (_.isNull(userOnline)) return true

  _.forEach(userOnline.sockets, function (socket) {
    const o = _.findKey(socketList, { id: socket })
    const i = socketList[o]
    if (_.isUndefined(i)) return true
    i.emit(method, data)
  })
}

module.exports.sendToAllExcept = function (io, exceptSocketId, method, data) {
  _.each(io.sockets.sockets, function (socket) {
    if (socket.id !== exceptSocketId) {
      socket.emit(method, data)
    }
  })
}

module.exports.disconnectAllClients = function (io) {
  Object.keys(io.sockets.sockets).forEach(function (sock) {
    io.sockets.sockets[sock].disconnect(true)
  })
}

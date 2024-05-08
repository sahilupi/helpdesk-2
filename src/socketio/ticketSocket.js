const _ = require('lodash')
const async = require('async')
const winston = require('../logger')
const marked = require('marked')
const sanitizeHtml = require('sanitize-html')
const utils = require('../helpers/utils')
const emitter = require('../emitter')
const socketEvents = require('./socketEventConsts')
const ticketSchema = require('../models/ticket')
const prioritySchema = require('../models/ticketpriority')
const userSchema = require('../models/user')
const roleSchema = require('../models/role')
const permissions = require('../permissions')
const xss = require('xss')

const events = {}

function register(socket) {
  events.onUpdateTicketGrid(socket)
  events.onUpdateTicketStatus(socket)
  events.onUpdateTicket(socket)
  events.onUpdateAssigneeList(socket)
  events.onSetAssignee(socket)
  events.onUpdateTicketTags(socket)
  events.onClearAssignee(socket)
  events.onSetTicketType(socket)
  events.onSetTicketPriority(socket)
  events.onSetTicketGroup(socket)
  events.onSetTicketDueDate(socket)
  events.onSetTicketIssue(socket)
  events.onCommentNoteSet(socket)
  events.onRemoveCommentNote(socket)
  events.onAttachmentsUIUpdate(socket)
}

function eventLoop() { }

events.onUpdateTicketGrid = function (socket) {
  socket.on('ticket:updategrid', function () {
    utils.sendToAllConnectedClients(io, 'ticket:updategrid')
  })
}

events.onUpdateTicketStatus = socket => {
  socket.on(socketEvents.TICKETS_STATUS_SET, async data => {
    const ticketId = data._id
    const status = data.value
    const ownerId = socket.request.user._id
    // winston.debug('Received Status')
    try {
      let ticket = await ticketSchema.getTicketById(ticketId)
      ticket = await ticket.setStatus(ownerId, status)
      ticket = await ticket.save()
      ticket = await ticket.populate('status')

      // emitter.emit('ticket:updated', t)
      utils.sendToAllConnectedClients(io, socketEvents.TICKETS_UI_STATUS_UPDATE, {
        tid: ticket._id,
        owner: ticket.owner,
        status: ticket.status
      })
    } catch (e) {
      winston.debug(e)
      winston.log('info', 'Error in Status' + JSON.stringify(e))
    }
  })
}

events.onUpdateTicket = function (socket) {
  socket.on(socketEvents.TICKETS_UPDATE, async data => {
    try {
      const ticket = await ticketSchema.getTicketById(data._id)

      utils.sendToAllConnectedClients(io, socketEvents.TICKETS_UPDATE, ticket)
    } catch (error) {
      // Blank
    }
  })
}

events.onUpdateAssigneeList = function (socket) {
  socket.on(socketEvents.TICKETS_ASSIGNEE_LOAD, function () {
    roleSchema.getAgentRoles(function (err, roles) {
      if (err) return true
      userSchema.find({ role: { $in: roles }, deleted: false }, function (err, users) {
        if (err) return true

        const sortedUser = _.sortBy(users, 'fullname')

        utils.sendToSelf(socket, socketEvents.TICKETS_ASSIGNEE_LOAD, sortedUser)
      })
    })
  })
}

events.onSetAssignee = function (socket) {
  socket.on(socketEvents.TICKETS_ASSIGNEE_SET, function (data) {
    const userId = data._id
    const ownerId = socket.request.user._id
    const ticketId = data.ticketId
    ticketSchema.getTicketById(ticketId, async function (err, ticket) {
      if (err) return true
      const User = require('../models/user');
      try {
        const user = await User.getUser(userId);
        const owner = await User.getUser(ownerId);

        // send mail to all employees
        const path = require('path')
        const mailer = require('../mailer')
        const Email = require('email-templates')
        const templateDir = path.resolve(__dirname, '../', 'mailer', 'templates')

        const email = new Email({
          views: {
            root: templateDir,
            options: {
              extension: 'handlebars'
            }
          }
        })

        const settingSchema = require('../models/setting')
        settingSchema.getSetting('gen:siteurl', async function (err, setting) {
          if (err) console.log(err)

          if (!setting) {
            setting = { value: '' }
          }
          const finalTicket = {
            userEmail: user.email,
            userName: user.fullname,
            ownerEmail: owner.email,
            ownerName: owner.fullname,
            type: ticket.type.name,
            priority: ticket.priority.name,
            tags: ticket.tags,
            subject: ticket.subject,
            uid: ticket.uid,
            baseUrl: setting.value
          }
          email
            .render('new-ticket-assign', finalTicket)
            .then(function (html) {
              const mailOptions = {
                to: process.env.TICKET_ASSIGNEE_EMAIL_IDS + ',' + user.email,
                subject: `New Ticket assigned #${ticket.uid} - ${ticket.subject}`,
                html,
                generateTextFromHTML: true
              }

              mailer.sendMail(mailOptions, function (err) {
                if (err) {
                  winston.warn(err)
                  // return apiUtil.sendApiError_InvalidPostData(res)
                }
                console.log('success: Mail sent')
                // return callback(null, { user: savedUser, group: group })
              })
            })
        })

      } catch (error) {
        console.log(error)
      }
      async.parallel(
        {
          setAssignee: function (callback) {
            ticket.setAssignee(ownerId, userId, function (err, ticket) {
              callback(err, ticket)
            })
          },
          subscriber: function (callback) {
            ticket.addSubscriber(userId, function (err, ticket) {
              callback(err, ticket)
            })
          }
        },
        function (err, results) {
          if (err) return true

          ticket = results.subscriber
          ticket.save(function (err, ticket) {
            if (err) return true
            ticket.populate('assignee', function (err, ticket) {
              if (err) return true

              emitter.emit('ticket:subscriber:update', {
                user: userId,
                subscribe: true
              })

              emitter.emit(socketEvents.TICKETS_ASSIGNEE_SET, {
                assigneeId: ticket.assignee._id,
                ticketId: ticket._id,
                ticketUid: ticket.uid,
                hostname: socket.handshake.headers.host
              })

              // emitter.emit('ticket:updated', ticket)
              utils.sendToAllConnectedClients(io, socketEvents.TICKETS_ASSIGNEE_UPDATE, ticket)
            })
          })
        }
      )
    })
  })
}

events.onSetTicketType = function (socket) {
  socket.on(socketEvents.TICKETS_TYPE_SET, function (data) {
    const ticketId = data._id
    const typeId = data.value
    const ownerId = socket.request.user._id

    if (_.isUndefined(ticketId) || _.isUndefined(typeId)) return true
    ticketSchema.getTicketById(ticketId, function (err, ticket) {
      if (err) return true
      ticket.setTicketType(ownerId, typeId, function (err, t) {
        if (err) return true

        t.save(function (err, tt) {
          if (err) return true

          ticketSchema.populate(tt, 'type', function (err) {
            if (err) return true

            // emitter.emit('ticket:updated', tt)
            utils.sendToAllConnectedClients(io, socketEvents.TICKETS_UI_TYPE_UPDATE, tt)
          })
        })
      })
    })
  })
}

events.onUpdateTicketTags = socket => {
  socket.on(socketEvents.TICKETS_UI_TAGS_UPDATE, async data => {
    const ticketId = data.ticketId
    if (_.isUndefined(ticketId)) return true

    try {
      const ticket = await ticketSchema.findOne({ _id: ticketId }).populate('tags')

      utils.sendToAllConnectedClients(io, socketEvents.TICKETS_UI_TAGS_UPDATE, ticket)
    } catch (e) {
      // Blank
    }
  })
}

events.onSetTicketPriority = function (socket) {
  socket.on(socketEvents.TICKETS_PRIORITY_SET, function (data) {
    const ticketId = data._id
    const priority = data.value
    const ownerId = socket.request.user._id

    if (_.isUndefined(ticketId) || _.isUndefined(priority)) return true
    ticketSchema.getTicketById(ticketId, function (err, ticket) {
      if (err) return true
      prioritySchema.getPriority(priority, function (err, p) {
        if (err) {
          winston.debug(err)
          return true
        }

        ticket.setTicketPriority(ownerId, p, function (err, t) {
          if (err) return true
          t.save(function (err, tt) {
            if (err) return true

            // emitter.emit('ticket:updated', tt)
            utils.sendToAllConnectedClients(io, socketEvents.TICKETS_UI_PRIORITY_UPDATE, tt)
          })
        })
      })
    })
  })
}

events.onClearAssignee = socket => {
  socket.on(socketEvents.TICKETS_ASSIGNEE_CLEAR, async id => {
    const ownerId = socket.request.user._id

    try {
      const ticket = await ticketSchema.findOne({ _id: id })
      const updatedTicket = await ticket.clearAssignee(ownerId)
      const savedTicket = await updatedTicket.save()

      // emitter.emit('ticket:updated', tt)
      utils.sendToAllConnectedClients(io, socketEvents.TICKETS_ASSIGNEE_UPDATE, savedTicket)
    } catch (e) {
      // Blank
    }
  })
}

events.onSetTicketGroup = function (socket) {
  socket.on(socketEvents.TICKETS_GROUP_SET, function (data) {
    const ticketId = data._id
    const groupId = data.value
    const ownerId = socket.request.user._id

    if (_.isUndefined(ticketId) || _.isUndefined(groupId)) return true

    ticketSchema.getTicketById(ticketId, function (err, ticket) {
      if (err) return true

      ticket.setTicketGroup(ownerId, groupId, function (err, t) {
        if (err) return true

        t.save(function (err, tt) {
          if (err) return true

          ticketSchema.populate(tt, 'group', function (err) {
            if (err) return true

            // emitter.emit('ticket:updated', tt)
            utils.sendToAllConnectedClients(io, socketEvents.TICKETS_UI_GROUP_UPDATE, tt)
          })
        })
      })
    })
  })
}

events.onSetTicketDueDate = function (socket) {
  socket.on(socketEvents.TICKETS_DUEDATE_SET, function (data) {
    const ticketId = data._id
    const dueDate = data.value
    const ownerId = socket.request.user._id

    if (_.isUndefined(ticketId)) return true

    ticketSchema.getTicketById(ticketId, function (err, ticket) {
      if (err) return true

      ticket.setTicketDueDate(ownerId, dueDate, function (err, t) {
        if (err) return true

        t.save(function (err, tt) {
          if (err) return true

          // emitter.emit('ticket:updated', tt)
          utils.sendToAllConnectedClients(io, socketEvents.TICKETS_UI_DUEDATE_UPDATE, tt)
        })
      })
    })
  })
}

events.onSetTicketIssue = socket => {
  socket.on(socketEvents.TICKETS_ISSUE_SET, async data => {
    const ticketId = data._id
    const issue = data.value
    const subject = data.subject
    const ownerId = socket.request.user._id
    if (_.isUndefined(ticketId) || _.isUndefined(issue)) return true

    try {
      let ticket = await ticketSchema.getTicketById(ticketId)
      if (subject !== ticket.subject) ticket = await ticket.setSubject(ownerId, subject)
      if (issue !== ticket.issue) ticket = await ticket.setIssue(ownerId, issue)

      ticket = await ticket.save()

      utils.sendToAllConnectedClients(io, socketEvents.TICKETS_UPDATE, ticket)
    } catch (e) {
      // Blank
    }
  })
}

events.onCommentNoteSet = socket => {
  socket.on(socketEvents.TICKETS_COMMENT_NOTE_SET, async data => {
    const ownerId = socket.request.user._id
    const ticketId = data._id
    const itemId = data.item
    let text = data.value
    const isNote = data.isNote

    if (_.isUndefined(ticketId) || _.isUndefined(itemId) || _.isUndefined(text)) return true

    marked.setOptions({
      breaks: true
    })

    text = sanitizeHtml(text).trim()
    const markedText = xss(marked.parse(text))

    try {
      let ticket = await ticketSchema.getTicketById(ticketId)
      if (!isNote) ticket = await ticket.updateComment(ownerId, itemId, markedText)
      else ticket = await ticket.updateNote(ownerId, itemId, markedText)
      ticket = await ticket.save()

      utils.sendToAllConnectedClients(io, socketEvents.TICKETS_UPDATE, ticket)
    } catch (e) {
      winston.error(e)
    }
  })
}

events.onRemoveCommentNote = socket => {
  socket.on(socketEvents.TICKETS_COMMENT_NOTE_REMOVE, async data => {
    const ownerId = socket.request.user._id
    const ticketId = data._id
    const itemId = data.value
    const isNote = data.isNote

    try {
      let ticket = await ticketSchema.getTicketById(ticketId)
      if (!isNote) ticket = await ticket.removeComment(ownerId, itemId)
      else ticket = await ticket.removeNote(ownerId, itemId)

      ticket = await ticket.save()

      utils.sendToAllConnectedClients(io, socketEvents.TICKETS_UPDATE, ticket)
    } catch (e) {
      // Blank
    }
  })
}

events.onAttachmentsUIUpdate = socket => {
  socket.on(socketEvents.TICKETS_UI_ATTACHMENTS_UPDATE, async data => {
    const ticketId = data._id

    if (_.isUndefined(ticketId)) return true

    try {
      const ticket = await ticketSchema.getTicketById(ticketId)
      const user = socket.request.user
      if (_.isUndefined(user)) return true

      const canRemoveAttachments = permissions.canThis(user.role, 'tickets:removeAttachment')

      const data = {
        ticket,
        canRemoveAttachments
      }

      utils.sendToAllConnectedClients(io, socketEvents.TICKETS_UI_ATTACHMENTS_UPDATE, data)
    } catch (e) {
      // Blank
    }
  })
}

module.exports = {
  events,
  eventLoop,
  register
}

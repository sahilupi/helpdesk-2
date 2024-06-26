
const _ = require('lodash')
const apiUtils = require('../apiUtils')
const Conversation = require('../../../models/chat/conversation')
const Message = require('../../../models/chat/message')

const apiMessages = {}

apiMessages.getConversations = async (req, res) => {
  try {
    const resConversations = []
    const conversations = await Conversation.getConversationsWithLimit(req.user._id)
    for (const convo of conversations) {
      const convoObject = convo.toObject()

      const userMeta =
        convo.userMeta[_.findIndex(convo.userMeta, item => item.userId.toString() === req.user._id.toString())]

      if (!_.isUndefined(userMeta) && !_.isUndefined(userMeta.deletedAt) && userMeta.deletedAt > convo.updatedAt)
        continue

      let recentMessage = await Message.getMostRecentMessage(convoObject._id)

      for (const participant of convoObject.participants) {
        if (participant._id.toString() !== req.user._id.toString()) {
          convoObject.partner = participant
        }

        delete participant.role
      }

      recentMessage = _.first(recentMessage)

      if (!_.isUndefined(recentMessage)) {
        if (convoObject.partner._id.toString() === recentMessage.owner._id.toString()) {
          convoObject.recentMessage = `${convoObject.partner.fullname}: ${recentMessage.body}`
        } else {
          convoObject.recentMessage = `You: ${recentMessage.body}`
        }
      } else {
        convoObject.recentMessage = 'New Conversation'
      }

      resConversations.push(convoObject)
    }

    return apiUtils.sendApiSuccess(res, { conversations: resConversations })
  } catch (e) {
    return apiUtils.sendApiError(res, 500, e.message)
  }
}

apiMessages.single = async (req, res) => {
  const _id = req.params.id
  if (!_id) return apiUtils.sendApiError(res, 400, 'Invalid Conversation Id')
  try {
    let conversation = await Conversation.getConversation(_id)

    if (!conversation) return apiUtils.sendApiError(res, 404, 'Conversation not found')

    conversation = conversation.toObject()
    let isParticipant = false
    for (const participant of conversation.participants) {
      if (participant._id.toString() === req.user._id.toString()) isParticipant = true
    }

    if (!isParticipant) return apiUtils.sendApiError(res, 400, 'Invalid')

    const convoMessages = await Message.getConversationWithObject({
      cid: conversation._id,
      userMeta: conversation.userMeta,
      requestingUser: req.user
    })

    // Clear the role. It's not needed
    for (const message of convoMessages) {
      message.owner.role = undefined
    }

    for (const participant of conversation.participants) {
      if (participant._id.toString() !== req.user._id.toString()) conversation.partner = participant

      delete participant.role
    }

    conversation.requestingUserMeta =
      conversation.userMeta[
      _.findIndex(conversation.userMeta, item => item.userId.toString() === req.user._id.toString())
      ]

    conversation.messages = convoMessages.reverse()

    return apiUtils.sendApiSuccess(res, { conversation })
  } catch (e) {
    return apiUtils.sendApiError(res, 500, e.message)
  }
}

apiMessages.deleteConversation = async (req, res) => {
  return apiUtils.sendApiSuccess(res)
}

module.exports = apiMessages

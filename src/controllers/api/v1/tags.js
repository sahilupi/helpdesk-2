

const _ = require('lodash')
const async = require('async')
const TagSchema = require('../../../models/tag')
const apiTags = {}

/**
 * @api {post} /api/v1/tags/create Creates a tag
 * @apiName createTag
 * @apiDescription Create a tag
 * @apiVersion 0.1.6
 * @apiGroup Tags
 * @apiHeader {string} accesstoken The access token for the logged in user
 *
 * @apiExample Example usage:
 * curl -H "Content-Type: application/json" -H "accesstoken: {accesstoken}" -X POST -d "{\"tag\": {tag}}" -l http://localhost/api/v1/tags/create
 *
 * @apiParamExample {json} Request-Example:
 {
     "tag": {tag}
 }
 *
 * @apiSuccess {boolean} success Successfully?
 * @apiSuccess {boolean} tag Saved Tag
 *
 * @apiError InvalidPostData Invalid Post Data
 */
apiTags.createTag = function (req, res) {
  const data = req.body
  if (_.isUndefined(data.tag)) return res.status(400).json({ error: 'Invalid Post Data' })

  const Tag = new TagSchema({
    name: data.tag
  })

  Tag.save(function (err, T) {
    if (err) return res.status(400).json({ error: err.message })

    return res.json({ success: true, tag: T })
  })
}

apiTags.getTagsWithLimit = function (req, res) {
  const qs = req.query
  const limit = qs.limit ? qs.limit : 25
  const page = qs.page ? qs.page : 0

  const tagSchema = require('../../../models/tag')
  const result = { success: true }

  async.parallel(
    [
      function (done) {
        try {
          tagSchema.getTagsWithLimit(parseInt(limit), parseInt(page), function (err, tags) {
            if (err) return done(err)

            result.tags = tags
            return done()
          })
        } catch (e) {
          return done({ message: 'Invalid Limit and/or page' })
        }
      },
      function (done) {
        tagSchema.countDocuments({}, function (err, count) {
          if (err) return done(err)
          result.count = count

          return done()
        })
      }
    ],
    function (err) {
      if (err) return res.status(500).json({ success: false, error: err.message })

      return res.json(result)
    }
  )
}

/**
 * @api {put} /api/v1/tags/:id Update Tag
 * @apiName updateTag
 * @apiDescription Updates given tag
 * @apiVersion 0.1.7
 * @apiGroup Tags
 * @apiHeader {string} accesstoken The access token for the logged in user
 *
 * @apiExample Example usage:
 * curl -H "accesstoken: {accesstoken}" -l http://localhost/api/v1/tags/:id
 *
 * @apiSuccess {boolean} success Successfully?
 * @apiSuccess {object} tag Updated Tag
 *
 */
apiTags.updateTag = function (req, res) {
  const id = req.params.id
  const data = req.body
  if (_.isUndefined(id) || _.isNull(id) || _.isNull(data) || _.isUndefined(data)) {
    return res.status(400).json({ success: false, error: 'Invalid Put Data' })
  }

  const tagSchema = require('../../../models/tag')
  tagSchema.getTag(id, function (err, tag) {
    if (err) return res.status(400).json({ success: false, error: err.message })

    tag.name = data.name

    tag.save(function (err, t) {
      if (err) return res.status(400).json({ success: false, error: err.message })

      return res.json({ success: true, tag: t })
    })
  })
}

/**
 * @api {delete} /api/v1/tags/:id Delete Tag
 * @apiName deleteTag
 * @apiDescription Deletes the given tag
 * @apiVersion 0.1.7
 * @apiGroup Tags
 * @apiHeader {string} accesstoken The access token for the logged in user
 *
 * @apiExample Example usage:
 * curl -H "accesstoken: {accesstoken}" -l http://localhost/api/v1/tags/:id
 *
 * @apiSuccess {boolean} success Successfully?
 *
 */
apiTags.deleteTag = function (req, res) {
  const id = req.params.id
  if (_.isUndefined(id) || _.isNull(id)) return res.status(400).json({ success: false, error: 'Invalid Tag Id' })

  async.series(
    [
      function (next) {
        const ticketModel = require('../../../models/ticket')
        ticketModel.getAllTicketsByTag(id, function (err, tickets) {
          if (err) return next(err)
          async.each(
            tickets,
            function (ticket, cb) {
              ticket.tags = _.reject(ticket.tags, function (o) {
                return o._id.toString() === id.toString()
              })

              ticket.save(function (err) {
                return cb(err)
              })
            },
            function (err) {
              if (err) return next(err)

              return next(null)
            }
          )
        })
      },
      function (next) {
        const tagSchema = require('../../../models/tag')
        tagSchema.findByIdAndRemove(id, function (err) {
          return next(err)
        })
      }
    ],
    function (err) {
      if (err) return res.status(400).json({ success: false, error: err.message })

      return res.json({ success: true })
    }
  )
}

module.exports = apiTags

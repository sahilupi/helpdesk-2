const _ = require('lodash')
const path = require('path')
const fs = require('fs-extra')
const Busboy = require('busboy')
const templateSchema = require('../models/template')

const editor = {}

editor.page = function (req, res) {
  const content = {}
  content.title = 'Editor'
  content.nav = 'settings'

  content.data = {}
  content.data.user = req.user
  content.data.common = req.viewdata
  content.data.template = req.params.template

  return res.render('editor', content)
}

editor.getAssets = function (req, res) {
  const imageExts = ['.gif', '.png', '.jpg', '.jpeg', '.ico', '.bmp']

  fs.ensureDirSync(path.join(__dirname, '../../public/uploads/assets/upload'))

  fs.readdir(path.join(__dirname, '../../public/uploads/assets/upload'), function (err, files) {
    if (err) return res.status(400).json({ success: false, error: err })

    files = files.filter(function (file) {
      return _.indexOf(imageExts, path.extname(file).toLowerCase() !== -1)
    })

    files = _.map(files, function (i) {
      return { src: '/uploads/assets/upload/' + i }
    })

    return res.json({ success: true, assets: files })
  })
}

editor.removeAsset = function (req, res) {
  const id = req.body.fileUrl
  if (!id) return res.status(400).json({ success: false, error: 'Invalid File' })

  const file = path.basename(id)
  fs.unlink(path.join(__dirname, '../../public/uploads/assets/upload', file), function (err) {
    if (err) return res.status(500).json({ success: false, error: err })

    return res.json({ success: true })
  })
}

editor.assetsUpload = function (req, res) {
  // const chance = new Chance()
  const busboy = new Busboy({
    headers: req.headers,
    limits: {
      files: 1,
      fileSize: 5 * 1024 * 1024 // 5mb limit
    }
  })

  const object = {}
  let error

  busboy.on('file', function (fieldname, file, filename, encoding, mimetype) {
    if (mimetype.indexOf('image/') === -1) {
      error = {
        status: 500,
        message: 'Invalid File Type'
      }

      return file.resume()
    }

    // const ext = path.extname(filename)

    const savePath = path.join(__dirname, '../../public/uploads/assets/upload')
    // const sanitizedFilename = chance.hash({ length: 20 }) + ext
    if (!fs.existsSync(savePath)) fs.ensureDirSync(savePath)

    object.filePath = path.join(savePath, filename)
    object.filename = filename
    object.mimetype = mimetype

    if (fs.existsSync(object.filePath)) {
      error = {
        status: 500,
        message: 'File already exists'
      }

      return file.resume()
    }

    file.on('limit', function () {
      error = {
        status: 500,
        message: 'File too large'
      }

      return file.resume()
    })

    file.pipe(fs.createWriteStream(object.filePath))
  })

  busboy.on('finish', function () {
    if (error) return res.status(error.status).json({ success: false, error: error })

    if (_.isUndefined(object.filename) || _.isUndefined(object.filePath)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid Form Data' } })
    }

    // Everything Checks out lets make sure the file exists and then add it to the attachments array
    if (!fs.existsSync(object.filePath))
      return res.status(500).json({ success: false, error: { message: 'File Failed to Save to Disk' } })

    const includePort = global.TRUDESK_PORT && global.TRUDESK_PORT !== (80 || 443)

    const fileUrl =
      req.protocol +
      '://' +
      req.hostname +
      (includePort ? ':' + global.TRUDESK_PORT.toString() : '') +
      '/uploads/assets/upload/' +
      object.filename

    // const dimensions = sizeOf(fileUrl)

    return res.json({
      success: true,
      data: [fileUrl]
    })
  })

  req.pipe(busboy)
}

editor.load = function (req, res) {
  templateSchema.get(req.params.id, function (err, template) {
    if (err) return res.status(400).json({ success: false, error: err })

    if (!template)
      return res.status(400).json({ success: false, invalid: true, error: { message: 'Invalid Template.' } })

    template.data.id = 'gjs-'

    return res.json(template.data)
  })
}

editor.save = function (req, res) {
  const name = req.body.template
  delete req.body.template
  templateSchema.findOneAndUpdate(
    { name: name },
    { name: name, data: req.body },
    { new: true, upsert: true },
    function (err, template) {
      if (err) return res.status(500).json({ success: false, error: err })

      return res.json({ success: true, tempalte: template })
    }
  )
}

module.exports = editor

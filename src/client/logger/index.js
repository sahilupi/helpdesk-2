import debug from 'debug'

const BASE = 'trudesk'
const COLOURS = {
  debug: 'blue',
  info: 'green',
  warn: 'pink',
  error: 'red'
} // choose better colours :)

class Log {
  generateMessage(level, message, source) {
    // Set the prefix which will cause debug to enable the message
    const namespace = `${BASE}:${level}`
    const createDebug = debug(namespace)

    // Set the colour of the message based on the level
    createDebug.color = COLOURS[level]

    if (source) {
      createDebug(source, message)
    } else {
      createDebug(message)
    }
  }

  debug(message, source) {
    return this.generateMessage('debug', message, source)
  }

  info(message, source) {
    return this.generateMessage('info', message, source)
  }

  warn(message, source) {
    return this.generateMessage('warn', message, source)
  }

  error(message, source) {
    return this.generateMessage('error', message, source)
  }
}

export default new Log()

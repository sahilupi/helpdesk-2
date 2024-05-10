import React, { Fragment } from 'react'
import PropTypes from 'prop-types'

import Log from '../../logger'

import $ from 'jquery'
// import ReactMarkdown from 'react-markdown'
// import gfm from 'remark-gfm'
// import rehypeRaw from 'rehype-raw'
import toMarkdown from 'tomarkdown'
import Easymde from 'easymde'

import 'inlineAttachment'
import 'inputInlineAttachment'
import 'cm4InlineAttachment'

class EasyMDE extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      value: '',
      loaded: false,
      showSuggestion: false,
      suggestion: this.props.suggestion
    }
  }

  componentDidMount () {
    this.easymde = new Easymde({
      element: this.element,
      forceSync: true,
      minHeight: this.props.height,
      toolbar: EasyMDE.getMdeToolbarItems(),
      autoDownloadFontAwesome: false,
      status: false,
      spellChecker: false
    });
    setTimeout(() => {
      this.setState({
        ...this.state,
        suggestion: this.props.suggestion
      });
    }, 5500);
    

    this.easymde.codemirror.on('change', () => {
      
      this.onTextareaChanged(this.easymde.value());
      this.setState({
        ...this.state,
        showSuggestion: false
      });
    })

    this.easymde.codemirror.on('focus', () => {
      this.setState({
        ...this.state,
        showSuggestion: true
      });
    })
    this.easymde.codemirror.on('blur', () => {
      setTimeout(() => {
        this.setState({
          ...this.state,
          showSuggestion: false
        });
      }, 1000);
    })

    if (this.easymde && this.props.allowImageUpload) {
      if (!this.props.inlineImageUploadUrl) return Log.error('Invalid inlineImageUploadUrl Prop.')

      const $el = $(this.element)
      const self = this
      if (!$el.hasClass('hasInlineUpload')) {
        $el.addClass('hasInlineUpload')
        window.inlineAttachment.editors.codemirror4.attach(this.easymde.codemirror, {
          onFileUploadResponse: function (xhr) {
            const result = JSON.parse(xhr.responseText)

            const filename = result[this.settings.jsonFieldName]

            if (result && filename) {
              let newValue
              if (typeof this.settings.urlText === 'function') {
                newValue = this.settings.urlText.call(this, filename, result)
              } else {
                newValue = this.settings.urlText.replace(this.filenameTag, filename)
              }

              const text = this.editor.getValue().replace(this.lastValue, newValue)
              this.editor.setValue(text)
              this.settings.onFileUploaded.call(this, filename)
            }
            return false
          },
          onFileUploadError: function (xhr) {
            const result = xhr.responseText
            const text = this.editor.getValue() + ' ' + result
            this.editor.setValue(text)
          },
          extraHeaders: self.props.inlineImageUploadHeaders,
          errorText: 'Error uploading file: ',
          uploadUrl: self.props.inlineImageUploadUrl,
          jsonFieldName: 'filename',
          urlText: '![Image]({filename})'
        })

        EasyMDE.attachFileDesc(self.element)
      }
    }
  }

  componentDidUpdate (prevProps) {
    if (this.easymde && this.easymde.value() !== this.state.value) {
      this.easymde.value(this.state.value)
    }
    if (this.props.suggestion !== prevProps.suggestion) {
      // Update the state only if suggestion prop has changed
      this.setState({
        ...this.state,
        suggestion: this.props.suggestion
      });
    }
  }

  componentWillUnmount () {
    if (this.easymde) {
      this.easymde.codemirror.off('change')
      this.easymde = null
    }
  }

  static getDerivedStateFromProps (nextProps, state) {
    if (typeof nextProps.defaultValue !== 'undefined') {
      if (!state.loaded && nextProps.defaultValue !== state.value)
        return { value: toMarkdown(nextProps.defaultValue).replace(/\\n/gi, '\n'), loaded: true }
    }

    return null
  }

  static attachFileDesc (textarea) {
    const $el = $(textarea)
    const attachFileDiv = $('<div></div>')
    attachFileDiv
      .addClass('attachFileDesc')
      .html('<p>Attach images by dragging & dropping or pasting from clipboard.</p>')
    $el.siblings('.CodeMirror').addClass('hasFileDesc')
    $el
      .siblings('.editor-statusbar')
      .addClass('hasFileDesc')
      .prepend(attachFileDiv)
  }

  onTextareaChanged (value) {
    this.setState({
      value
    });
    if(!value || value === '') {
      this.setState({
        ...this.state,
        value: '',
        suggestion: this.props.suggestion,
        showSuggestion: true
      });
    }
   

    if (this.props.onChange) this.props.onChange(value)
  }

  getEditorText () {
    return this.state.value
  }

  setEditorText (value) {
    this.setState({
      value: toMarkdown(value)
    })
  }

  onSelectSuggestion (suggestion) {
    this.setState({
      ...this.state,
      value: suggestion,
      suggestion: ''
    });
  }

  static getMdeToolbarItems () {
    return [
      {
        name: 'bold',
        action: Easymde.toggleBold,
        className: 'material-icons mi-bold no-ajaxy',
        title: 'Bold'
      },
      {
        name: 'italic',
        action: Easymde.toggleItalic,
        className: 'material-icons mi-italic no-ajaxy',
        title: 'Italic'
      },
      {
        name: 'Title',
        action: Easymde.toggleHeadingSmaller,
        className: 'material-icons mi-title no-ajaxy',
        title: 'Title'
      },
      '|',
      {
        name: 'Code',
        action: Easymde.toggleCodeBlock,
        className: 'material-icons mi-code no-ajaxy',
        title: 'Code'
      },
      {
        name: 'Quote',
        action: Easymde.toggleBlockquote,
        className: 'material-icons mi-quote no-ajaxy',
        title: 'Quote'
      },
      {
        name: 'Generic List',
        action: Easymde.toggleUnorderedList,
        className: 'material-icons mi-list no-ajaxy',
        title: 'Generic List'
      },
      {
        name: 'Numbered List',
        action: Easymde.toggleOrderedList,
        className: 'material-icons mi-numlist no-ajaxy',
        title: 'Numbered List'
      },
      '|',
      {
        name: 'Create Link',
        action: Easymde.drawLink,
        className: 'material-icons mi-link no-ajaxy',
        title: 'Create Link'
      },
      '|',
      {
        name: 'Toggle Preview',
        action: Easymde.togglePreview,
        className: 'material-icons mi-preview no-disable no-mobile no-ajaxy',
        title: 'Toggle Preview'
      }
    ]
  }

  render () {
    setTimeout(() => {
      this.easymde?.codemirror?.refresh()
    }, 250)
    return (
      <Fragment>
        <textarea ref={i => (this.element = i)} value={this.state.value} onChange={e => this.onTextareaChanged(e)} />
        {this.props.showStatusBar && <div className='editor-statusbar uk-float-left uk-width-1-1' />}
        {
          (this.state.suggestion && this.state.showSuggestion) ? 
          <div className='comment-suggestion' role='button' onClick={() => this.onSelectSuggestion(this.state.suggestion)} style={{
            position: 'absolute',
            top: '100px',
            'z-index': '10',
            left: '20px',
            'box-shadow': '0px 2px 5px 0px grey',
            padding: '3px',
            'border-radius': '8px',
            cursor: 'pointer',
            'maxWidth': '95%'
        }}
        >
          <pre>
            {this.state.suggestion}
          </pre>
        </div>: null
        }
        
      </Fragment>
    )
  }
}

EasyMDE.propTypes = {
  height: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
  defaultValue: PropTypes.string,
  allowImageUpload: PropTypes.bool,
  inlineImageUploadUrl: PropTypes.string,
  inlineImageUploadHeaders: PropTypes.object,
  showStatusBar: PropTypes.bool.isRequired,
  focus: PropTypes.func,
  suggestion: PropTypes.string,
}

EasyMDE.defaultProps = {
  height: '150px',
  allowImageUpload: false,
  showStatusBar: true
}

export default EasyMDE

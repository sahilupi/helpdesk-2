import React from 'react'
import PropTypes from 'prop-types'
import { makeObservable, observable } from 'mobx'
import { observer } from 'mobx-react'

import EasyMDE from 'components/EasyMDE'

import $ from 'jquery'
import 'jquery_custom'
import helpers from 'lib/helpers'

@observer
class OffCanvasEditor extends React.Component {
  @observable mdeText = ''
  @observable subjectText = ''
  @observable showSubject = true
  @observable onPrimaryClick = null

  constructor (props) {
    super(props)
    makeObservable(this)

    this.primaryClick = this.primaryClick.bind(this)
  }

  componentDidMount () {
    helpers.UI.inputs()
    $('.off-canvas-bottom').DivResizer({})
    this.showSubject = this.props.showSubject
  }

  componentDidUpdate () {
    helpers.UI.reRenderInputs()
  }

  primaryClick () {
    const data = {
      subjectText: this.subjectText,
      text: this.mdeText
    }

    if (this.onPrimaryClick) this.onPrimaryClick(data)

    this.closeEditorWindow()
  }

  openEditorWindow (data) {
    this.subjectText = data.subject || ''
    this.mdeText = data.text || ''
    this.editor.setEditorText(this.mdeText)
    this.showSubject = data.showSubject !== undefined ? data.showSubject : true

    this.onPrimaryClick = data.onPrimaryClick || null

    $(this.editorWindow)
      .removeClass('closed')
      .addClass('open')
  }

  closeEditorWindow (e) {
    if (e) e.preventDefault()

    $(this.editorWindow)
      .removeClass('open')
      .addClass('closed')
  }

  render () {
    return (
      <div className='off-canvas-bottom closed' ref={r => (this.editorWindow = r)}>
        <div className='edit-window-wrapper'>
          {this.showSubject && (
            <div className='edit-subject-wrap'>
              <label htmlFor='edit-subject-input'>Subject</label>
              <input
                id='edit-subject-input'
                className='md-input mb-10'
                value={this.subjectText}
                onChange={e => (this.subjectText = e.target.value)}
              />
            </div>
          )}
          <div className='editor-container'>
            <div className='editor'>
              <div className='code-mirror-wrap'>
                <EasyMDE
                  showStatusBar={false}
                  defaultValue={this.mdeText}
                  value={this.mdeText}
                  onChange={val => (this.mdeText = val)}
                  ref={r => (this.editor = r)}
                  allowImageUpload={this.props.allowUploads}
                  inlineImageUploadUrl={this.props.uploadURL}
                />
              </div>
            </div>
          </div>

          <div className='action-panel'>
            <div className='left-buttons'>
              <button className='save-btn uk-button uk-button-accent mr-5' onClick={this.primaryClick}>
                {this.props.primaryLabel}
              </button>
              <button className='uk-button uk-button-cancel' onClick={e => this.closeEditorWindow(e)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

OffCanvasEditor.propTypes = {
  showSubject: PropTypes.bool,
  primaryLabel: PropTypes.string.isRequired,
  onPrimaryClick: PropTypes.func,
  closeLabel: PropTypes.string,
  allowUploads: PropTypes.bool,
  uploadURL: PropTypes.string
}

OffCanvasEditor.defaultProps = {
  showSubject: true,
  closeLabel: 'Cancel',
  allowUploads: false
}

export default OffCanvasEditor

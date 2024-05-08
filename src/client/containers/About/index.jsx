import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import { showModal, hideModal } from 'actions/common'

import helpers from 'lib/helpers'

class AboutContainer extends React.Component {
  componentDidMount () {
    helpers.setupScrollers()
  }

  componentDidUpdate (prevProps, prevState, snapshot) {
    helpers.resizeAll()
  }

  render () {
    return (
      <div className='nopadding page-content'>
        <div className='uk-grid full-height scrollable' style={{ padding: '0 15px' }}>
          <div className='uk-width-1-2 uk-position-relative' style={{ padding: '25px 0 0 0' }}>
            <span style={{ position: 'absolute', top: 7, left: 35, fontSize: '11px' }} className='uk-text-muted'>
              Powered by
            </span>
            <h1 style={{ marginBottom: 25, marginLeft: 40 }}>Techtweek Infotech LLC</h1>
            <div style={{ paddingLeft: 40 }}>
              <h6>Techtweek Infotech LLC version {this.props.viewdata.get('version')}</h6>
              <p style={{ fontSize: '12px' }}>
                Copyright &copy;2021-{new Date().getFullYear()} Techtweek Infotech LLC <br /> <br />
                
                {' '}
                <br />
                <br />
                Licensed under the Apache License, Version 2.0 (the &quot;License&quot;); you may not use this file
                except in compliance with the License. You may obtain a copy of the License at{' '}
                <a href='http://www.apache.org/licenses/LICENSE-2.0' rel={'noreferrer'} target='_blank'>
                  http://www.apache.org/licenses/LICENSE-2.0
                </a>
                .
                <br />
                Unless required by applicable law or agreed to in writing, software distributed under the License is
                distributed on an &quot;AS IS&quot; BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
                or implied. See the License for the specific language governing permissions and limitations under the
                License.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

AboutContainer.propTypes = {
  showModal: PropTypes.func.isRequired,
  hideModal: PropTypes.func.isRequired,
  viewdata: PropTypes.object.isRequired
}

const mapStateToProps = state => ({
  viewdata: state.common.viewdata
})

export default connect(mapStateToProps, { showModal, hideModal })(AboutContainer)

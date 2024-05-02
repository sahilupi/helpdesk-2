

import React from 'react'
import PropTypes from 'prop-types'

class SettingItem extends React.Component {
  constructor(props) {
    super(props)
  }

  render() {
    const { title, subtitle, component, tooltip, extraClass } = this.props
    return (
      <div className='setting-item-wrap uk-margin-medium-bottom'>
        <div className={'panel trupanel nopadding no-hover-shadow ' + extraClass || ''} style={{ minHeight: '60px' }}>
          <div className='left'>
            <h6 style={{ padding: '0 0 0 15px', margin: '15px 0 0 0', fontSize: '16px', lineHeight: '14px' }}>
              {title}
              {tooltip && (
                <i
                  className='material-icons'
                  style={{ color: '#888', fontSize: '16px', cursor: 'pointer', lineHeight: '3px', marginLeft: '4px' }}
                  data-uk-tooltip="{cls:'long-text'}"
                  title={tooltip}
                >
                  error
                </i>
              )}
            </h6>
            <h5 style={{ padding: '0 0 10px 15px', margin: '2px 0 0 0', fontSize: '12px' }} className='uk-text-muted'>
              {subtitle}
            </h5>
          </div>
          <div className='right uk-width-1-3' style={{ position: 'relative', paddingTop: '5px' }}>
            <div className='uk-float-left' style={{ paddingRight: '11px', minWidth: '130px', width: '100%' }}>
              {component}
            </div>
          </div>
          {this.props.children && (
            <div>
              <hr className='nomargin-top clear' />
              <div className='panel-body2' style={{ padding: this.props.subPanelPadding || '20px 15px 15px 15px' }}>
                <div className='uk-position-relative'>
                  {React.Children.map(this.props.children, (child, k) => {
                    return (
                      <div key={k} className={'uk-clearfix'}>
                        {child}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
          {this.props.footer && (
            <div style={{ padding: '0 15px 25px 15px', marginTop: '-15px' }}>{this.props.footer}</div>
          )}
        </div>
      </div>
    )
  }
}

SettingItem.propTypes = {
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
  subtitle: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  tooltip: PropTypes.string,
  component: PropTypes.element,
  footer: PropTypes.element,
  subPanelPadding: PropTypes.string,
  extraClass: PropTypes.string,
  children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node])
}

export default SettingItem

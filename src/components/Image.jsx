import { Component } from 'preact'
import { animate } from 'popmotion'

export class Image extends Component {
  state = {
    loaded: false,
  }

  inview(entries, observer) {
    entries.forEach(entry => {
      if (!entry.intersectionRatio) return

      entry.target.addEventListener('load', this.loading.bind(this))
      entry.target.src = this.props.src
      observer.unobserve(entry.target)
    })
  }

  loading(event) {
    if (event.target.complete) {
      animate({
        from: 0,
        to: 1,
        duration: 350,
        onUpdate(v) {
          event.target.style.opacity = v
        },
      })
      this.setState({
        loaded: true,
      })
    }
  }

  componentDidMount() {
    this.setState({
      loaded: false,
    })

    const observer = new IntersectionObserver(this.inview.bind(this))

    observer.observe(this.element)
  }

  render() {
    const { loaded } = this.state
    const classList = (this.props.class ?? this.props.className)
      .split(' ')
      .filter(Boolean)
      .concat(loaded ? this.props.classNameOnLoad.split(' ') : [])
      .join(' ')

    return (
      <img
        className={classList}
        style={{
          opacity: 0,
        }}
        ref={element => {
          this.element = element
        }}
      />
    )
  }
}

class cMenu {
  static num = 0
  constructor(menutTemplate) {
    cMenu.num++
    if (!(menutTemplate instanceof Array)) {
      throw new Error('Parameter 1 must be of type Array')
    }
    this.init(menutTemplate)
  }

  init(menutTemplate) {
    if (document.getElementById('cm-' + cMenu.num) == null) {
      let cnt = document.createElement('div')
      cnt.className = 'cm-container'
      cnt.id = 'cm-' + cMenu.num
      document.body.appendChild(cnt)
    }
    const container = document.getElementById('cm-' + cMenu.num)
    container.innerHTML = ''
    container.appendChild(this.renderLevel(menutTemplate))
    this.documentClick = this.hide.bind(this)
    // container.addEventListener('click', this.documentClick)
    window.addEventListener('click', this.documentClick)
    container.style.top = '30px'
    container.style.left = '2px'
    this.container = container
  }

  renderLevel(level) {
    let ul_outer = document.createElement('ul')

    level.forEach((item) => {
      let li = document.createElement('li')
      li.classList.add('nav-item')

      if (item.type == 'cm-divider') li.classList.add('cm-divider')
      if (typeof item.sub !== 'undefined') li.classList.add('cm-sub-item')

      let text_span = document.createElement('span')
      text_span.innerText = item.text
      li.appendChild(text_span)

      if (typeof item.events === 'object') {
        const keys = Object.keys(item.events)

        for (let i = 0; i < keys.length; i++) {
          li.addEventListener(keys[i], item.events[keys[i]])
        }
      }

      if (typeof item.sub !== 'undefined') {
        li.appendChild(this.renderLevel(item.sub))
      }

      ul_outer.appendChild(li)
    })

    return ul_outer
  }

  toggle(e) {
    this.container.classList.toggle('display')
    e.stopPropagation()
  }

  hide(e) {
    if (e) {
      if (e.target.nodeName == 'SPAN') {
        if (e.target.parentNode.className.includes('cm-sub-item')) return
      }
      if (e.target.className.includes('cm-sub-item')) return
    }
    this.container.classList.remove('display')
  }
}

(function () {
  'use strict'

  var THEME_KEY = 'ruiqy.daily.doki-theme.v1'
  var POSITION_KEY = 'ruiqy.global-tools-position.v2'
  var DEFAULT_THEME = 'emilia-light'
  var THEMES = {
    'emilia-light': {
      name: '爱蜜莉雅',
      subtitle: 'Emilia',
      sticker: '/daily/doki/emilia_light.png'
    },
    beatrice: {
      name: '碧翠丝',
      subtitle: 'Beatrice',
      sticker: '/daily/doki/beatrice.png'
    },
    echidna: {
      name: '艾姬多娜',
      subtitle: 'Echidna',
      sticker: '/daily/doki/echidna_dark.png'
    },
    'nao-light': {
      name: '友利奈绪',
      subtitle: 'Tomori Nao',
      sticker: '/daily/doki/nao_light.png'
    },
    'inori-light': {
      name: '楪祈',
      subtitle: 'Yuzuriha Inori',
      sticker: '/daily/doki/inori_light.png'
    }
  }

  var activeTheme = readTheme()
  var menu = null
  var toggle = null
  var sticker = null

  function readTheme () {
    try {
      var stored = window.localStorage.getItem(THEME_KEY)
      return THEMES[stored] ? stored : DEFAULT_THEME
    } catch (error) {
      return DEFAULT_THEME
    }
  }

  function applyTheme (themeId, persist) {
    if (!THEMES[themeId]) themeId = DEFAULT_THEME
    activeTheme = themeId
    var tone = themeId === 'echidna' ? 'dark' : 'light'
    document.documentElement.setAttribute('data-doki-theme', themeId)
    document.documentElement.setAttribute('data-pat-theme', themeId)
    document.documentElement.setAttribute('data-doki-tone', tone)
    document.documentElement.setAttribute('data-pat-tone', tone)

    if (document.body) {
      document.body.setAttribute('data-doki-theme', themeId)
      document.body.setAttribute('data-pat-theme', themeId)
      document.body.setAttribute('data-doki-tone', tone)
      document.body.setAttribute('data-pat-tone', tone)
    }

    if (sticker) {
      sticker.src = THEMES[themeId].sticker
    }

    document.querySelectorAll('[data-doki-theme-option]').forEach(function (button) {
      var isActive = button.getAttribute('data-doki-theme-option') === themeId
      button.classList.toggle('is-active', isActive)
      button.setAttribute('aria-checked', String(isActive))
    })

    if (persist) {
      try {
        window.localStorage.setItem(THEME_KEY, themeId)
      } catch (error) {}
    }
  }

  function closeMenu () {
    if (!menu || !toggle) return
    menu.hidden = true
    toggle.setAttribute('aria-expanded', 'false')
  }

  function createThemeOption (themeId) {
    var theme = THEMES[themeId]
    var button = document.createElement('button')
    var swatch = document.createElement('span')
    var labels = document.createElement('span')
    var title = document.createElement('strong')
    var subtitle = document.createElement('small')
    var check = document.createElement('span')

    button.type = 'button'
    button.className = 'doki-theme-option'
    button.setAttribute('role', 'menuitemradio')
    button.setAttribute('data-doki-theme-option', themeId)

    swatch.className = 'doki-theme-swatch ' + themeId
    title.textContent = theme.name
    subtitle.textContent = theme.subtitle
    labels.appendChild(title)
    labels.appendChild(subtitle)
    check.className = 'doki-theme-check'
    check.textContent = '✓'

    button.appendChild(swatch)
    button.appendChild(labels)
    button.appendChild(check)
    button.addEventListener('click', function () {
      applyTheme(themeId, true)
      closeMenu()
    })

    return button
  }

  function readToolsPosition () {
    try {
      var stored = JSON.parse(window.localStorage.getItem(POSITION_KEY))
      if (Number.isFinite(stored.x) && Number.isFinite(stored.y)) return stored
    } catch (error) {}
    return null
  }

  function clampToolsPosition (tools, x, y) {
    var margin = 8
    var maxX = Math.max(margin, window.innerWidth - tools.offsetWidth - margin)
    var maxY = Math.max(margin, window.innerHeight - tools.offsetHeight - margin)

    return {
      x: Math.min(Math.max(x, margin), maxX),
      y: Math.min(Math.max(y, margin), maxY)
    }
  }

  function setToolsPosition (tools, x, y) {
    var position = clampToolsPosition(tools, x, y)
    tools.style.left = position.x + 'px'
    tools.style.top = position.y + 'px'
    tools.style.right = 'auto'
    tools.style.bottom = 'auto'
    return position
  }

  function saveToolsPosition (position) {
    try {
      window.localStorage.setItem(POSITION_KEY, JSON.stringify(position))
    } catch (error) {}
  }

  function enableToolsDragging (tools, handle) {
    var dragState = null

    handle.addEventListener('pointerdown', function (event) {
      if (event.pointerType === 'mouse' && event.button !== 0) return

      var bounds = tools.getBoundingClientRect()
      dragState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        left: bounds.left,
        top: bounds.top,
        moved: false
      }
      if (typeof handle.setPointerCapture === 'function') {
        handle.setPointerCapture(event.pointerId)
      }
      tools.classList.add('is-dragging')
      closeMenu()
    })

    handle.addEventListener('pointermove', function (event) {
      if (!dragState || event.pointerId !== dragState.pointerId) return

      var deltaX = event.clientX - dragState.startX
      var deltaY = event.clientY - dragState.startY
      if (!dragState.moved && Math.hypot(deltaX, deltaY) < 5) return

      dragState.moved = true
      event.preventDefault()
      setToolsPosition(tools, dragState.left + deltaX, dragState.top + deltaY)
    })

    function finishDragging (event) {
      if (!dragState || event.pointerId !== dragState.pointerId) return

      if (dragState.moved) {
        var bounds = tools.getBoundingClientRect()
        saveToolsPosition(setToolsPosition(tools, bounds.left, bounds.top))
      }

      if (typeof handle.hasPointerCapture === 'function' && handle.hasPointerCapture(event.pointerId)) {
        handle.releasePointerCapture(event.pointerId)
      }
      tools.classList.remove('is-dragging')
      dragState = null
    }

    handle.addEventListener('pointerup', finishDragging)
    handle.addEventListener('pointercancel', finishDragging)

    var savedPosition = readToolsPosition()
    if (savedPosition) {
      window.requestAnimationFrame(function () {
        setToolsPosition(tools, savedPosition.x, savedPosition.y)
      })
    }

    window.addEventListener('resize', function () {
      if (!tools.style.left) return
      window.requestAnimationFrame(function () {
        var bounds = tools.getBoundingClientRect()
        saveToolsPosition(setToolsPosition(tools, bounds.left, bounds.top))
      })
    })
  }

  function mountTools () {
    if (document.querySelector('.doki-global-tools')) return

    var tools = document.createElement('div')
    var contact = document.createElement('button')
    var image = document.createElement('img')
    var themeMenu = document.createElement('div')
    var themeToggle = document.createElement('button')
    var paletteIcon = document.createElement('span')

    tools.className = 'doki-global-tools'

    contact.type = 'button'
    contact.className = 'doki-contact-launcher'
    contact.title = '拖动主题贴纸'
    contact.setAttribute('aria-label', '拖动主题贴纸')

    image.className = 'doki-contact-sticker'
    image.alt = ''
    image.draggable = false
    contact.appendChild(image)

    themeToggle.type = 'button'
    themeToggle.className = 'doki-theme-toggle'
    themeToggle.title = '切换全站主题'
    themeToggle.setAttribute('aria-label', '切换全站主题')
    themeToggle.setAttribute('aria-haspopup', 'menu')
    themeToggle.setAttribute('aria-expanded', 'false')
    paletteIcon.className = 'doki-theme-glyph'
    paletteIcon.textContent = '🎨'
    themeToggle.appendChild(paletteIcon)

    themeMenu.className = 'doki-theme-menu'
    themeMenu.hidden = true
    themeMenu.setAttribute('role', 'menu')
    themeMenu.setAttribute('aria-label', '全站主题')
    Object.keys(THEMES).forEach(function (themeId) {
      themeMenu.appendChild(createThemeOption(themeId))
    })

    themeToggle.addEventListener('click', function (event) {
      event.stopPropagation()
      themeMenu.hidden = !themeMenu.hidden
      themeToggle.setAttribute('aria-expanded', String(!themeMenu.hidden))
    })

    tools.appendChild(themeMenu)
    tools.appendChild(contact)
    tools.appendChild(themeToggle)
    document.body.appendChild(tools)

    menu = themeMenu
    toggle = themeToggle
    sticker = image
    applyTheme(activeTheme, false)
    enableToolsDragging(tools, contact)

    document.addEventListener('click', function (event) {
      if (!tools.contains(event.target)) closeMenu()
    })

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeMenu()
    })
  }

  applyTheme(activeTheme, false)

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountTools, { once: true })
  } else {
    mountTools()
  }

  window.addEventListener('storage', function (event) {
    if (event.key === THEME_KEY && THEMES[event.newValue]) {
      applyTheme(event.newValue, false)
    }
  })
})()

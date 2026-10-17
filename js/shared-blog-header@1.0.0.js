(function () {
  function initHeader (header) {
    var menus = header.querySelector('#menus')
    var toggle = header.querySelector('[data-shared-nav-toggle]')
    var groups = Array.prototype.slice.call(header.querySelectorAll('[data-shared-nav-group]'))
    var boundScrollDocuments = typeof WeakSet === 'function' ? new WeakSet() : null

    function closeMenu () {
      if (!menus || !toggle) return
      menus.classList.remove('is-open')
      toggle.setAttribute('aria-expanded', 'false')
      toggle.setAttribute('aria-label', '打开导航菜单')
      groups.forEach(function (group) {
        group.closest('.menus_item').classList.remove('is-open')
        group.closest('.menus_item').classList.add('is-dismissed')
        group.setAttribute('aria-expanded', 'false')
      })
    }

    if (menus && toggle) {
      toggle.addEventListener('click', function (event) {
        event.stopPropagation()
        var open = menus.classList.toggle('is-open')
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false')
        toggle.setAttribute('aria-label', open ? '关闭导航菜单' : '打开导航菜单')
      })
    }

    groups.forEach(function (group) {
      group.addEventListener('click', function (event) {
        event.stopPropagation()
        var item = group.closest('.menus_item')
        var open = item.classList.toggle('is-open')
        item.classList.toggle('is-dismissed', !open)
        groups.forEach(function (other) {
          if (other === group) return
          other.closest('.menus_item').classList.remove('is-open')
          other.setAttribute('aria-expanded', 'false')
        })
        group.setAttribute('aria-expanded', open ? 'true' : 'false')
      })
      group.addEventListener('keydown', function (event) {
        if (event.key !== 'ArrowDown') return
        event.preventDefault()
        var item = group.closest('.menus_item')
        item.classList.add('is-open')
        item.classList.remove('is-dismissed')
        group.setAttribute('aria-expanded', 'true')
        var firstLink = item.querySelector('.menus_item_child a')
        if (firstLink) firstLink.focus()
      })
      group.closest('.menus_item').addEventListener('mouseenter', function () {
        this.classList.remove('is-dismissed')
      })
    })

    document.addEventListener('click', function (event) {
      if (!header.contains(event.target)) closeMenu()
    })

    header.addEventListener('focusout', function (event) {
      var item = event.target.closest('.menus_item')
      if (!item || item.contains(event.relatedTarget)) return
      item.classList.remove('is-open')
      var group = item.querySelector('[data-shared-nav-group]')
      if (group) group.setAttribute('aria-expanded', 'false')
    })

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' || !header.contains(document.activeElement)) return
      var focusedGroup = document.activeElement.closest('.menus_item')
      var wasOpen = menus && menus.classList.contains('is-open')
      closeMenu()
      if (wasOpen && toggle) toggle.focus()
      else if (focusedGroup) {
        var group = focusedGroup.querySelector('[data-shared-nav-group]')
        if (group) group.focus()
      }
    })

    window.addEventListener('resize', function () {
      if (!window.matchMedia('(max-width: 980px)').matches) closeMenu()
    })

    function getScrollTop (target) {
      try {
        return Math.max(target.scrollY || target.document.documentElement.scrollTop || 0, 0)
      } catch (error) {
        return 0
      }
    }

    function bindScrollTarget (target) {
      if (!target) return

      var scrollDocument
      try {
        scrollDocument = target.document
      } catch (error) {
        return
      }

      if (boundScrollDocuments && boundScrollDocuments.has(scrollDocument)) return
      if (boundScrollDocuments) boundScrollDocuments.add(scrollDocument)

      var lastTop = 0
      var ticking = false

      function updateHeader () {
        var currentTop = getScrollTop(target)
        var isDown = currentTop > lastTop

        if (currentTop > 56) {
          header.classList.add('nav-fixed')
          if (isDown) {
            header.classList.remove('nav-visible')
            closeMenu()
          } else {
            header.classList.add('nav-visible')
          }
        } else if (currentTop === 0) {
          header.classList.remove('nav-fixed', 'nav-visible')
        }

        lastTop = currentTop
        ticking = false
      }

      target.addEventListener('scroll', function () {
        if (ticking) return
        ticking = true
        target.requestAnimationFrame(updateHeader)
      }, { passive: true })

      updateHeader()
    }

    bindScrollTarget(window)

    var articleFrame = document.querySelector('[data-doc-article-frame]')
    if (articleFrame) {
      articleFrame.addEventListener('load', function () {
        try {
          bindScrollTarget(articleFrame.contentWindow)
        } catch (error) {
          // The docs frame is normally same-origin; keep the outer header usable if it is not.
        }
      })

      try {
        if (articleFrame.contentWindow) bindScrollTarget(articleFrame.contentWindow)
      } catch (error) {}
    }
  }

  document.querySelectorAll('[data-shared-blog-header]').forEach(initHeader)
})()

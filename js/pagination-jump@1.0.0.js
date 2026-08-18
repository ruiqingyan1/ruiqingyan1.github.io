(() => {
  function getBasePath (currentPage) {
    const pathname = window.location.pathname

    if (currentPage <= 1) return pathname.endsWith('/') ? pathname : pathname + '/'

    const currentPageSuffix = new RegExp('/page/' + currentPage + '/?$')
    return pathname.replace(currentPageSuffix, '/')
  }

  document.addEventListener('submit', event => {
    const form = event.target.closest('.pagination-jump')
    if (!form) return

    event.preventDefault()

    const input = form.querySelector('input[name="page"]')
    const total = Number(form.dataset.total)
    const current = Number(form.dataset.current)
    const requested = Number(input.value)

    if (!Number.isInteger(requested) || requested < 1 || requested > total) {
      input.value = Math.min(Math.max(requested || 1, 1), total)
      input.focus()
      return
    }

    const basePath = getBasePath(current)
    const targetPath = requested === 1
      ? basePath
      : basePath + 'page/' + requested + '/'

    window.location.href = targetPath + '#content-inner'
  })
})()

(function () {
  const root = document.getElementById('guestbook-app')
  if (!root) return

  const api = root.dataset.api || '/api/guestbook/messages'
  const form = root.querySelector('[data-guestbook-form]')
  const messagesEl = root.querySelector('[data-guestbook-messages]')
  const statusEl = root.querySelector('[data-guestbook-status]')
  const refreshBtn = root.querySelector('[data-guestbook-refresh]')
  const submitBtn = form.querySelector('[type="submit"]')

  function setStatus (text, isError) {
    statusEl.textContent = text || ''
    statusEl.classList.toggle('is-error', Boolean(isError))
  }

  function formatDate (value) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  function textNode (tag, className, text) {
    const el = document.createElement(tag)
    if (className) el.className = className
    el.textContent = text
    return el
  }

  function renderMessages (messages) {
    messagesEl.innerHTML = ''
    if (!messages.length) {
      messagesEl.appendChild(textNode('div', 'guestbook-empty', '还没有公开留言，来坐第一个小板凳。'))
      return
    }

    messages.forEach((message) => {
      const item = document.createElement('article')
      item.className = 'guestbook-message'

      const meta = document.createElement('div')
      meta.className = 'guestbook-message-meta'
      meta.appendChild(textNode('span', 'guestbook-message-name', message.nickname || '匿名来客'))
      meta.appendChild(textNode('time', 'guestbook-message-date', formatDate(message.createdAt)))

      item.appendChild(meta)
      item.appendChild(textNode('div', 'guestbook-message-content', message.content || ''))

      if (message.reply) {
        item.appendChild(textNode('div', 'guestbook-reply', '睿清颜回复：' + message.reply))
      }

      messagesEl.appendChild(item)
    })
  }

  async function loadMessages () {
    try {
      refreshBtn.disabled = true
      const response = await fetch(api, { headers: { Accept: 'application/json' } })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || '留言加载失败。')
      renderMessages(Array.isArray(payload.messages) ? payload.messages : [])
    } catch (error) {
      renderMessages([])
      setStatus(error.message || '留言加载失败。', true)
    } finally {
      refreshBtn.disabled = false
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    setStatus('')

    const formData = new FormData(form)
    const payload = {
      nickname: String(formData.get('nickname') || '').trim(),
      content: String(formData.get('content') || '').trim(),
      consent: formData.get('consent') === 'on',
      website: String(formData.get('website') || '')
    }

    if (!payload.nickname || !payload.content) {
      setStatus('昵称和留言都要填一下。', true)
      return
    }

    submitBtn.disabled = true
    submitBtn.textContent = '发送中'

    try {
      const response = await fetch(api, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '提交失败。')
      form.reset()
      setStatus('收到啦，会先经过审核再公开。')
      await loadMessages()
    } catch (error) {
      setStatus(error.message || '提交失败，稍后再试。', true)
    } finally {
      submitBtn.disabled = false
      submitBtn.textContent = '提交留言'
    }
  })

  refreshBtn.addEventListener('click', loadMessages)
  loadMessages()
})()

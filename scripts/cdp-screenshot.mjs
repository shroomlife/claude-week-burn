import { writeFile } from 'node:fs/promises'

const TAB_URL_INCLUDES = 'shroomlife.github.io/claude-week-burn'

async function getTab() {
  const res = await fetch('http://localhost:9222/json')
  const tabs = await res.json()
  return tabs.find((t) => (t.url || '').includes(TAB_URL_INCLUDES))
}

function send(ws, id, method, params = {}) {
  return new Promise((resolve, reject) => {
    const onMsg = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.id === id) {
        ws.removeEventListener('message', onMsg)
        if (msg.error) reject(new Error(JSON.stringify(msg.error)))
        else resolve(msg.result)
      }
    }
    ws.addEventListener('message', onMsg)
    ws.send(JSON.stringify({ id, method, params }))
  })
}

async function main() {
  const tab = await getTab()
  const ws = new WebSocket(tab.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
    ws.addEventListener('error', reject, { once: true })
  })
  const shot = await send(ws, 1, 'Page.captureScreenshot', { format: 'png' })
  await writeFile('screenshots/phone-now.png', Buffer.from(shot.data, 'base64'))
  console.log('saved screenshots/phone-now.png')
  ws.close()
  process.exit(0)
}
main()

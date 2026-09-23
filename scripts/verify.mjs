// Drives the built app with Playwright (Chromium) through every screen and
// button at 390×844 and 1440×900. Fails on console errors, page errors,
// horizontal scroll, dead buttons, or a backdrop that does not change on
// scroll. Screenshots land in ./shots.
import { spawn } from 'node:child_process'
import { mkdirSync, existsSync, readdirSync } from 'node:fs'
import { chromium } from 'playwright'

const PORT = 4173
const BASE = `http://127.0.0.1:${PORT}`
mkdirSync('shots', { recursive: true })

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function startPreview() {
  const proc = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { stdio: ['ignore', 'pipe', 'pipe'] })
  proc.stderr.on('data', (d) => process.stderr.write(d))
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(BASE)
      if (r.ok) return proc
    } catch {}
    await wait(250)
  }
  proc.kill()
  throw new Error('preview server did not start')
}

const failures = []
const check = (cond, msg) => {
  if (!cond) {
    failures.push(msg)
    console.log('  ✗', msg)
  } else console.log('  ✓', msg)
}

async function noHScroll(page, label) {
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
  check(sw <= iw, `${label}: no horizontal scroll (${sw} ≤ ${iw})`)
}

async function activeScene(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('.scene-photo')).findIndex((el) => el.classList.contains('is-active')))
}

async function setRange(page, locator, value) {
  await locator.evaluate((el, v) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    setter.call(el, String(v))
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }, value)
}

async function run(browser, viewport, tag) {
  console.log(`\n=== ${tag} ${viewport.width}×${viewport.height} ===`)
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  const shot = async (name) => {
    await wait(320) // let entrance animations settle
    await page.screenshot({ path: `shots/${tag}-${name}.png`, fullPage: false })
  }

  await page.goto(BASE)
  await page.getByRole('button', { name: /Open the Sep 2026 scorecard/ }).waitFor()
  await shot('01-welcome')
  await noHScroll(page, 'welcome')
  check((await activeScene(page)) === 0, 'welcome shows scene 0')

  // --- Dashboard
  await page.getByRole('button', { name: /Open the Sep 2026 scorecard/ }).click()
  await page.getByText('RAKEZ · Acquisition & Brand Scorecard').waitFor()
  await wait(900)
  const canvases = await page.locator('canvas').count()
  check(canvases >= 1, `dashboard renders WebGL canvases (${canvases})`)
  await shot('02-dashboard-top')
  await noHScroll(page, 'dashboard')
  await page.locator('canvas').first().scrollIntoViewIfNeeded()
  await wait(1400)
  await shot('02b-skyline')
  await page.locator('canvas').nth(1).scrollIntoViewIfNeeded()
  await wait(1200)
  await shot('02c-benchmark3d')
  await page.evaluate(() => window.scrollTo(0, 0))
  await wait(300)

  // Scroll-driven backdrop: scene must change going down and back up.
  const seen = [await activeScene(page)]
  const total = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y <= total; y += Math.round(viewport.height * 0.6)) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y)
    await wait(450)
    const s = await activeScene(page)
    if (s !== seen[seen.length - 1]) seen.push(s)
  }
  await shot('03-dashboard-bottom')
  await page.evaluate(() => window.scrollTo(0, 0))
  await wait(500)
  const backTop = await activeScene(page)
  check(new Set(seen).size >= 4, `backdrop changes while scrolling down (scenes seen: ${seen.join('→')})`)
  check(backTop === seen[0], `backdrop returns to the first scene when scrolling back up (${backTop})`)

  // Hero card → tile sheet → Escape closes it.
  await page.getByRole('button', { name: /^Indicator Brand Equity Score:/ }).click()
  await page.getByRole('dialog').waitFor()
  await shot('04-tile-sheet-hero')
  await page.keyboard.press('Escape')
  await wait(200)
  check((await page.getByRole('dialog').count()) === 0, 'Escape closes the tile sheet')

  // Locked tile → plan → mark live → back → enter a value.
  await page.getByRole('button', { name: /^Call answered ≤ 3 rings:/ }).click()
  await page.getByRole('dialog').waitFor()
  check(await page.getByText(/Source not live/).isVisible(), 'locked tile explains its missing source')
  await shot('05-tile-locked')
  await page.getByRole('button', { name: /in the pilot plan/ }).click()
  await page.getByRole('dialog').waitFor()
  await wait(300)
  check(await page.getByText('Export the telephony log weekly').first().isVisible(), 'jump opens the telephony step in the pilot plan')
  await shot('06-plan-step')
  await page.getByRole('button', { name: /Mark source as live/ }).click()
  await wait(300)
  check(await page.getByRole('status').isVisible(), 'marking a source live shows a toast')
  await shot('07-plan')
  await noHScroll(page, 'plan')
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await page.getByText('RAKEZ · Acquisition & Brand Scorecard').waitFor()
  await page.getByRole('button', { name: /^Call answered ≤ 3 rings:/ }).click()
  await page.getByRole('dialog').waitFor()
  const slider = page.getByRole('dialog').locator('input[type=range]')
  check((await slider.count()) === 1, 'live tile exposes a demo entry slider')
  await setRange(page, slider, 82)
  await wait(150)
  check(await page.getByRole('dialog').getByText('82%').first().isVisible(), 'slider readout updates to 82%')
  await shot('08-tile-entry')
  await page.getByRole('button', { name: /Apply demo value/ }).click()
  await wait(300)
  check(await page.getByRole('button', { name: /^Call answered ≤ 3 rings: 82%/ }).isVisible(), 'tile shows the applied 82% (amber)')
  check(await page.getByText(/Scenario · 1 demo entry/).isVisible(), 'header pill switches to Scenario')

  // Slide view / interactive view.
  await page.getByRole('tab', { name: /Slide/ }).click()
  await wait(400)
  check((await page.locator('canvas').count()) === 0, 'slide view hides the 3D models')
  await shot('09-slide-view')
  await noHScroll(page, 'slide view')
  await page.getByRole('tab', { name: /Interactive/ }).click()
  await wait(600)

  // Benchmark 2D + peers modal.
  await page.getByRole('tab', { name: /2D/ }).click()
  await wait(200)
  check((await page.getByRole('img', { name: /Benchmark/ }).count()) === 1, '2D benchmark SVG renders')
  await page.getByRole('button', { name: /Edit peer values/ }).click()
  await page.getByRole('dialog').waitFor()
  await page.getByLabel('IFZA Brand Equity score').fill('66')
  await page.getByRole('button', { name: /Save peer values/ }).click()
  await wait(250)
  check((await page.getByRole('dialog').count()) === 0, 'peer modal closes on save')
  await page.getByRole('tab', { name: /3D/ }).click()
  await wait(400)

  // Reset scenario.
  await page.getByRole('button', { name: 'Reset to baseline' }).click()
  await wait(200)
  check(await page.getByText('Baseline Sep 2026').first().isVisible(), 'reset restores the baseline pill')

  // --- Menu → every screen, back from each.
  const menuTargets = [
    ['Pilot plan', 'Make every tile sourceable', '10-plan'],
    ['KPI dictionary', 'KPI dictionary', '11-dictionary'],
    ['BE re-scoring', 'Brand Equity re-scoring', '12-rescoring'],
    ['Mystery-shop log', 'Partner mystery shop', '13-shop'],
    ['Build options', 'Three build options', '14-build'],
  ]
  for (const [label, heading, file] of menuTargets) {
    await page.getByRole('button', { name: 'Menu', exact: true }).click()
    await page.locator('nav').getByRole('button', { name: new RegExp(label) }).click()
    await page.getByRole('heading', { name: heading }).waitFor()
    await wait(300)
    await shot(file)
    await noHScroll(page, label)
    if (label === 'KPI dictionary') {
      await page.getByLabel('Search the KPI dictionary').fill('Finance')
      await wait(150)
      const n = await page.locator('main, body').getByRole('button', { name: /FIN_0/ }).count()
      check(n >= 1, `dictionary search filters rows (${n} finance rows)`)
      await page.getByRole('button', { name: /FIN_01/ }).first().click()
      await page.getByRole('dialog').waitFor()
      await page.keyboard.press('Escape')
      await page.getByRole('tab', { name: /Sources/ }).click()
      await wait(150)
      check(await page.getByRole('heading', { name: 'Data sources and owners' }).isVisible(), 'sources tab renders')
      await page.getByRole('tab', { name: /Excel build/ }).click()
      await wait(150)
      check(await page.getByText('Sheet 1 — Data (monthly entry)').isVisible(), 'excel tab renders')
    }
    if (label === 'BE re-scoring') {
      await page.getByRole('radio', { name: '4' }).nth(1).click()
      await wait(150)
      check(await page.getByRole('button', { name: /Apply 56 to the scorecard/ }).isVisible(), 'BE composite recalculates live (48 → 56)')
      await shot('12b-rescoring-changed')
      await page.getByRole('button', { name: /Apply 56 to the scorecard/ }).click()
      await page.getByText('RAKEZ · Acquisition & Brand Scorecard').waitFor()
      await wait(300)
      check(await page.getByRole('button', { name: /^Indicator Brand Equity Score: 56/ }).isVisible(), 'applied composite shows on the hero card')
      continue
    }
    if (label === 'Mystery-shop log') {
      await page.getByRole('button', { name: /Log a shop call/ }).click()
      await page.getByRole('dialog').waitFor()
      await page.getByRole('button', { name: /Named RAKEZ before the prospect did/ }).click()
      await page.getByRole('button', { name: /Log call and recompute tiles/ }).click()
      await wait(300)
      check(await page.getByRole('button', { name: /CSP recommends RAKEZ/ }).getByText('100%').isVisible(), 'logged call recomputes the recommendation tile to 100%')
      await shot('13b-shop-logged')
    }
    if (label === 'Build options') {
      await page.getByRole('button', { name: /Select: Hand over as the pilot artefact/ }).click()
      await page.getByRole('dialog').waitFor()
      await page.getByRole('button', { name: /Confirm \(demo\)/ }).click()
      await wait(250)
      check(await page.getByText(/Selected — Hand over as the pilot artefact/).isVisible(), 'build option confirms and flips the card')
    }
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await page.getByText('RAKEZ · Acquisition & Brand Scorecard').waitFor()
  }

  // --- Retake questionnaire end-to-end.
  await page.getByRole('button', { name: /Retake the questionnaire/ }).click()
  await page.getByRole('heading', { name: 'Which seat are you in?' }).waitFor()
  await shot('15-quiz')
  await page.getByRole('button', { name: /Sales ops/ }).click()
  await page.getByRole('button', { name: /Weekly — the two SLA tiles/ }).click()
  await page.getByRole('button', { name: /Defend enquiry/ }).click()
  await page.getByText('Assembling your scorecard view…').waitFor()
  await shot('16-generating')
  await page.getByText('RAKEZ · Acquisition & Brand Scorecard').waitFor({ timeout: 5000 })
  await wait(400)
  check(await page.getByText(/Weekly view/).isVisible(), 'weekly cadence banner appears for the new seat')
  check((await page.getByText('yours').count()) >= 2, 'sales-ops tiles are marked as yours')
  await shot('17-dashboard-salesops')

  // Back to welcome from dashboard.
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await page.getByRole('button', { name: /Open the Sep 2026 scorecard/ }).waitFor()

  check(errors.length === 0, `no console/page errors${errors.length ? `: ${errors.slice(0, 5).join(' | ')}` : ''}`)
  await ctx.close()
}

// Prefer a pre-installed Chromium (PLAYWRIGHT_BROWSERS_PATH) over downloading one.
function findChromium() {
  if (process.env.PW_EXECUTABLE && existsSync(process.env.PW_EXECUTABLE)) return process.env.PW_EXECUTABLE
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'
  const candidates = [`${root}/chromium`]
  try {
    for (const d of readdirSync(root).filter((d) => d.startsWith('chromium-')).sort().reverse()) candidates.push(`${root}/${d}/chrome-linux/chrome`)
  } catch {}
  return candidates.find((c) => existsSync(c))
}
const executablePath = findChromium()
console.log('chromium:', executablePath || '(playwright default)')

const server = await startPreview()
let browser
try {
  browser = await chromium.launch({ executablePath, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
  await run(browser, { width: 390, height: 844 }, 'phone')
  await run(browser, { width: 1440, height: 900 }, 'desktop')
} catch (e) {
  failures.push(`crash: ${e.message.split('\n')[0]}`)
  console.log('  ✗ crash:', e.message.split('\n')[0])
} finally {
  await browser?.close()
  server.kill()
}
console.log(failures.length ? `\n${failures.length} check(s) failed` : '\nAll checks passed')
process.exit(failures.length ? 1 : 0)

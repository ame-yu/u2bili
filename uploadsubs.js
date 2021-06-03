import { bilibiliCookies, metaPath } from "./config.js"
import { chromium, webkit, firefox } from "playwright"
import { readdirSync, existsSync, readFileSync } from "fs"

const meta = JSON.parse(readFileSync(metaPath))
const homePage = process.argv?.[2]

const langSelectorMap = {
  en: "div.el-select-dropdown.el-popper > div > ul > li:nth-child(6)",
  ja: "div.el-select-dropdown.el-popper > div > ul > li:nth-child(7)",
}

const cookie = Object.keys(bilibiliCookies).map((k) => {
  return {
    domain: ".bilibili.com",
    path: "/",
    name: k,
    value: bilibiliCookies[k],
  }
})

function setBlockAllImage(page) {
  return page.route("**/*", (route) => {
    if (route.request().resourceType() === "image") return route.abort()
    let isTracker = /(log-reporter.js)/.test(route.request().url())
    if (isTracker) return route.abort()
    return route.continue()
  })
}

async function main(subsPath = "./downloads") {
  if (!homePage)
    return console.log(
      `缺少参数，需要B站视频链接(如https://www.bilibili.com/video/BV1Pf4y1a7RK/)`
    )
  if (!existsSync(subsPath))
    return console.log(`${subsPath}目录不存在，程序退出。`)
  const browser = await firefox.launch({
    headless: process.platform !== "win32",
  })

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Safari/537.36 Edg/88.0.705.74",
    storageState: {
      origins: [
        {
          origin: "https://member.bilibili.com",
          localStorage: [
            {
              name: "SHOW_GUIDE",
              value: "1",
            },
          ],
        },
      ],
    },
  })

  context.addCookies(cookie)
  const page = await context.newPage()
  await setBlockAllImage(page)
  try {
    await page.goto(homePage, { timeout: 20 * 1000 })
  } catch (error) {
    if (error.name === "TimeoutError") {
      console.log("网络问题导致页面加载超时...")
    }
  }

  const [bvid, cid] = await page.evaluate(() => [window.bvid, window.cid])
  console.log(`${bvid}\tcid:${cid}`)

  const subNames = readdirSync(subsPath).filter((file) => file.includes("srt"))

  for await (let subName of subNames) {
    await page.goto(
      `https://account.bilibili.com/subtitle/edit/#/editor?bvid=${bvid}&cid=${cid}`,
      // `https://member.bilibili.com/platform/zimu/my-zimu/zimu-editor?bvid=${bvid}&cid=${cid}`,
      {
        waitUntil: "networkidle",
      }
    )
    const lang = /.*\.(.{2,5})\.srt/.exec(subName)?.[1]
    const langSelector = langSelectorMap[lang] || langSelectorMap.en
    console.log(`Ready to upload ${lang} sub.`)
    await page.click(langSelector)
    const [fileChooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      // page.click('#app > div > div > div.clearfix > div.editor-video > div.file-tool.clearfix > label > div')
      page.click('text="上传字幕"'),
    ])
    await fileChooser.setFiles(`./downloads/${meta["id"]}.${lang}.srt`)
    await page.click('text="提交"')
    console.log(`提交${lang}字幕`)
    await page.waitForTimeout(1 * 1000)
  }

  await page.close()
  await context.close()
  await browser.close()
}

main()

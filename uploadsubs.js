import { bilibiliCookies, downloadPath, showBrowser } from "./config.js"
import { firefox } from "playwright"
import { readdirSync, existsSync, readFileSync } from "fs"
import { parseCookieObject } from "./utils.js"

//常用语言
const langSelectorMap = {
  en: "div.el-select-dropdown.el-popper > div > ul > li:nth-child(6)",
  ja: "div.el-select-dropdown.el-popper > div > ul > li:nth-child(7)",
}

const metaList = readdirSync(downloadPath)
  .filter((fileName) => fileName.endsWith(".json"))
  .map((fileName) => {
    let path = `${downloadPath}${fileName}`
    return {
      path,
      ...JSON.parse(readFileSync(path)),
    }
  })
  .filter((meta) => meta?.subtitles && meta?.["biliUrl"])

console.log(`${metaList.length} video subtitle will be upload.`)

async function blockImageAndTracker(page) {
  await page.route("**/*", (route) => {
    if (route.request().resourceType() === "image") return route.abort()
    let isTracker = /(log-reporter.js)|(data.bilibili.com\/log)/.test(
      route.request().url()
    )
    if (isTracker) return route.abort()
    return route.continue()
  })
}

async function main() {
  const browser = await firefox.launch({
    headless: !showBrowser,
  })

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Safari/537.36 Edg/88.0.705.74",
  })

  context.addCookies(parseCookieObject(bilibiliCookies))

  const page = await context.newPage()
  await blockImageAndTracker(page)

  for await (let meta of metaList) {
    let subs = meta["subtitles"]
    console.log(`${meta["title"]} has ${Object.keys(subs).length} sub.`)
    await page.goto(meta["biliUrl"])
    const [bvid, cid] = await page.evaluate(() => [window.bvid, window.cid])
    console.log(`bvid:${bvid}\tcid:${cid}`)

    await Promise.all([
      page.goto(
        `https://account.bilibili.com/subtitle/edit/#/editor?bvid=${bvid}&cid=${cid}`,
        {
          waitUntil: "networkidle",
        }
      ),
      page.waitForResponse(/subtitle_lan.json/),
    ])

    //上传字幕阶段
    for await (let lang of Object.keys(subs)) {
      let subPath = `${downloadPath}${meta["id"]}.${lang}.srt`
      if (!existsSync(subPath)) {
        console.log(`${subPath} is not exist. skip`)
        continue
      }
      let langSelector = langSelectorMap[lang]
      if (!langSelector) {
        console.log(`unknown language. skip`)
        continue
      }

      if (
        (await (await page.$(langSelector)).textContent()).includes("已发布")
      ) {
        console.log("Oops, Seems to be this sub already submitted.")
        continue
      }

      await page.click(langSelector)
      const [fileChooser] = await Promise.all([
        page.waitForEvent("filechooser"),
        page.click('text="上传字幕"'),
      ])
      await fileChooser.setFiles(subPath)
      await page.click('text="提交"')
      console.log(`Submit ${lang} sub complete`)
    }
  }

  await page.close()
  await context.close()
  await browser.close()
}

main()

import fs from "fs"
import https from "https"
import { bilibiliCookies, downloadPath, showBrowser } from "./config.js"
import { parseCookieObject } from "./utils.js"
import { firefox as browserCore } from "playwright"
import { exec } from "child_process"

/* 使用方法
 * node uploadsubs.js <batchSize> <userId>
 * batchSize 扫描最近的视频数量 默认5条
 * userId    用户ID （可选）默认当前用户
 */
const batchSize = process.argv[2] || 5
const userId = process.argv[3] || bilibiliCookies.DedeUserID
main(batchSize, userId)

// 目标语言
const langSelectorMap = {
  en: {
    name: "English",
    langCode: "en",
    langSelector: "div.el-select-dropdown.el-popper > div > ul > li:nth-child(6)",
  },
  ja: {
    name: "日本語",
    langCode: "ja",
    langSelector: "div.el-select-dropdown.el-popper > div > ul > li:nth-child(7)",
  },
  zh: {
    name: "简体中文",
    langCode: "zh-Hans",
    langSelector: "div.el-select-dropdown.el-popper > div > ul > li:nth-child(1)",
  }
}

async function downloadSubtitle(youtubeUrl, bvid){
  return new Promise((resolve, reject) => {
    const command = `youtube-dl "${youtubeUrl}" --all-subs -o ${downloadPath}${bvid} --skip-download`
    console.log(command);
    exec(command,
    (error, stdout, stderr) => {
      if (error) {
          console.log(`error: ${error.message}`);
          return reject(error);
      }
      if (stderr) {
          console.log(`stderr: ${stderr}`);
          return reject(error);
      }
      console.log(`stdout: ${stdout}`);
      resolve()
  })
  })
}

async function getApi(url) {
  let data = new Uint8Array(0)
  function jsonEscape(str) {
    return str
      .replace(/\n/g, "\\\\n")
      .replace(/\r/g, "\\\\r")
      .replace(/\t/g, "\\\\t")
  }
  return new Promise((resolve) => {
    https.get(url, (res) => {
      res.on("data", (chunk) => {
        data += chunk
      })
      res.on("end", (_) => {
        resolve(JSON.parse(jsonEscape(data.toString())))
      })
    })
  })
}

function blockImageAndTracker(page) {
  return page.route("**/*", (route) => {
    if (route.request().resourceType() === "image") return route.abort()
    let isTracker = /(log-reporter.js)|(data.bilibili.com\/log)/.test(
      route.request().url()
    )
    if (isTracker) return route.abort()
    return route.continue()
  })
}

async function main(batchSize, userId) {
  const spaceData = await getApi(
    `https://api.bilibili.com/x/space/arc/search?mid=${userId}&pn=1&ps=${batchSize}`
  )
  var vlist = spaceData.data.list.vlist
  vlist = vlist.filter(
    (it) => it.subtitle === "" && it.description.includes("youtu")
  )
  if (vlist.length === 0) {
    console.log("No youtube video detected.")
  }
  console.log(`Scanning ${vlist.length} video`);

  for await (let video of vlist) {
    const youtubeUrl = video.description.split("\n")[0]
    await downloadSubtitle(youtubeUrl, video.bvid)
  }
  //Rename vtt to srt
  fs.readdirSync(downloadPath).forEach(it => {
    if(it.indexOf(".vtt") === -1) return
    fs.renameSync(`${downloadPath}${it}`, `${downloadPath}${it.replace("vtt","srt")}`)
  })

  const browser = await browserCore.launch({
    headless: !showBrowser,
  })
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Safari/537.36 Edg/88.0.705.74",
  })

  context.addCookies(parseCookieObject(bilibiliCookies))

  const page = await context.newPage()
  await blockImageAndTracker(page)

  
  //上传字幕阶段
  for await (let video of vlist) {
    const subtitleMatchedFile = fs.readdirSync(downloadPath).filter(it => it.indexOf(video.bvid) !== -1)
    if (subtitleMatchedFile.length === 0) {
      console.log(`[${video.bvid}] No subtitle for ${video.title}`);
      continue
    }
    await page.goto(`https://www.bilibili.com/video/${video.bvid}`)
    const [bvid, cid] = await page.evaluate(() => [window.bvid, window.cid])
    for (const lang in langSelectorMap){
      const {name: langName,langCode, langSelector} = langSelectorMap[lang]
      const subtitlePath = `${downloadPath}${video.bvid}.${langCode}.srt`
      if (!fs.existsSync(subtitlePath)) {
        console.log(`[${bvid}] ${langName}subtitle file not found（${subtitlePath}）>>> SKIP`)
        continue
      }
      
      await page.goto(
        `https://account.bilibili.com/subtitle/edit/#/editor?bvid=${bvid}&cid=${cid}`,
        {
          waitUntil: "load",
        }
      )
      await Promise.all([
        page.reload({
          timeout: 20_000,
          waitUntil: "networkidle",
        }),
        page.waitForResponse(/subtitle_lan.json/),
      ])

      const langElement = await page.$(langSelector)
      const langElementText = await langElement.textContent()
      if(langElementText.includes("已发布")){
        console.log(`[${bvid}] ${langName} subtitle already exist >>> SKIP`);
        continue
      }

      await langElement.click()
      const [fileChooser] = await Promise.all([
        page.waitForEvent("filechooser"),
        page.click('text="上传字幕"'),
      ])
      await fileChooser.setFiles(subtitlePath)
      await page.waitForTimeout(3_000)
      await page.click('text="提交"')
      await page.waitForTimeout(5_000)
      console.log(`[${bvid}] ${langName} subtitle submitted`)
    }
  }

  await page.close()
  await context.close()
  await browser.close()
}
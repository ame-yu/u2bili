import {
  bilibiliCookies,
  showBrowser,
  saveBV2Meta,
  downloadPath,
} from "./config.js"
import { firefox as browserCore  } from "playwright"
import { existsSync, readFileSync, writeFileSync } from "fs"
import { parseCookieObject } from "./utils.js"
/**
 * 使用例 node upload.sh MetaFile [VideoFile]
 * MetaFile 是必须的
 * 如果视频文件命名和Meta文件一致则可不写
 */
if (bilibiliCookies["FROM_ENV"]) console.log("从环境变量读取Cookie")
var [metaPath, videoPath] = getMetaPathFromArgs()
const meta = JSON.parse(readFileSync(metaPath))

function getMetaPathFromArgs() {
  if (process.argv.length < 4) {
    console.error("缺少参数，请传入视频源信息文件")
    process.exit(-1)
  }

  return process.argv.slice(2, 4)
}

const homePage = "https://member.bilibili.com/video/upload.html"
async function main() {
  const browser = await browserCore.launch({
    headless: !showBrowser,
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
  context.addCookies(parseCookieObject(bilibiliCookies))
  const page = await context.newPage()
  try {
    await Promise.all([
      page.goto(homePage, { waitUntil: "networkidle", timeout: 20 * 1000 }),
      page.waitForResponse(/\/OK/), //Fix：库未加载完的无效点击
    ])
  } catch (error) {
    if (error.name === "TimeoutError") {
      console.log("网络问题导致页面加载超时...")
    }
  }

  const [fileChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.click("#bili-upload-btn"),
  ])

  if (!videoPath) {
    const ext = ["webm", "mp4", "mkv"].find((ext) =>
      existsSync(`${downloadPath}${meta["id"]}.${ext}`)
    )
    if (!ext) {
      console.error(
        `无法在${downloadPath}找到${meta["id"]}命名的视频文件，上传未成功。`
      )
      process.exit(-1)
    }
    videoPath = `${downloadPath}${meta["id"]}.${ext}`
  }
  await fileChooser.setFiles(videoPath)

  await page.click('text="转载"')
  await page.fill("input[placeholder^=转载视频请注明来源]", meta["webpage_url"])
  await page.fill("input[placeholder*=标题]", meta["title"])

  // 选择分区
  await page.click("div.select-box-v2-container")
  await page.click('text="知识"')
  await page.click("div.drop-cascader-list-wrp > div:nth-child(8)") // 修复问题:找不到二级选项导致堵塞，数字对应二级列表位置
  //await page.click('text="野生技术协会"')

  // 创建标签
  await page.click("input[placeholder*=创建标签]")
  await page.keyboard.type(meta["uploader"])
  await page.keyboard.down("Enter")

  // 视频描述
  await page.click("div.ql-editor[data-placeholder^=填写更全]")
  await page.keyboard.type(
    `u2bili自动上传\n${meta["description"]}`.slice(0, 250)
  )

  //更多选项
  await page.click('text="更多选项"')
  await page.click('text="允许观众投稿字幕"')

  await page.click('text="立即投稿"')
  let result = await page.textContent("h3.upload-3-v2-success-hint-1")
  console.log(result)
  let videoUrl = await page.getAttribute(
    "div.content-tag-v2-edit-mod-wrp > p > a",
    "href",
    { timeout: 300_000 }
  )
  await page.waitForLoadState("networkidle")
  console.log(videoUrl)
  if (saveBV2Meta) {
    meta["biliUrl"] = videoUrl
    writeFileSync(metaPath, JSON.stringify(meta, undefined, 4))
  }

  await page.close()
  await context.close()
  await browser.close()
}

main()

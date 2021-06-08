import { bilibiliCookies, metaPath, isTerminal } from "./config.js"
import { chromium } from "playwright"
import { existsSync, readFileSync } from "fs"

checkMetaExist()
const meta = JSON.parse(readFileSync(metaPath))

const homePage = "https://member.bilibili.com/video/upload.html"
const cookie = Object.keys(bilibiliCookies).map((k) => {
  return {
    domain: ".bilibili.com",
    path: "/",
    name: k,
    value: bilibiliCookies[k],
  }
})

function checkMetaExist() {
  if (!existsSync(metaPath)) {
    console.log("无法找到原信息")
    process.exit(-1)
  }
}

async function main() {
  const browser = await chromium.launch({
    headless: isTerminal,
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
  try {
    await page.goto(homePage, { timeout: 20 * 1000 })
  } catch (error) {
    if (error.name === "TimeoutError") {
      console.log("网络问题导致页面加载超时...")
    }
  }

  const [fileChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.click("#bili-upload-btn"),
  ])
  await fileChooser.setFiles(`./downloads/${meta["id"]}.mp4`)

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
  await page.keyboard.type(meta["description"].replaceAll("\n\n","\n").slice(0, 250))

  //更多选项
  await page.click('text="更多选项"')
  await page.click('text="允许观众投稿字幕"')

  await page.click('text="立即投稿"')
  let result = await page.textContent("h3.upload-3-v2-success-hint-1")
  console.log(result)
  let videoUrl = await page.getAttribute(
    "div.content-tag-v2-edit-mod-wrp > p > a",
    "href"
  )
  console.log(videoUrl)
  await page.close()
  await context.close()
  await browser.close()
}

main()

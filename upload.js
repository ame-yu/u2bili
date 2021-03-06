import {
  bilibiliCookies,
  showBrowser,
  downloadPath,
} from "./config.js"
import { firefox as browserCore } from "playwright"
import { existsSync, readFileSync } from "fs"
/**
 * 使用例 node upload.sh MetaFile [VideoFile]
 * MetaFile 是必须的
 * 如果视频文件命名和Meta文件一致则可不写
 */
const uploadPageUrl = "https://member.bilibili.com/video/upload.html"

if (process.argv.length < 3) {
  console.error("至少传入视频信息JSON路径 node upload.js json_file [video_file]")
  process.exit(-1)
}

var [metaPath, videoPath] = process.argv.slice(2, 4)
const meta = JSON.parse(readFileSync(metaPath))

function getCookies(){
  const envCookies = process.env["BILIBILI_COOKIE"]
  if(envCookies){
    console.log("从环境变量读取Cookie");
    return envCookies.split(";").map(i => {
      const [key, value] = i.split("=")
      return {
        domain: ".bilibili.com",
        path: "/",
        name: key,
        value: value,
      }
    })
  }else{
    console.log("从配置文件读取Cookie");
    return Object.keys(bilibiliCookies).map((k) => {
      return {
        domain: ".bilibili.com",
        path: "/",
        name: k,
        value: bilibiliCookies[k],
      }
    })
  }
}

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
  context.addCookies(getCookies())
  const page = await context.newPage()
  try {
    await Promise.all([
      page.goto(uploadPageUrl, { waitUntil: "networkidle", timeout: 20 * 1000 }),
      page.waitForResponse(/\/OK/), //Fix：库未加载完的无效点击
    ])
  } catch (error) {
    if (error.name === "TimeoutError") {
      console.log("超时! 当前页面:" + page.url())
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
  console.log(`开始上传${videoPath}`);

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

  await page.waitForSelector('text="上传完成"',{
    timeout: 5 * 60_000 //等待上传5分钟
  }).catch(() => {
    console.log("上传时间过长")
  })

  await page.click('text="立即投稿"')
  let result = await page.textContent("h3.upload-3-v2-success-hint-1",{
    timeout: 60_000
  })
  console.log(result)

  await page.waitForTimeout(3_000)
  await page.close()
  await context.close()
  await browser.close()
}

main()

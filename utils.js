export function parseCookieObject(bilibiliCookies) {
  return Object.keys(bilibiliCookies).map((k) => {
    return {
      domain: ".bilibili.com",
      path: "/",
      name: k,
      value: bilibiliCookies[k],
    }
  })
}

export function download(url, output) {
  return new Promise((resolve, reject) => {
      https.get(url, res => {
          res.pipe(fs.createWriteStream(output))
          res.on('end', resolve)
          res.on('error', reject)
      })
  })
}
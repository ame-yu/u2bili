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
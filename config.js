/**
 * # 1. Get Cookie
 * F12->console
 * > document.cookie
 *
 * !IMPORTANT: 2. Concatenate HTTPOnly cookie `SESSDATA` manually.
 * BILIBILI_COOKIE should be like this:
 * DedeUserID=XXX; DedeUserID__ckMd5=XXX; bili_jct=XXX; SESSDATA=XXX
 */

export const metaPath = "./meta.json"
const cookie = process.env["BILIBILI_COOKIE"]
export const bilibiliCookies = cookie
  ?.split("; ")
  ?.map((i) => i.split("="))
  ?.reduce((a, b) => {
    a[b[0]] = b[1]
    return a
  }, {}) ?? {
  bili_jct: "FROM_YOUR_COOKIE",
  DedeUserID: "FROM_YOUR_COOKIE",
  DedeUserID__ckMd5: "FROM_YOUR_COOKIE",
  SESSDATA: "HTTP_ONLY_COOKIE",
}

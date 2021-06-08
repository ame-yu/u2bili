// @ts-check

/**
 * @type {string}
 */
export const metaPath = "./meta.json"

/**
 *  default show browser for windows only
 *  @type {boolean} */
export const isTerminal = process.platform !== "win32"

/** @type {string | null} */
export const storeData = "./data.json"


/**
 * ### 1. Get Cookie
 * Concatenate HTTPOnly cookie `SESSDATA` manually.
 * @type {object}
 */
export const bilibiliCookies = process.env["BILIBILI_COOKIE"]
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

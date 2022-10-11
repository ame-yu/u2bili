## 2.1.0 20221011
1. 上传视频自动添加中英字幕（如果有）
2. act环境更新 ubuntu:act-20.04 -> ubuntu:act-22.04

## 2.0.0 20220914
1. 适配新的上传页面

## 1.2.0 20220512
1. youtube-dl 换成 yt-dlp

## 1.1.0 20211023
1. 填坑，定期扫描视频自动上传字幕脚本
2. 补充上传字幕脚本使用文档

## 1.0.0 20210806 
1. 固定act运行的镜像，原catthehacker/ubuntu:act-20.04镜像node被升成了v14.17.4，和playwright存在兼容问题。导致元素找不到。现使用catthehacker/ubuntu:act-20.04-20210721
2. 不再使用原ActionsFlow的方法检查同时运行中的工作流，详情Issue：https://github.com/actionsflow/actionsflow/issues/28

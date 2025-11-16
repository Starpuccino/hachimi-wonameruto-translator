# 哈基米南北绿豆翻译器 · 技术笔记

## 1. 架构概览

- **UI 层**：单页 Svelte 组件（`src/App.svelte`），负责角色切换、输入联动、历史列表与震动反馈。
- **翻译核心**：`src/lib/hachimiTranslator.ts` 暴露 `translate(text, role)` 与 `oppositeRole(role)`，全部逻辑均在前端执行。
- **PWA 能力**：`vite-plugin-pwa` 生成的 Service Worker 负责缓存入口 HTML、bundles 与静态资源，并允许安装到桌面。

## 2. 哈基米语词典

- 编码器使用 18 个“底词”与四类“装饰词”（拟声、符号、emoji、颜文字）组合出 1024 种唯一外观；每一种组合都映射到 10 bit 数字。
- 所有词表在运行时会去重，保证同一个文本片段不会指向多个索引，也让词库可自由增删扩展。
- 装饰词的实际出现位置由 `TranslatorWeights` 派生的模板控制：比重越高，越多 token 会带上对应类别；比重为 0 或负数则代表禁用该类别。
- 解码器按“底词→装饰”顺序穷举匹配路径，再依靠模板反推唯一的数值，确保无论字符是否被黏连都能正确还原。

## 3. 编码流程（人 → 哈基米）

1. `packPayload`：将输入用 `TextEncoder` 转成 UTF-8，并追加 FNV-1a 32 位校验码，形成 payload。
2. `fflate.gzipSync`（`mtime: 0`）压缩 payload，随后 `chunkify` 将压缩字节切成连续的 10 bit 数字（0~1023），记录尾部有效 bit 数 `tailBits`。
3. 生成 0~63 的随机 salt，并把 `tailBits + salt * HEADER_SCALE` 打包成首个“头部 token”。其余 chunk 会先加上 salt（取模 1024）再编码，盐值兼顾信息扰动与自校验。
4. 每个 10 bit 数字经 `valueToToken` 映射到“底词 + 装饰”组合：底词来自 18 个核心哈基米词，装饰由加权模板决定（拟声/符号/emoji/颜文字），保证 1024 个值都有唯一外观。
5. 随机挑选 `哈基米` / `南北绿豆` / `曼波` 作为引导词放在最前，其余 token 直接拼接（不插空格）。最终输出看似长串的哈基米语，但可被解析器无损拆解。

## 4. 解码流程（哈基米 → 人）

1. 删除所有空白后交给 `parseTokens`：该解析器会在每个位置尝试匹配核心底词，并按“拟声→emoji→符号→颜文字”的顺序回溯判断有哪些装饰实际出现，保证与编码阶段 1:1 对应。
2. 校验首个 token 必须是合法引导词；随后读取头部 token 得到 salt 与 `tailBits`，剩余 token 逐个用 `tokenPartsToValue` 还原 10 bit 值，再减去 salt（模 1024）获得原始 chunk 序列。
3. `unchunkify` 根据 `tailBits` 拼回压缩字节，`gunzipSync` 解压后交给 `unpackPayload`，拆分正文与末尾校验码并重新计算 FNV-1a。
4. 若校验成功，还会执行一次 `selfCheck`：把解出的正文重新走一遍编码管线，确认生成的 chunk 与 salt 信息与输入匹配，保证传输过程中没有被篡改。
5. 任一步失败（解析、gunzip、校验或自检）都会直接返回固定告警语 `喵！你在狗叫什么！！！😾😾😾`，提醒用户重新输入。

## 5. 随机性与校验

- 随机数来源优先 `crypto.getRandomValues`（存储在 `cryptoSource`），若环境不支持则回退至 `Math.random`。
- 校验采用 FNV-1a，可快速侦测误改/误粘贴；配合 gzip 的 CRC 冗余，保证哈基米语可逆。
- 若无法识别任何核心哈基米词、Base64 还原失败或校验不一致，将返回 `喵！你在狗叫什么！！！😾😾😾`。

## 6. PWA 与离线

- `vite-plugin-pwa` 配置 `registerType: autoUpdate`，全局模式缓存 `**/*.{js,css,html,ico,png,svg,webmanifest}`；同时配置 `runtimeCaching` 为文档采用 NetworkFirst，脚本/样式采用 StaleWhileRevalidate。
- `src/main.ts` 使用 `virtual:pwa-register` 注册 Service Worker（`immediate: true`）。
- manifest 定义在 `vite.config.ts` VitePWA 插件中，使用 `public/favicon.png` 作为应用图标。
- 使用 `vite-plugin-singlefile` 将所有资源内联为单一 HTML 文件。

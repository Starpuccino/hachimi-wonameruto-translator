<div align="center">
	<a href="https://starpuccino.github.io/hachimi-wonameruto-translator/" target="_blank">
		<img src="public/qr.png" alt="哈基米南北绿豆翻译器" width="200" height="200" />
	</a>
	<h1>哈基米南北绿豆翻译器</h1>
	<p>把人类的话编码进哈基米语，再把哈基米语解码出来。可爱、即时、可离线 ❤️</p>
</div>

## ✨ 功能亮点

- **双角色输入**：随时切换“人类 / 哈基米”身份，一边写一边看翻译。
- **即时对话面板**：支持记录每一回合的原文与译文，区分双方身份。
- **响应式 UI**：手机 / 平板 / 桌面均有舒适体验。
- **隐私保护**：所有数据均在本地处理，不上传任何服务器。
- **PWA & 离线**：超快开屏，支持“添加到主屏幕”，离线也能翻译。

## 🚀 快速开始

```shell
npm install
npm run dev
```

- 访问终端输出的地址（默认 `http://localhost:5173`）。
- 生产构建：

```shell
npm run build
npm run preview
```

## 🐾 使用小贴士

- 输入框支持 `Ctrl / ⌘ + Enter` 快速发送，发送后历史区会生成一对“原文 + 译文”气泡。
- 角色切换按钮可以随时改变“说话的人”，上方即时卡片会预览另一方听到的内容。
- 点击 `发送` 按钮即可记录当前对话，点击 `清除` 按钮即可清空对话记录。

## 🧠 翻译算法

- 人类语：UTF-8 + FNV 校验 → Gzip → 10bit 分块 → 哈基米底词与装饰组合，并记录输入/输出长度。
- 哈基米语：去空白 → 递归匹配底词 + 装饰 → 还原分块 → 解压 + 校验 + 自检，失败则返回 `喵！你在狗叫什么！！！😾😾😾`。
- 详细设计请见 [`TECH.md`](./TECH.md)。

## 🧩 技术栈

- 前端框架：Svelte + TypeScript + Vite。
- 压缩与编码：`fflate`（gzip）、自定义哈基米词典 + 装饰符。
- PWA 支持：`vite-plugin-pwa` 自动生成 Service Worker 与缓存策略。

## 🐱 License

MIT License，仅供学习与玩耍~ have fun!

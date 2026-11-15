# Agent Development Kit Web UI (ADK WEB)

[English](README.md) | [简体中文](https://github.com/google/adk-web/blob/main/README.zh.md)

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![r/agentdevelopmentkit](https://img.shields.io/badge/Reddit-r%2Fagentdevelopmentkit-FF4500?style=flat&logo=reddit&logoColor=white)](https://www.reddit.com/r/agentdevelopmentkit/)

<div align="center">
  <h2>
    <img src="https://raw.githubusercontent.com/google/adk-python/main/assets/agent-development-kit.png" width="256" alt="ADK Logo"/>
  </h2>
  <h3>
    Agent Development Kit Web 是集成在 Google Agent Development Kit 中的内置开发者 Web 界面，旨在让 AI 智能体的开发与调试更加高效直观。
  </h3>
  <h3>
    重要链接：
    <a href="https://google.github.io/adk-docs/">官方文档</a> &
    <a href="https://github.com/google/adk-samples">示例库 (Samples)</a>
  </h3>
</div>

> [!NOTE]
> 本文档为开源社区维护的简体中文翻译。由于上游代码库持续高速迭代，若文档存在更新差异，请以英文原版 [README.md](README.md) 及 [官方文档](https://google.github.io/adk-docs/) 为最终权威事实来源（Source of Truth）。

Agent Development Kit（ADK）是一个用于开发与部署 AI 智能体（AI Agents）的灵活模块化框架。ADK 在针对 Gemini 模型和 Google 生态进行深度优化的同时，保持了模型无关（Model-agnostic）与部署无关（Deployment-agnostic）的架构设计，并具备与其他框架的良好兼容性。ADK 致力于让智能体开发更加贴近现代软件工程的标准实践，助力开发者轻松构建、部署并编排涵盖简单任务到复杂工作流的全场景智能体架构。

ADK Web 则是随 ADK 一同提供的内置开发者 UI 界面，专门用于简化智能体的可视化交互、状态追踪与运行时调试。

## ✨ 环境要求 (Prerequisites)

- **安装 [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)**
- **安装 [Node.js](https://nodejs.org/en)**
- **安装 [Angular CLI](https://angular.dev/tools/cli)**
- **安装 [google-adk (Python)](https://github.com/google/adk-python)**
- **安装 [google-adk (Java)](https://github.com/google/adk-java/)**
- **克隆 [adk-web 代码库](https://github.com/google/adk-web/)**

## 🚀 启动并运行 adk web

请在本地 `adk-web` 根目录下执行以下步骤：

### 1. 安装前端依赖

```bash
npm install
```

### 2. 启动 adk web 前端开发服务器

```bash
npm run serve
```

### 3. 启动 adk api 后端服务器

在另一个独立的终端窗口中运行：

```bash
adk web
```

开发服务器会自动将前端 API 请求代理转发至后端服务，因此从浏览器的角度来看全部属于同源请求。无需再显式配置 `--allow_origins` 或 `--host=0.0.0.0`。

#### 自定义前后端端口配置

前后端进程各自独立选定监听端口。可通过 `ADK_BACKEND` 告知前端开发服务器后端接口地址，并通过 `--port` 指定前端 `ng serve` 的服务端口：

```bash
adk web --port 9000                                              # 启动后端（端口 9000）
ADK_BACKEND=http://127.0.0.1:9000 npm run serve -- --port 5555   # 启动前端（端口 5555，代理指向 9000）
```

后端无需感知前端的具体端口。`ADK_BACKEND` 支持任意有效的 URL 地址，包括远程工作站（例如 `ADK_BACKEND=http://my-workstation:8000`）；如需从外部机器访问后端，仍需在后端添加 `--host 0.0.0.0`。修改 `ADK_BACKEND` 后需重新启动 `npm run serve`，因为代理配置仅在服务初始化启动时读取一次。

在此双进程开发模式下，请勿传递 `--url_prefix` 参数——否则前缀会导致与开发服务器的代理路由规则不匹配。反向代理前缀支持已由后端自身的测试套件进行覆盖验证。

若遇到 `adk command not found` 提示，请确保已正确安装 `google-adk`（若使用了 Python 虚拟环境，请确认已激活该虚拟环境）。

### 4. 开始开发调试

在浏览器中打开 `localhost:4200` 即可开始智能体开发与调试！

## 界面预览 (Screenshots)

### 事件总线 (Events)

<img width="2548" height="1378" alt="adk-web-events" src="https://github.com/user-attachments/assets/dc2002e4-6d2d-4b84-9d7d-3c482e8d9391" />

### 调用追踪 (Tracing)

<img width="2510" height="1377" alt="adk-web-tracing" src="https://github.com/user-attachments/assets/23a93480-334c-483a-828a-05b0f6117022" />

### 工件管理 (Artifacts)

<img width="2530" height="1397" alt="adk-web-artifact" src="https://github.com/user-attachments/assets/aacb0866-dbb2-47e4-842c-13f27146c912" />

### 评估评测 (Evaluations)

<img width="2536" height="777" alt="adk-web-eval-2" src="https://github.com/user-attachments/assets/fb5f97e7-8bcc-4512-8b8e-a1123ee78c8e" />

### 智能体构建器与助手 (Agent builder & assistant)

![1_h3_I7RjXGLKH5-Td0U2rgw](https://github.com/user-attachments/assets/f73409c4-9b75-474a-9b86-c4525d376b02)

### 更多强大特性持续更新中！

## 🤝 参与贡献 (Contributing)

热烈欢迎开源社区的各方贡献！无论是提交问题报告、功能建议、文档改进还是代码 PR，均可参阅官方贡献指南：

- [通用贡献指南与流程 (General contribution guideline and flow)](https://google.github.io/adk-docs/contributing-guide/#questions)

### 测试注意事项 (Testing quirks)

本代码库中的测试同时会在 Google 内部测试环境中执行，因此编写测试代码时须遵守以下规则：

- 在调用 `TestBed.configureTestingModule()` 之前，必须先调用来自 `./src/app/testing/utils.ts` 的 `initTestBed()` 方法。

## 📄 许可证 (License)

本项目基于 Apache 2.0 许可证开源 —— 详见 [LICENSE](LICENSE) 文件。

## 预览版声明 (Preview)

本特性受 [服务专用条款](https://cloud.google.com/terms/service-terms#1) 通用服务条款部分中“Pre-GA 产品条款”的约束。Pre-GA 阶段的功能按“原样”提供，可能仅享有有限的技术支持。更多信息请参见 [产品发布阶段说明](https://cloud.google.com/products?hl=zh-cn#product-launch-stages)。

---

*祝智能体构建之旅愉快！(Happy Agent Building!)*

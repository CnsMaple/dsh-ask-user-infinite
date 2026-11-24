# dsh-ask-user-infinite

让 DSH 的 `ask_user_question` 在所有预设中**默认无限等待**：提问卡片不倒计时、不自动超时，直到你提交回答。

## 原理

这是一个 profile 级 Host-only bundle。它在 `tools/execute` 事件里拦截 `ask_user_question`，直接调用 `ctx.userQuestions.ask({ ..., wait: { callId } })`，不设置 timed deadline。

- 不修改任何内置或自定义 preset。
- 不使用 `agent.ctx.tools.register` 注册同名工具，因此不会和 `dsh-question-timeout-protection` 的同名工具注册冲突。
- 即使模型传了正的 `timeout`，也会被本插件忽略，实际等待仍是无限。
- 提问卡片按 `callId` 关联，仍可从工具调用行重新打开。

## 安装

用 DSH 的插件管理器安装这个本地目录；桌面版也可以在 **Plugins** → **Add plugin** 里选择本目录。

```powershell
dsh plugin --profile desktop add D:\czy_temp\dsh-ask-user-infinite
```

安装后重新 compositions；如果 DSH 提示需要重载 profile，按界面提示操作。

## 同时生效的 PTC 预算补丁

本 bundle 的 `cordis.patch.yml` 还覆盖了 `@deepseek-ai/dsh-ptc-runtime-node` 的：

```yaml
timeoutMs: 604800000      # 7 天
maxTimeoutMs: 604800000   # 7 天
```

这样 `run_code` 的外层程序预算不会在默认 120 秒 / 600 秒时掐断仍在等待用户回答的提问。7 天低于 Node 定时器上限 `2147483647ms`。

> 注意：这是 profile 级的全局 PTC 预算调整，会影响该 profile 下所有 `run_code` 程序，而不只影响提问工具。

## 与 dsh-question-timeout-protection 共存

两者可以共存：本插件在执行层接管 `ask_user_question`，原插件的工具函数不会被调用，因此它的服务端倒计时登记不会发生。若界面仍出现旧倒计时，请禁用 `dsh-question-timeout-protection`。

## 限制

- 在 `run_code` / PTC 内部提问时，外层程序预算已由本 bundle 放宽到 7 天；超过 7 天仍会被宿主预算结束，这是平台定时器上限内的安全设置。
- 子代理（live child agent）仍不能向用户提问，需把未决问题放进最终结果。
- 会话结束或页面关闭后，未回答的问题不保证仍可继续回答。

## License

MIT

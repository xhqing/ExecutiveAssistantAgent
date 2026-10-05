---
name: termux-ssh
description: 通过 SSH 操作 Android 手机（Termux）的流程与踩坑清单——连手机、连不上怎么查、在手机上找/传/校验文件、路径里有中文或空格怎么办、Android 存储与沙箱限制、手机 IP 变了怎么重新发现。MUST USE 当用户提到「手机上」「把手机里的文件弄过来」「看看手机上的 X」「手机连不上」「ssh 到手机」「Termux」「装到手机上」，或需要从手机取文件（尤其 KeePass 库、keyfile 这类敏感文件）、核验手机文件完整性、给手机做只读检查时——即使用户没有明确说「SSH」也要触发。也适用于：手机上的文件「找不到」（可能在 App 私有目录或保密柜里）、adb 不可用时改用 SSH 通道、需要判断某文件到底在手机哪个目录。NOT for：iPhone / iOS 设备（走其它通道）、需要 root 的操作、手机端 GUI 自动化（截图/点击）。
---

# 通过 SSH 操作 Android 手机（Termux）

手机是本机之外的第二台生产设备（KeePass 库、同步目录都在上面），但它的**系统限制比 macOS 多得多**，很多在 Mac 上顺手的事在手机上会以奇怪的方式失败。这个 skill 把「怎么连、连不上怎么查、能做什么、哪些路走不通」写成固定流程，避免每次重新试错。

## 第一次用：先看是不是已经搭好了

```bash
ssh -o BatchMode=yes -o ConnectTimeout=8 android 'echo OK && whoami'
```

- 回 `OK` + 用户名 → 通道可用，直接跳到「日常操作」
- 报错 → 看下面的「连不上：三种失败形态」；若是从来没搭过 → 读 `references/setup.md` 做一次性搭建（Termux 侧装 sshd + Mac 侧 ssh 别名）

**别名约定**：一律用 `~/.ssh/config` 里的 `android` 别名访问（HostName / User / 密钥都在配置里，正文不记具体值，避免私人信息进仓库）。

## 连不上：三种失败形态对应三种病因

先跑上面的健康检查，然后按报错对号入座——**手机端的问题基本只有这三类**：

| 报错 | 病因 | 处理 |
|---|---|---|
| `Connection refused` | `sshd` 没在跑（Termux 进程被系统杀掉） | 让用户在手机上重新打开 Termux、执行 `sshd`（一句命令） |
| `Connection timed out during banner exchange` | Termux 被**系统冻结**（屏幕灭了 / 省电策略） | 让用户点亮屏幕（通常即恢复）；根治要给 Termux 加电池白名单，见下 |
| `No route to host` / 连接超时 | 手机不在同一网段（IP 变了或换了 Wi-Fi） | 重新发现 IP（见下），更新 `~/.ssh/config` |

**电池白名单（根治冻结）**：手机上「设置 → 应用 → 应用启动管理 → 找到 Termux → 关掉自动管理 → 允许自启动 / 关联启动 / 后台活动」三项全开；再打开「电池 → 更多电池设置 → 休眠时始终保持网络连接」。此外在 Termux 里跑 `termux-wake-lock` 可临时续命。没有白名单时，息屏几分钟就断，这是最常见的一次性困扰来源。

**重新发现手机 IP**（IP 是 DHCP 分配的，会变）：

```bash
# macOS 没有 timeout 命令，别写 timeout；用 nc 自带超时
seq 1 254 | xargs -P 64 -I{} sh -c 'nc -z -G 1 -w 1 <局域网网段>.{} 8022 2>/dev/null && echo "<局域网网段>.{}:8022 OPEN"'
arp -a | grep -v incomplete   # 看局域网设备的 MAC，辅助判断
```

拿到新 IP 后改 `~/.ssh/config` 里 `android` 的 `HostName` 即可（改完再跑一次健康检查）。手机与 Mac 必须在同一局域网；手机连着 5G 流量时连不上，此时直接告诉用户开 Wi-Fi。

## 日常操作

所有操作都用一条非交互命令完成：`ssh android '<命令>'`。

**找文件**（手机上的文件常常不在你以为的位置）：

```bash
ssh android 'find ~/storage/shared -maxdepth 5 -iname "*.kdbx" 2>/dev/null'
ssh android 'find /storage/emulated/0 -maxdepth 4 -type d -iname "*keepass*" 2>/dev/null'
```

- `~/storage/shared` 就是 `/storage/emulated/0`（Termux 的存储符号链接）
- 路径里有**中文或前导空格**时（实测遇到过一个目录真实名字是 `" 我的文件"`），按名字直接 `ls` 会报 `No such file` —— **不要凭印象拼中文路径，先用 `find` / 通配符定位出真实路径，再拿它去操作**
- 全盘 `find`（不带 `-maxdepth`）在手机上可能跑几十秒到几分钟，先给个 `-maxdepth 4~6` 试

**取文件到 Mac**（比 `scp` 省去远端路径转义麻烦，且非交互 ssh 不分配 PTY、二进制安全）：

```bash
ssh android 'cat "/storage/emulated/0/Sync/KeePass/vault.kdbx"' > ~/Sync/KeePass/vault.kdbx
```

**完整性校验**（两端算法都要对）：

```bash
ssh android 'sha256sum <远端文件>'          # 手机侧
shasum -a 256 <本地文件>                     # Mac 侧
```

**放文件回手机**：`cat 本地文件 | ssh android 'cat > "<远端路径>"'`，放完同样做 sha256 校验。

**敏感文件（密码库 / keyfile）额外注意**：拉取前先跟用户说清「从哪取、放到哪、是否进同步目录」。keyfile 一律放**同步目录之外**（如 Mac 的 `~/Key/`），与手机端保持一致——钥匙和保险箱不能放同一个抽屉。

## 走不通的路（别浪费时间试）

| 目标 | 现实 |
|---|---|
| 读 `Android/data/` 或 `Android/obb/` | **不可读**（Android 11+ 沙箱限制，Termux 也进不去）。文件若在某个 App 私有目录里，SSH 拿不到 —— 只能让用户在那个 App 里「导出 / 另存为」到共享存储 |
| 用 `pm list packages` 判断「手机装没装某 App」 | 不可靠：从 Termux 跑会被**包可见性**过滤（几十个 App 里只列出两三个）。要么直接问用户，要么 `find` 找该 App 的痕迹 |
| 列 `/storage/` 或 `/storage/emulated/` | `Permission denied`（正常限制）；用 `~/storage/shared` 代替 |
| 用 `timeout` 命令 | macOS 与部分环境没有该命令，改用工具自带超时或 `gtimeout` |
| 从终端进 `/tmp` | Termux 里没有 Linux 意义上的 `/tmp`；用 `$TMPDIR` 或 `$HOME` 下的路径 |

**bash 中文/括号的坑**：`"$slug（中文说明）"` 会被 shell 当成变量名 `slug（中文说明` 去展开 —— 变量后面紧跟中文或括号时一律写成 `"${slug}（...）"`。

## 安全底线

- **手机是用户的私人物品**：未经用户明确同意，不删除、不移动、不覆盖手机上任何文件；只读探查（`ls` / `find` / `sha256sum` / `du`）不需要确认，写操作（删、移、覆盖、安装）必须先问
- **一次性通道**：用完可以让用户 `pkill sshd` 关掉（或留着，由用户决定）；不擅自长期占用
- **不进仓库**：手机 IP、Termux 用户名、密钥路径这类本机信息只写在 `~/.ssh/config`，不要在仓库文件里硬编码
- 操作完**汇报要基于实测**：路径、字节数、sha256 都要真跑一遍再写进结论

## 相关文件

- `references/setup.md` —— 一次性搭建：Termux 侧（存储权限、openssh、authorized_keys 的坑、sshd）、Mac 侧（ssh 别名、专用密钥）、以及完整排错手册

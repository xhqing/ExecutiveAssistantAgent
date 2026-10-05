# 一次性搭建：Mac ↔ Android（Termux）SSH 通道

只在**第一次**搭这条通道时需要。搭好后日常只需 `ssh android '…'`（见 SKILL.md 正文）。

## 一、手机侧（Termux 里逐段执行）

### 1. 给 Termux 共享存储权限

```bash
termux-setup-storage
```

会弹系统权限窗，并且脚本本身会问 `Do you want to continue? (y/n)` —— **默认是中止，必须输入 `y` 再回车**（实测按 n 或直接回车会 Aborting，之后 `mkdir /sdcard/...` 直接 `Permission denied`）。成功后 Termux 里多出 `~/storage/shared`，指向 `/storage/emulated/0`。若目录已存在它会问是否重建，选 y（不会删除实际内容）。

### 2. 装 ssh 服务端并启动

```bash
pkg update -y && pkg install -y openssh
ssh-keygen -A      # 生成 host key（缺了 sshd 会拒绝启动）
sshd               # 默认端口 8022
whoami             # 记下用户名（形如 u0_axxx，本机具体值不要写进任何仓库文件）
ifconfig 2>/dev/null | grep "inet " || ip -4 addr | grep inet   # 拿手机 IP
pgrep -l sshd      # 确认在跑
```

`ifconfig` 不在时先 `pkg install -y net-tools`；也可以直接从手机「设置 → WLAN → 当前网络」看 IP。Termux 里 `sshd` 是普通用户态进程，**息屏被杀后会消失**，需要重开 Termux 再跑一次。

### 3. 写入 Mac 的公钥（这一步最容易踩坑）

**不要用 heredoc**（`cat >> ~/.ssh/authorized_keys <<'EOF' … EOF`）：实测长公钥行在 Termux 里会被拆成两行，写进去是一份无效公钥，SSH 只报 `Permission denied (publickey)`，很难看出是这里错的。用单行 `printf`：

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
printf '%s\n' '<把 Mac 公钥整行粘在这里>' > ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
cat ~/.ssh/authorized_keys            # 核对：必须是一整行
wc -c < ~/.ssh/authorized_keys        # 核对字节数（本机这把 ed25519 是 96 字节）
```

字节数与 Mac 上 `wc -c < ~/.ssh/xxx.pub` 一致才算写对。若不一致，改用两段写：`printf '%s' '<前半>' > 文件` + `printf '%s\n' '<后半>' >> 文件`。

## 二、Mac 侧

### 1. 生成专用密钥（不复用通用密钥，便于单点撤销）

```bash
ssh-keygen -t ed25519 -N "" -C "android-termux" -f ~/.ssh/id_ed25519_android
cat ~/.ssh/id_ed25519_android.pub        # 这就是要贴进 Termux 的那一行
```

### 2. 加 ssh 别名

`~/.ssh/config` 追加（具体 IP / 用户名只写在这里，**不进任何仓库文件**）：

```
# Android 手机 · Termux（局域网直连，端口 8022）
Host android
    HostName <phone-ip>
    User <termux-user>
    Port 8022
    IdentityFile ~/.ssh/id_ed25519_android
    ServerAliveInterval 30
```

改完先跑健康检查：

```bash
ssh -o BatchMode=yes -o ConnectTimeout=8 android 'echo OK'
```

## 三、排错手册

| 现象 | 真正的原因 | 处理 |
|---|---|---|
| `Permission denied (publickey,password…)`，且 Mac 侧 `ssh -v` 显示密钥已正确送出 | `authorized_keys` 内容被拆行 / 字节数不对 | 回到手机按上面第 3 步用单行 `printf` 重写 + `wc -c` 核对 |
| 同上但 Mac 侧 `ssh -v` 显示**没**送出密钥 | ssh 别名里 `IdentityFile` 写错 / 密钥权限过宽 | 检查 `~/.ssh/config` 与 `chmod 600` 私钥 |
| `Connection refused` | sshd 没在跑 | 手机 Termux 里 `sshd`（可 `pgrep -l sshd` 确认） |
| `Connection timed out during banner exchange` | Termux 被系统冻结/省电限制 | 点亮屏幕；根治见 SKILL.md「电池白名单」 |
| 时好时坏 | 手机 IP 变了（DHCP）或 Termux 偶尔被冻结 | 重新发现 IP 更新配置；补白名单 |
| `mkdir: Permission denied`（写 `/sdcard` 时） | `termux-setup-storage` 没成功执行 | 重跑并**输入 y** |

## 四、手机端的目录常识

| 路径 | 说明 |
|---|---|
| `~/storage/shared` = `/storage/emulated/0` | 共享存储根（Termux 里推荐用前者，短且稳） |
| `~/storage/{dcim,documents,downloads,pictures,movies,music}` | 对应系统各标准目录的符号链接 |
| `~/storage/shared/Android/data/<pkg>/` | **Termux 不可读**（Android 11+ 沙箱），文件若在这里只能让用户从 App 里导出 |
| Termux 自己的家目录 `~/` | `/data/data/com.termux/files/home`，App 私有区，手机文件管理器看不到它 |

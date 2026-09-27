# 店铺管理系统 · dPanel Docker 部署说明

> 本说明针对 **dPanel（Docker 可视化管理面板）** 部署。项目已包含 `Dockerfile`、`.dockerignore`、`docker-compose.yml`，采用多阶段构建（编译 → 运行），镜像内自动完成 `npm ci` + 前后端生产构建。

## 一、部署架构

| 项 | 内容 |
|---|---|
| 基础镜像 | `node:22-slim`（Debian glibc，兼容全部原生绑定包） |
| 构建流程 | 阶段1：`npm ci --ignore-scripts` → `npm run build:prod` → `npm prune --omit=dev`；阶段2：仅携带 `dist/` + 生产依赖 |
| 运行方式 | `node dist/server/main.js`，监听 `0.0.0.0:3000`，后端统一托管前端页面 |
| 凭证注入 | 平台凭证（`FORCE_AUTHN_INNERAPI_DOMAIN` 等）通过 compose 环境变量注入，**不打入镜像** |
| 日志 | 容器内 `/app/logs`，映射宿主机 `./logs` 目录 |

## 二、前置条件

1. 服务器已安装 Docker Engine + Docker Compose（dPanel 安装器可一键安装）；
2. 已部署 dPanel 面板（面板容器将 `/dpanel` 挂载到宿主机，默认数据目录如 `/home/dpanel`）；
3. 具备平台凭证（飞书/豆包 aPaaS）：`FORCE_AUTHN_INNERAPI_DOMAIN`（必需）及 `ACCESS_KEY` / `ACCESS_SECRET` / `TOKEN` / `MIAODA_AUTHN_CODE`（按平台下发情况填写）。

## 三、部署步骤

### 方式 A（推荐）：放入 dPanel compose 目录，面板自动发现

dPanel 会自动发现 `/dpanel/compose` 下的项目子目录并生成 Compose 任务，目录名即【站点标识】。

1. **将项目代码放入面板 compose 目录**（`<宿主机dpanel挂载路径>/compose/shop-system/`，如 `/home/dpanel/compose/shop-system/`）：
   ```bash
   git clone https://github.com/belliod/shop-system.git /home/dpanel/compose/shop-system
   ```
   （或直接将项目目录整体上传/复制过去；`Dockerfile`、`docker-compose.yml` 必须与源码同目录）

2. **创建环境变量文件**（同目录 `.env`，面板部署时会读取）：
   ```bash
   cd /home/dpanel/compose/shop-system
   cp .env.example.docker .env   # 若存在示例文件；否则手动创建，内容见下方“环境变量清单”
   ```

3. **打开 dPanel 面板** → 左侧菜单 **Compose** → 应能看到自动发现的 `shop-system` 任务（如未刷新，点击任务列表刷新或重启面板容器）。

4. 点击任务 **部署**，面板将自动执行 `docker compose up -d --build`：首次部署需拉取依赖与构建（约 5–10 分钟，视服务器网络）。

### 方式 B：dPanel 内 Git 仓库创建（面板 ≥ 1.9.1）

面板 **Compose → 创建任务 → Yaml 来源选「Git 仓库」**，填入仓库地址，面板克隆后按上述步骤配置 `.env` 并部署。

### 方式 C：命令行（服务器 SSH）

```bash
cd /home/dpanel/compose/shop-system
# 创建 .env（含平台凭证）后执行：
docker compose up -d --build
```

## 四、环境变量清单（写入项目目录 `.env`）

| 变量 | 必填 | 说明 |
|---|---|---|
| `FORCE_AUTHN_INNERAPI_DOMAIN` | ✅ | 平台基础域名（aPaaS 平台凭证，缺失将导致服务启动失败） |
| `FORCE_AUTHN_ACCESS_KEY` | 视平台 | 平台访问密钥 |
| `FORCE_AUTHN_ACCESS_SECRET` | 视平台 | 平台访问密钥 |
| `FORCE_AUTHN_TOKEN` | 视平台 | 平台令牌 |
| `MIAODA_AUTHN_CODE` | 视平台 | 客户端鉴权码 |
| `MIAODA_DEV_INNER_DOMAIN_WITH_PREFIX` | 否 | 管理后台内网域名（开发环境用） |
| `LOG_REQUEST_BODY` / `LOG_RESPONSE_BODY` | 否 | 是否记录请求/响应体，默认 `true` |
| `SERVER_PORT` / `SERVER_HOST` | 否 | 已由 compose 固定为 `3000` / `0.0.0.0`，一般无需修改 |

> 平台凭证由应用创建者通过 `lark-cli apps +env-pull --app-id <id> --as user` 获取并写入 `.env`。该文件已在 `.gitignore` / `.dockerignore` 中排除，不会进入镜像或仓库。

## 五、验证部署

```bash
# 查看容器状态
docker ps | grep shop-system
docker compose logs -f shop-system        # 实时日志

# 健康检查
curl http://服务器IP:3000/                 # 应返回前端页面 HTML
curl http://服务器IP:3000/api/stores?platformKey=<平台>  # 平台凭证就绪时应返回业务数据
```

预期日志（正常启动）：
```
[Nest] ... LOG [NestFactory] Starting Nest application...
[Nest] ... LOG [Bootstrap] Server running on 0.0.0.0:3000
```

## 六、常见问题

| 现象 | 原因与处理 |
|---|---|
| 容器启动即退出，日志报“平台模式需要基础域名” | 未设置 `FORCE_AUTHN_INNERAPI_DOMAIN`，在 `.env` 中补全后重新部署 |
| 面板 Compose 列表没有 shop-system | 项目子目录需直接位于 `/dpanel/compose/` 下（目录名即站点标识），且包含 `docker-compose.yml`；确认挂载路径正确后刷新 |
| 构建慢 / 拉包失败 | 项目 `.npmrc` 已指向 npmmirror 国内镜像；如服务器仍慢可配置 Docker 镜像加速 |
| 3000 端口被占用 | 修改 compose 中 `ports` 左侧宿主机端口（如 `"3001:3000"`），容器内仍为 3000 |
| 需要对外开放域名 | 使用 dPanel 标准版内置 Nginx 将容器端口转发到 80/443，并配置域名 |
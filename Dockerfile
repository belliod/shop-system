# =============================================================
# 店铺管理系统 Dockerfile
# 多阶段构建：build(编译) -> runtime(运行)
# 基础镜像使用 node:22-slim (Debian glibc)，保证 @swc/@rollup/
# lightningcss/@tailwindcss 等原生绑定包可用（无需 musl 变体）
# =============================================================

# ---------- 阶段 1：构建 ----------
FROM node:22-slim AS build

WORKDIR /app

# 先复制依赖清单，利用 Docker 层缓存加速后续构建
# --ignore-scripts：跳过 postinstall（fullstack-cli 未声明为依赖，非必需）
COPY package.json package-lock.json .npmrc ./
RUN npm ci --ignore-scripts --no-audit --no-fund

# 复制构建所需源码与配置
COPY tsconfig.json tsconfig.app.json tsconfig.node.json nest-cli.json vite.config.ts ./
COPY client ./client
COPY server ./server
COPY shared ./shared

# 生产构建：NestJS 后端 + Vite 前端（dist/server + dist/client + dist/shared）
RUN npm run build:prod

# 移除开发依赖，缩小运行时镜像体积
RUN npm prune --omit=dev

# ---------- 阶段 2：运行 ----------
FROM node:22-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    SERVER_HOST=0.0.0.0 \
    SERVER_PORT=3000 \
    TZ=Asia/Shanghai

# 运行产物：编译后的 dist + 生产依赖（凭证经环境变量注入，不打入镜像）
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./

EXPOSE 3000

# 生产启动（main.ts 中视图目录基于 process.cwd() = /app）
CMD ["node", "dist/server/main.js"]
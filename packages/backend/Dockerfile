FROM node:18-alpine

WORKDIR /app

# 复制package.json文件
COPY package.json turbo.json ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/shared/package.json ./packages/shared/

# 安装依赖
RUN npm install

# 复制源代码
COPY packages/backend ./packages/backend
COPY packages/shared ./packages/shared

# 构建应用
RUN npm run build --workspace=@multi-agent-platform/shared
RUN npm run build --workspace=@multi-agent-platform/backend

EXPOSE 3001

CMD ["npm", "run", "start", "--workspace=@multi-agent-platform/backend"]
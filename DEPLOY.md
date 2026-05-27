# expense-book 部署文档

## 环境要求

- Docker 20.10+
- Docker Compose 2.0+
- 服务器内存 1G+

## 文件说明

本目录包含以下文件：

| 文件 | 说明 |
|------|------|
| `expense-book-image.tar` | Docker 镜像文件 |
| `docker-compose.yml` | Docker Compose 配置 |
| `.env` | 环境变量配置（需自行创建） |

---

## 一键部署

### 1. 上传文件到服务器

将以下文件上传到服务器的 `/opt/expense-book/` 目录：

- `expense-book-image.tar`
- `docker-compose.yml`
- `.env`

```bash
scp expense-book-image.tar root@服务器IP:/opt/expense-book/
scp docker-compose.yml root@服务器IP:/opt/expense-book/
scp .env root@服务器IP:/opt/expense-book/
```

### 2. 服务器执行

```bash
ssh root@服务器IP

cd /opt/expense-book

# 创建数据目录
mkdir -p data

# 加载镜像
docker load -i expense-book-image.tar

# 启动服务
docker-compose up -d

# 查看状态
docker ps
```

### 3. 验证

```bash
# 查看容器状态
docker ps

# 查看日志
docker logs expense-book

# 测试访问
curl http://localhost:3000
```

---

## 环境变量配置

首次部署需要创建 `.env` 文件：

```bash
# 生成 AUTH_SECRET
openssl rand -base64 32

# 创建 .env 文件
cat > .env << 'EOF'
AUTH_SECRET=<生成的密钥>
EOF
```

---

## 常用命令

| 操作 | 命令 |
|------|------|
| 启动服务 | `docker-compose up -d` |
| 停止服务 | `docker-compose down` |
| 重启服务 | `docker-compose restart` |
| 查看状态 | `docker ps` |
| 查看日志 | `docker logs -f expense-book` |
| 重新构建并启动 | `docker-compose up -d --build` |

---

## 数据备份

SQLite 数据库文件位于 `./data/expense-book.db`

```bash
# 备份
tar -czf expense-book-data-backup-$(date +%Y%m%d).tar.gz ./data/

# 恢复
tar -xzf expense-book-data-backup-20240101.tar.gz
```

---

## 升级更新

### 方法 1：重新加载镜像

```bash
# 服务器上
cd /opt/expense-book
docker-compose down
docker load -i expense-book-image.tar
docker-compose up -d
```

### 方法 2：重新构建

如果需要更新代码，重新构建镜像：

```bash
# 本地构建
docker build -t expense-book:latest .
docker save expense-book:latest -o expense-book-image.tar

# 上传到服务器
scp expense-book-image.tar root@服务器IP:/opt/expense-book/

# 服务器加载
ssh root@服务器IP
cd /opt/expense-book
docker load -i expense-book-image.tar
docker-compose up -d --force-recreate
```

---

## 故障排查

### 容器启动失败

```bash
# 查看详细日志
docker logs expense-book

# 进入容器检查
docker exec -it expense-book sh
ls -la /app
```

### 端口被占用

```bash
# 检查端口占用
netstat -tlnp | grep 3000

# 修改 docker-compose.yml 中的端口映射
```

### 数据库权限问题

```bash
# 修复数据目录权限
chmod 777 data
```

---

## 访问地址

部署完成后访问：`http://服务器IP:3000`
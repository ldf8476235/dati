# Deploy Script

## 用法

默认会部署到当前线上环境。

## 推荐用法

日常发版直接执行：

```bash
cd /Users/lee/Documents/code/dati/backend
bash scripts/deploy.sh deploy
```

如果只是改了数据库连接、JWT、端口、systemd 配置，不想重新打包：

```bash
cd /Users/lee/Documents/code/dati/backend
bash scripts/deploy.sh config
```

`deploy` 是默认模式，所以这两条等价：

```bash
cd /Users/lee/Documents/code/dati/backend
bash scripts/deploy.sh
bash scripts/deploy.sh deploy
```

如果本机没有 `sshpass`，脚本会自动使用 Python `paramiko` 读取脚本里的 `PASS` 连接服务器。

## 可覆盖变量

```bash
HOST=198.46.175.142
USER_NAME=root
PASS=your-password
DB_URL='jdbc:mysql://x.x.x.x:3306/dati?...'
DB_USERNAME=lee
DB_PASSWORD=your-db-password
PUBLIC_DOMAIN=webfeng.org
PUBLIC_BASE_PATH=/dati-api
NGINX_SITE=/etc/nginx/sites-enabled/webfeng
JWT_SECRET=replace-this-secret
```

示例：

```bash
HOST=198.46.175.142 \
USER_NAME=root \
PASS='your-pass' \
PUBLIC_DOMAIN=webfeng.org \
PUBLIC_BASE_PATH=/dati-api \
bash scripts/deploy.sh
```

## 模式说明

### `deploy`

日常发版使用：

- 本地打包
- 上传最新 JAR
- 重启 `dati-backend.service`
- 验证内网接口和 HTTPS 接口

不会安装 Java，也不会修改 Nginx。

### `config`

只更新：

- `/etc/dati-backend/application.yml`
- `/etc/systemd/system/dati-backend.service`

然后重启服务。

## 注意

- 当前脚本为了和现网保持一致，默认把后端挂到 `https://webfeng.org/dati-api`
- 如果你后续改成专用域名，需要同步修改 `PUBLIC_DOMAIN`，并自行准备该域名的证书和站点配置
- 当前默认密码和密钥只是为了复现你这次部署，正式环境应立即替换

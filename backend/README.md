# 答题小程序后端

Java Spring Boot + MySQL 后端，覆盖微信登录、一次性付款解锁、顺序练习、随机练习、模拟考试、错题、搜索和后台题库导入。

## 本地启动

1. 创建 MySQL 数据库：

```sql
create database dati default character set utf8mb4 collate utf8mb4_unicode_ci;
```

2. 修改 `src/main/resources/application.yml` 里的数据库账号密码。

3. 启动：

```bash
mvn spring-boot:run
```

首次启动会通过 Flyway 自动建表并初始化等级、默认管理员。

## 默认账号

- 后台管理员：`admin`
- 默认密码：`admin123456`

## 客户 Word 题库导入

当前已支持客户提供的 `长护师题目.docx` 格式：

- 文件中用“选择题”“判断题”作为分段标题。
- 选择题格式示例：`题干（C） A.xxx B.xxx C.xxx D.xxx`
- 判断题格式示例：`（√）题干` 或 `（×）题干`

导入接口：

```bash
curl -X POST "http://localhost:8080/api/admin/questions/import?levelId=1" \
  -H "Authorization: Bearer <admin-token>" \
  -F "file=@长护师题目.docx"
```

`levelId=1` 对应“初级”，`levelId=2` 对应“中级”，`levelId=3` 对应“高级”。老式二进制 `.doc` 需要先用 Word/WPS 另存为 `.docx`。

## 主要接口

- `POST /api/auth/wechat-login`
- `GET /api/home`
- `POST /api/pay/orders`
- `POST /api/pay/wechat/notify`
- `GET /api/questions/sequence`
- `GET /api/questions/random`
- `POST /api/questions/{questionId}/answer`
- `GET /api/wrong-questions`
- `GET /api/questions/search`
- `POST /api/exams`
- `POST /api/exams/{examId}/submit`
- `GET /api/exams/history`
- `POST /api/admin/auth/login`
- `POST /api/admin/questions/import`
- `GET /api/admin/questions`
- `POST /api/admin/questions`
- `PUT /api/admin/questions/{id}`
- `DELETE /api/admin/questions/{id}`

## 微信与支付配置

`application.yml` 默认开启 `app.wechat.dev-mode=true`，本地开发时会把登录 `code` 映射成开发 openid，并返回占位支付参数。

上线前需要配置：

- `app.wechat.app-id`
- `app.wechat.app-secret`
- `app.wechat.mch-id`
- `app.wechat.api-v3-key`
- `app.wechat.notify-url`
- `app.jwt-secret`

微信支付回调目前保留了幂等订单更新入口，正式上线前需要接入微信支付平台证书验签和解密逻辑。

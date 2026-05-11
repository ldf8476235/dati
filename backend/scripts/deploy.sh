#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
JAR_PATH="$ROOT_DIR/target/dati-backend-0.0.1-SNAPSHOT.jar"

MODE="${1:-deploy}"

HOST="${HOST:-198.46.175.142}"
USER_NAME="${USER_NAME:-root}"
PASS="${PASS:-Wsldf981126}"
SSH_PORT="${SSH_PORT:-22}"

DB_URL="${DB_URL:-jdbc:mysql://198.46.175.142:3306/dati?useUnicode=true&characterEncoding=UTF-8&useSSL=false&serverTimezone=Asia/Shanghai&allowPublicKeyRetrieval=true}"
DB_USERNAME="${DB_USERNAME:-lee}"
DB_PASSWORD="${DB_PASSWORD:-Wsldf981126}"

APP_PORT="${APP_PORT:-18081}"
APP_DIR="${APP_DIR:-/opt/dati-backend}"
CONFIG_DIR="${CONFIG_DIR:-/etc/dati-backend}"
SERVICE_NAME="${SERVICE_NAME:-dati-backend}"
JAVA_BIN="${JAVA_BIN:-/usr/lib/jvm/java-17-openjdk-amd64/bin/java}"
JWT_SECRET="${JWT_SECRET:-dati-prod-please-rotate-this-secret-immediately}"

PUBLIC_DOMAIN="${PUBLIC_DOMAIN:-webfeng.org}"
PUBLIC_BASE_PATH="${PUBLIC_BASE_PATH:-/dati-api}"
NGINX_SITE="${NGINX_SITE:-/etc/nginx/sites-enabled/webfeng}"

if [[ ! -f "$ROOT_DIR/pom.xml" ]]; then
  echo "error: must run inside backend project" >&2
  exit 1
fi

ssh_opts=(
  -p "$SSH_PORT"
  -o StrictHostKeyChecking=no
  -o UserKnownHostsFile=/dev/null
  -o ConnectTimeout=20
)

scp_opts=(
  -P "$SSH_PORT"
  -o StrictHostKeyChecking=no
  -o UserKnownHostsFile=/dev/null
  -o ConnectTimeout=20
)

run_ssh() {
  local remote_cmd="$1"
  if command -v sshpass >/dev/null 2>&1; then
    SSHPASS="$PASS" sshpass -e ssh "${ssh_opts[@]}" "${USER_NAME}@${HOST}" "$remote_cmd"
  elif python3 -c 'import paramiko' >/dev/null 2>&1; then
    REMOTE_HOST="$HOST" \
    REMOTE_USER="$USER_NAME" \
    REMOTE_PASS="$PASS" \
    REMOTE_PORT="$SSH_PORT" \
    REMOTE_CMD="$remote_cmd" \
    python3 - <<'PY'
import os
import sys
import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(
    os.environ["REMOTE_HOST"],
    port=int(os.environ["REMOTE_PORT"]),
    username=os.environ["REMOTE_USER"],
    password=os.environ["REMOTE_PASS"],
    timeout=20,
)
stdin, stdout, stderr = client.exec_command(os.environ["REMOTE_CMD"], timeout=240)
out = stdout.read()
err = stderr.read()
if out:
    sys.stdout.buffer.write(out)
if err:
    sys.stderr.buffer.write(err)
code = stdout.channel.recv_exit_status()
client.close()
sys.exit(code)
PY
  else
    echo "error: install sshpass or python3 paramiko to use password-based deploy" >&2
    exit 1
  fi
}

run_scp() {
  local src="$1"
  local dst="$2"
  if command -v sshpass >/dev/null 2>&1; then
    SSHPASS="$PASS" sshpass -e scp "${scp_opts[@]}" "$src" "${USER_NAME}@${HOST}:$dst"
  elif python3 -c 'import paramiko' >/dev/null 2>&1; then
    REMOTE_HOST="$HOST" \
    REMOTE_USER="$USER_NAME" \
    REMOTE_PASS="$PASS" \
    REMOTE_PORT="$SSH_PORT" \
    LOCAL_SRC="$src" \
    REMOTE_DST="$dst" \
    python3 - <<'PY'
import os
import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(
    os.environ["REMOTE_HOST"],
    port=int(os.environ["REMOTE_PORT"]),
    username=os.environ["REMOTE_USER"],
    password=os.environ["REMOTE_PASS"],
    timeout=20,
)
sftp = client.open_sftp()
sftp.put(os.environ["LOCAL_SRC"], os.environ["REMOTE_DST"])
sftp.close()
client.close()
PY
  else
    echo "error: install sshpass or python3 paramiko to use password-based deploy" >&2
    exit 1
  fi
}

require_tool() {
  local name="$1"
  command -v "$name" >/dev/null 2>&1 || {
    echo "error: missing required tool: $name" >&2
    exit 1
  }
}

build_jar() {
  echo "==> build jar"
  (cd "$ROOT_DIR" && mvn -q -DskipTests package)
  [[ -f "$JAR_PATH" ]] || {
    echo "error: jar not found: $JAR_PATH" >&2
    exit 1
  }
}

write_local_files() {
  TMP_APP_YML="$(mktemp)"
  TMP_SERVICE="$(mktemp)"
  TMP_NGINX="$(mktemp)"
  export TMP_APP_YML TMP_SERVICE TMP_NGINX

  cat >"$TMP_APP_YML" <<EOF
server:
  port: $APP_PORT
  address: 127.0.0.1

spring:
  datasource:
    url: $DB_URL
    username: $DB_USERNAME
    password: $DB_PASSWORD
  flyway:
    enabled: true
    locations: classpath:db/migration

app:
  jwt-secret: "$JWT_SECRET"
  jwt-expire-hours: 720
  product:
    full-access-amount: 9900
  wechat:
    app-id: ""
    app-secret: ""
    mch-id: ""
    api-v3-key: ""
    notify-url: ""
    dev-mode: true
EOF

  cat >"$TMP_SERVICE" <<EOF
[Unit]
Description=Dati Spring Boot Backend
After=network.target mysql.service

[Service]
Type=simple
WorkingDirectory=$APP_DIR
ExecStart=$JAVA_BIN -jar $APP_DIR/dati-backend.jar --spring.config.location=file:$CONFIG_DIR/application.yml
Restart=always
RestartSec=5
User=root
Environment=TZ=Asia/Shanghai
SuccessExitStatus=143

[Install]
WantedBy=multi-user.target
EOF
}

cleanup() {
  rm -f "${TMP_APP_YML:-}" "${TMP_SERVICE:-}" "${TMP_NGINX:-}"
}

verify_local() {
  run_ssh "for i in \$(seq 1 30); do curl -fsS http://127.0.0.1:${APP_PORT}/api/auth/wechat-login -H 'Content-Type: application/json' -d '{\"code\":\"deploy-check\",\"nickname\":\"deploy\",\"avatarUrl\":\"\"}' >/dev/null 2>&1 && exit 0; sleep 2; done; systemctl --no-pager --full status '${SERVICE_NAME}.service' | sed -n '1,120p'; exit 1"
}

verify_public() {
  run_ssh "curl -k -fsS -m 15 -X POST 'https://${PUBLIC_DOMAIN}${PUBLIC_BASE_PATH}/api/auth/wechat-login' -H 'Content-Type: application/json' -d '{\"code\":\"deploy-public-check\",\"nickname\":\"deploy\",\"avatarUrl\":\"\"}' | head -c 300; echo"
}

deploy_only() {
  require_tool ssh
  require_tool scp
  require_tool mvn

  build_jar

  echo "==> upload new jar only"
  run_scp "$JAR_PATH" "$APP_DIR/dati-backend.jar"

  echo "==> restart service only"
  run_ssh "systemctl restart '${SERVICE_NAME}.service'"

  echo "==> verify"
  verify_local
  verify_public
}

reload_config() {
  require_tool ssh
  require_tool scp
  trap cleanup EXIT
  write_local_files

  echo "==> upload config and service definition"
  run_scp "$TMP_APP_YML" "$CONFIG_DIR/application.yml"
  run_scp "$TMP_SERVICE" "/etc/systemd/system/${SERVICE_NAME}.service"

  echo "==> reload service"
  run_ssh "systemctl daemon-reload && systemctl restart '${SERVICE_NAME}.service'"

  echo "==> verify"
  verify_local
}

usage() {
  cat <<EOF
usage:
  bash scripts/deploy.sh deploy   # 日常发版：重新打包、上传 jar、重启服务
  bash scripts/deploy.sh config   # 只更新 application.yml 和 systemd

default mode: deploy
EOF
}

case "$MODE" in
  deploy)
    deploy_only
    ;;
  config)
    reload_config
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    echo "error: unknown mode: $MODE" >&2
    usage
    exit 1
    ;;
esac

cat <<EOF

done
mode: ${MODE}
service: ${SERVICE_NAME}
public api base: https://${PUBLIC_DOMAIN}${PUBLIC_BASE_PATH}

EOF

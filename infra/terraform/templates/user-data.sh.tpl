#!/bin/bash
set -euxo pipefail
exec > >(tee -a /var/log/user-data.log) 2>&1

echo "=== TripDiary bootstrap start: $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="

# --- 2GB swapfile（t2.micro 1GB RAMではpnpm buildがOOMする可能性が高いため） ---
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo "/swapfile none swap sw 0 0" >> /etc/fstab
fi

# --- Node.js 24.x（CI・package.jsonの想定バージョンに合わせる。AL2023のdnf標準リポジトリの
#     nodejsパッケージは既定で古い系列が入りうるため、NodeSourceで明示的に指定する） ---
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v)" != v24.* ]]; then
  curl -fsSL https://rpm.nodesource.com/setup_24.x | bash -
  dnf install -y nodejs
fi

NODE_VERSION="$(node -v)"
echo "Installed Node version: $NODE_VERSION"
case "$NODE_VERSION" in
  v24.*) ;;
  *)
    echo "ERROR: expected Node 24.x, got $NODE_VERSION" >&2
    exit 1
    ;;
esac

# --- pnpm（package.jsonのpackageManagerと同じバージョンへ固定） ---
corepack enable
corepack prepare pnpm@11.9.0 --activate

# --- PM2（グローバル） ---
if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi

# --- git・jq（アプリの手動デプロイ手順〔README.md〕で使用。実機確認でAL2023に未搭載と判明） ---
dnf install -y git jq

# --- Nginx ---
dnf install -y nginx
rm -f /etc/nginx/conf.d/default.conf || true

cat > /etc/nginx/conf.d/tripdiary.conf <<'NGINX_CONF'
${nginx_conf}
NGINX_CONF

nginx -t
systemctl enable --now nginx

# --- PM2の自動起動（対象ユーザー: ec2-user）。
#     rootとして実行した場合、pm2 startupはヒントを表示するだけでなく、その場でsystemdユニットを
#     直接作成・有効化する（実機確認済み）。非rootで実行した場合に表示される
#     "sudo env PATH=..." の実行手順は不要（このヒント行をevalすると、pm2が末尾に出す
#     "$ pm2 unstartup systemd" という別のヒント行を誤ってコマンドとして実行してしまい、
#     set -e によりスクリプト全体が中断するバグを実機で確認したため、evalは行わない）。
pm2 startup systemd -u ec2-user --hp /home/ec2-user

# --- PM2ログローテーション（GATE-35: t2.microのディスク枯渇対策の基本設定。
#     実証・監視は「公開阻止DoD」側で行う） ---
sudo -u ec2-user pm2 install pm2-logrotate
sudo -u ec2-user pm2 set pm2-logrotate:max_size 10M
sudo -u ec2-user pm2 set pm2-logrotate:retain 7
sudo -u ec2-user pm2 set pm2-logrotate:compress true

# --- 完了マーカー（アプリのデプロイ自体はTerraform管理外・SSHで手動実行する） ---
touch /opt/tripdiary-bootstrap-complete
echo "=== TripDiary bootstrap complete: $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="

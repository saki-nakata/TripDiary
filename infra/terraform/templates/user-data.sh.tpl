#!/bin/bash
set -euxo pipefail
exec > >(tee -a /var/log/user-data.log) 2>&1

echo "=== TripDiary user-data start: $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="

# EC2 内部の構成（swap・Node.js・pnpm・Nginx・PM2）とアプリのデプロイは Ansible が担当する
# （infra/ansible）。ここでは Ansible のコントロールノードから接続して実行できる最低限だけを整える。
#
# この方針にした理由: Nginx 設定などを user-data に埋め込んでいると、設定を1行変えるだけで
# user_data_replace_on_change によって EC2 が再作成され、Elastic IP 未使用のため本番 IP が変わる。
# 構成管理を Ansible に分離することで、インスタンスを維持したまま設定だけを更新できる。

# Ansible は接続先に Python 3 を要求する（AL2023 には標準で入っているが明示しておく）。
dnf install -y python3

touch /opt/tripdiary-userdata-complete
echo "=== TripDiary user-data complete: $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
echo "次の手順: ローカル(WSL2)から infra/ansible の bootstrap.yml → deploy.yml を実行する"

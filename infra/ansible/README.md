# TripDiary 本番サーバー構成管理（Ansible）

Terraform と役割を分ける。

| ツール | 担当 |
| --- | --- |
| Terraform（`infra/terraform`） | EC2・RDS・S3・IAM・Security Group など AWS リソースの作成 |
| Ansible（このディレクトリ） | EC2 内部の OS 設定、Node.js・pnpm・Nginx・PM2、アプリのデプロイ |

## なぜ分離したか

Nginx 設定やミドルウェアの導入手順を Terraform の `user_data` に埋め込んでいると、設定を1行変えるだけで
`user_data_replace_on_change = true` により **EC2 が再作成され、Elastic IP 未使用のため本番 IP が変わる**。
そのため以前は「`terraform apply` を経由せず SSH で直接 nginx.conf を差し替える」というドリフト前提の
運用手順が必要だった。構成管理を Ansible に分離したことで、インスタンスを維持したまま設定だけを
安全に更新できる。

Terraform の `local-exec` から Ansible を強制実行するのではなく、明示的に別コマンドで実行する。
失敗時の再実行と原因切り分けが容易なため（サーバー内部の設定は専用の構成管理ツールを使い、
Terraform provisioner は限定的に使う、という HashiCorp の推奨とも一致する）。

## 前提

- **コントロールノードは WSL2（Ubuntu）を使う。** Ansible は Windows をコントロールノードとして
  ネイティブサポートしていない。
  ```bash
  sudo apt update && sudo apt install -y ansible
  ansible --version   # core 2.16 以上を想定
  ```
- SSH 秘密鍵（`tripdiary-prod.pem`）を WSL 側に配置し `chmod 400` しておくこと。
  Windows ファイルシステム上（`/mnt/c/...`）の鍵は権限が 0777 扱いになり SSH に拒否されるため、
  `~/tripdiary-prod.pem` へコピーして使う。
- Security Group の `allowed_ssh_cidr` に、実行元のグローバル IP が含まれていること。

### `/mnt/c` から実行する場合の注意（重要）

Windows 側のリポジトリ（`/mnt/c/...`）は WSL から world writable に見えるため、
**Ansible はセキュリティ上の理由でカレントディレクトリの `ansible.cfg` を無視する**。
その結果 `roles_path`・`remote_user`・`pipelining` などの設定が黙って効かなくなり、
`the role 'base' was not found` のようなエラーになる。`ANSIBLE_CONFIG` で明示すること。

```bash
cd infra/ansible
export ANSIBLE_CONFIG="$PWD/ansible.cfg"
```

なお `roles_path` は cwd からの相対で解決されるため、**`ansible-playbook` は必ず
`infra/ansible` ディレクトリから実行する**こと。

WSL のホームへリポジトリを clone して作業すればこの制約は無くなり、ファイル I/O も速い。

## セットアップ

```bash
cd infra/ansible
cp inventories/production.yml.example inventories/production.yml
# terraform output の値で production.yml を編集する
#   ansible_host   ← terraform output -raw ec2_public_ip
#   db_secret_arn  ← terraform output -raw db_secret_arn
#   rds_endpoint   ← terraform output -raw rds_endpoint
#   s3_bucket_name ← terraform output -raw s3_bucket_name

ansible all -m ping   # 疎通確認
```

## 実行フロー

```
terraform apply
      ↓
ansible-playbook playbooks/bootstrap.yml     # EC2 内部の初期構成
      ↓
ansible-playbook playbooks/deploy.yml        # アプリのデプロイ
      ↓
ヘルスチェック（deploy.yml 内で /api/health を確認する）
```

初回デプロイのみ、データベース作成を有効にする（`rds.tf` は `db_name` を未設定のため）。

```bash
ansible-playbook playbooks/deploy.yml -e tripdiary_create_database=true
```

適用前に差分を確認したい場合:

```bash
ansible-playbook playbooks/bootstrap.yml --check --diff
ansible-playbook playbooks/deploy.yml --check --diff
```

`--check` の読み方（重要）:

- 状態の**確認**だけを行う `command`（`node -v`・`pnpm -v`・`pm2 describe`・`swapon --show`・
  Secrets Manager の取得）には `check_mode: false` を指定しており、`--check` でも実際に実行される。
  これにより「何が変わるか」の判定が正しく行われる（いずれも読み取り専用）。
- 状態を**変更**する処理（パッケージ導入・`pnpm install`・`pnpm build`・`prisma migrate deploy`・
  PM2 の起動）は `--check` ではスキップされる。したがって `--check` で検証できるのは
  「接続・権限・差分の有無」までで、ビルドやマイグレーションの成否は検証できない。
- 未構築のホストに対する `--check` では、導入がスキップされる影響で後続の検証タスク
  （Node バージョン検証・swap 有効確認・`nginx -t`）も自動的に飛ばされる。

## よくある操作

| やりたいこと | コマンド |
| --- | --- |
| Nginx 設定だけ変更（IP を変えずに反映） | `roles/nginx/templates/tripdiary.conf.j2` を編集 → `ansible-playbook playbooks/bootstrap.yml --tags nginx` もしくは `bootstrap.yml` 全体を再実行 |
| アプリだけ再デプロイ | `ansible-playbook playbooks/deploy.yml` |
| EC2 を作り直した後 | `production.yml` の `ansible_host` を更新 → `bootstrap.yml` → `deploy.yml` |

Nginx 設定は `nginx -t` が成功した場合のみ反映する。構文エラー時はバックアップへ自動的に戻し、
`reload` を行わないため稼働中のプロセスは旧設定のまま動き続ける。

## ローカル検証

実機へ接続せずに検証できる範囲。

```bash
cd infra/ansible
export ANSIBLE_CONFIG="$PWD/ansible.cfg"

ansible-playbook -i inventories/production.yml playbooks/bootstrap.yml --syntax-check
ansible-playbook -i inventories/production.yml playbooks/deploy.yml --syntax-check
ansible-lint playbooks/ roles/
```

`ansible-lint` は production プロファイルで 0 件（`.ansible-lint` で `name[casing]` のみ除外。
タスク名を日本語で記述しているため）。

## ロール構成

| ロール | 内容 |
| --- | --- |
| `base` | 2GB swap、git・jq・mariadb105（mysql クライアント） |
| `node` | Node.js 24（NodeSource）、pnpm 11.9.0（corepack）、PM2 本体 |
| `nginx` | Nginx 導入、`proxy_cache` ディレクトリ、`tripdiary.conf` 配布・検証・reload |
| `pm2` | PM2 の systemd 自動起動、pm2-logrotate（10MB × 7 世代・圧縮） |
| `tripdiary` | リポジトリ取得、`.env.local` 生成、`pnpm install`／`build`、`prisma migrate deploy`、PM2 起動・reload、ヘルスチェック |

## 秘密情報の取り扱い

- **DB パスワードを Ansible 変数・インベントリに保存しない。** EC2 の IAM ロールで
  Secrets Manager から実行時に取得する（従来の手動デプロイ手順と同じ経路）。
- `.env.local` を扱うタスクには `no_log: true` を指定し、内容がログへ出ないようにしている。
  このためデバッグ時は `-vvv` を付けても該当タスクの中身は表示されない（意図的な挙動）。
- **`AUTH_SECRET` はデプロイのたびに再生成しない。** 既存の `.env.local` から読み出して引き継ぎ、
  存在しない初回のみ `openssl rand -base64 32` で生成する（再生成すると全セッションが無効になる）。
- `production.yml`（実インベントリ）は `.gitignore` 済み。

## バージョンを変えるとき

`roles/node/defaults/main.yml` の `node_major_version` / `pnpm_version` は、
`package.json` の `engines`・`packageManager` および CI の設定と必ず一致させること。

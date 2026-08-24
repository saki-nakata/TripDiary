# TripDiary 本番インフラ（Terraform）

EC2（Next.jsアプリ、Nginx＋PM2）・RDS（MySQL）・S3（画像）をTerraformで構築する。詳細な設計判断の背景は `実装計画書/phase6.md` 6-B節（ローカル専用、gitignore対象）を参照。

**役割分担**: TerraformはAWSリソース（EC2・RDS・S3・IAM・Security Group）の作成のみを担当する。
**EC2内部の構成（swap・Node.js・pnpm・Nginx・PM2）とアプリのデプロイは Ansible（`infra/ansible`）が担当する**。
user-dataはAnsibleが接続できる最低限だけを行う。詳細は `infra/ansible/README.md` を参照。

## 前提

- AWSアカウント作成済み・ローカルに `aws configure` 済みであること
- Terraform >= 1.9、AWS CLI v2
- EC2キーペアを事前に作成しておくこと（Terraformでは生成しない。秘密鍵をstateへ残すアンチパターンを避けるため）
  ```bash
  aws ec2 create-key-pair --key-name tripdiary-prod --query 'KeyMaterial' --output text > tripdiary-prod.pem
  chmod 400 tripdiary-prod.pem
  ```

## 二段階公開について（重要）

`app_public_cidr_blocks` 変数で80番の公開範囲を制御する。

- **6-B構築・検証中**: 運用者IPのみに制限する（`["<運用者のグローバルIP>/32"]`）。この状態でログイン・投稿作成等の動作確認を行っても外部から到達不能なため一般公開にはならない
- **一般公開**: 「公開阻止DoD」（実S3/IAM検証・bcryptスモーク・GATE-23/24/35等、`実装計画書/reviews/6-b-gate-fix-plan.md` 7節参照）が完了してから、`app_public_cidr_blocks = ["0.0.0.0/0"]` へ変更し `terraform apply` を単独で実行する。実行日・承認者を「運用ログ」（`docs/インフラ構成書.md` 9.5節）に記録する

## 事前確認チェックリスト（apply前に毎回）

1. `aws sts get-caller-identity` — Account/Arnが想定どおりか確認する
2. リージョンが `ap-northeast-1` であることを確認する
3. デフォルトVPCに2つ以上のAZにまたがるデフォルトサブネットが存在すること
   ```bash
   aws ec2 describe-subnets --filters Name=default-for-az,Values=true --query 'Subnets[].AvailabilityZone'
   ```
4. S3バケット名のグローバル一意性
   ```bash
   aws s3api head-bucket --bucket <bucket_name> 2>&1
   ```
   - **404（NoSuchBucket）の場合のみ利用可能**と判断する
   - **403（Forbidden）は他アカウントが既に所有していることを意味し「利用可能」ではない**。403が返った場合はバケット名を変更する

## 初回セットアップ

```bash
cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars を実際の値に編集する（bucket_name・allowed_ssh_cidr・app_public_cidr_blocks・key_pair_name等）

terraform fmt -check
terraform init -lockfile=readonly
terraform validate
terraform plan
terraform apply
```

apply後:

```bash
# user-dataの成功確認（最小構成なのでPython3導入とマーカーのみ）
ssh -i tripdiary-prod.pem ec2-user@<ec2_public_ip> 'cat /var/log/user-data.log; ls /opt/tripdiary-userdata-complete'

# ローテーション無効化（必須）: manage_master_user_password = true にすると、AWSが既定で
# 自動ローテーション（実測7日間隔、OwningService: rds）を有効化することが判明した（Terraformの
# aws_secretsmanager_secret_rotation を作成していなくても発生する。設計時の想定と異なる実挙動）。
# apply（EC2/RDS新規作成・再作成）のたびに必ず実行し、無効化されたことを確認すること。
aws secretsmanager cancel-rotate-secret --secret-id "$(terraform output -raw db_secret_arn)"
aws secretsmanager describe-secret --secret-id "$(terraform output -raw db_secret_arn)" --query 'RotationEnabled'
# → false であることを確認する
```

## EC2内部の構成変更（Nginx設定・ミドルウェア）

**Terraformでは行わない。Ansible（`infra/ansible`）で行う。**

以前はNginx設定が`user-data.sh.tpl`に埋め込まれていたため、設定を1行変えるだけで
`user_data_replace_on_change = true`によりEC2が再作成され（Elastic IP未使用のため本番IPが変わる）、
それを避けるためにSSHで直接差し替えるドリフト前提の手順が必要だった。
現在はNginx設定は`infra/ansible/roles/nginx/templates/tripdiary.conf.j2`が単一の正であり、
**インスタンスを維持したまま安全に更新できる**。

```bash
# WSL2(Ubuntu)から実行する
cd infra/ansible
# tripdiary.conf.j2 を編集してから
ansible-playbook playbooks/bootstrap.yml --tags nginx
```

`nginx -t`が成功した場合のみ`reload`する。構文エラー時はバックアップへ自動的に戻し、
reloadを行わないため稼働中のプロセスは旧設定のまま動き続ける。

`user-data.sh.tpl`は最小構成（Python3導入とマーカーのみ）にしたため変更頻度は低いが、
**編集すると従来どおり次回の`terraform apply`でEC2インスタンスが再作成される**点は変わらない。

## アプリのデプロイ

**Terraformでは行わない。Ansible（`infra/ansible`）で行う。**

```bash
cd infra/ansible
ansible-playbook playbooks/bootstrap.yml   # EC2作成・再作成の直後に一度
ansible-playbook playbooks/deploy.yml      # アプリのデプロイ（以後はこれだけ）
```

初回デプロイのみ、データベース作成を有効にする。`rds.tf`は`aws_db_instance`に`db_name`を
設定していない（変更するとDB再作成〔force replacement〕になるため、既存環境では未設定のままにしている）。

```bash
ansible-playbook playbooks/deploy.yml -e tripdiary_create_database=true
```

DBパスワードは従来どおりEC2のIAMロールからSecrets Managerを実行時に取得する
（Ansible変数・インベントリには保存しない）。`AUTH_SECRET`は既存の`.env.local`から
引き継ぎ、初回のみ生成する。

実機で判明した必須事項（`NODE_OPTIONS=--max-old-space-size=1536`、Prisma CLIへの
`dotenv -e .env.local`、PM2は`node_modules/next/dist/bin/next`を`--interpreter node`で起動）は
すべて`infra/ansible/roles/tripdiary/tasks/main.yml`にコメント付きで実装済み。

## デプロイ後動作確認（運用者IP限定の状態で実施。まだ一般公開ではない）

- ログイン・投稿作成・画像アップロード（実S3疎通）・`/api/health`・`/api-docs`
- **アップロード境界値**: 10MBちょうどの画像アップロードが成功し、13MB程度で413が返ること
- **レート制限のNginx越し結合検証**: 対象は `POST /api/auth/signup`（ログインキーはメールアドレスのためXFF検証にならない）。異なる `X-Forwarded-For` を付けた複数のサインアップリクエストを短時間に送り、Nginxの `$remote_addr` 上書きにより同一IP扱いになり10回/時のレート制限が発火することを確認する
  ```bash
  for i in $(seq 1 12); do
    curl -s -o /dev/null -w "%{http_code}\n" -X POST http://<ec2_public_ip>/api/auth/signup \
      -H "X-Forwarded-For: 10.0.0.$i" -H "Content-Type: application/json" \
      -d '{"email":"test'"$i"'@example.com","password":"dummy","nickname":"t"}'
  done
  ```
- **再起動復旧検証**: `sudo reboot` 後、Nginx・PM2（アプリプロセス）が自動復旧し `curl http://localhost/api/health` が200を返すこと
- 結果を `docs/インフラ構成書.md`「9.5 運用ログ」に記録する

## state自体の保護

`terraform.tfstate` / `*.tfstate.backup` は `.gitignore` 済みだが、次を徹底する。

- 保存先ディレクトリのアクセス権をWindowsのNTFSで運用者アカウントのみに制限する
- ディスク自体（またはユーザープロファイル）がBitLocker等で暗号化されていることを確認する
- `apply`/`destroy` 実行後は都度、暗号化した外部媒体または個人用の非公開クラウドストレージへバックアップを取得する
- RDSマスターパスワードはSecrets Manager管理のためstateに含まれないが、上記の運用は他の出力値（RDSエンドポイント等）の漏洩防止のためにも維持する

## destroy runbook

**通常は次の1〜7のスコープをEC2・RDSのみに限定し、S3は対象に含めない**（詳細は下記「S3の保護・復旧方針」参照。S3も含めた完全撤去の場合のみ、事前に`aws s3 sync`バックアップを済ませてから7を全リソース対象で実行する）。

1. `aws sts get-caller-identity` で対象AWSアカウントIDが想定どおりであることを確認する
2. リージョンが `ap-northeast-1` であることを確認する
3. `aws rds describe-db-instances --db-instance-identifier tripdiary-prod` で対象DBインスタンス識別子を確認する
4. `deletion_protection` 解除のみを先に反映する（2段階手順）
   ```bash
   terraform apply -var="deletion_protection=false" -var="snapshot_suffix=$(date +%Y%m%d-%H%M)"
   ```
5. EC2・RDSのみdestroy（S3は対象外）
   ```bash
   terraform destroy -target=aws_instance.app -target=aws_db_instance.main \
     -var="deletion_protection=false" -var="snapshot_suffix=<4と同じ値>"
   ```
6. スナップショット完成を確認する
   ```bash
   aws rds describe-db-snapshots --db-snapshot-identifier tripdiary-final-<suffix> --query 'DBSnapshots[0].Status'
   ```
   `available` になるまでポーリングしてから作業終了とする
7. 復元時は `terraform apply` でEC2・RDSを再作成し、RDSを最終スナップショットから復元した後 `prisma migrate status` でマイグレーション適用状態を確認する
8. **実行記録はPR本文または `docs/インフラ構成書.md`「9.5 運用ログ」に残す**（実行日時・実行者・スナップショットID・destroy/apply対象リソース・確認結果）。`実装計画書/`（gitignore対象）には残さない

## S3の保護・復旧方針

シード再実行による「決定的キーでの再構築」は、DB側のURL文字列とS3側のキーの両方を作り直す必要があり不整合の元になるため採用しない。**`aws s3 sync` によるキー構造ごとのバックアップ／復元を基本方式とする。**

**最重要の前提**: S3は東京リージョンで約$0.025/GB/月と極小（シード画像＋デモ投稿500MBで月1〜2円程度）で、コストの大半はEC2・RDS（Free Tier後 月$25〜30）が占める。**したがって、提出後にコストを止める際の標準手順は「EC2・RDSのみdestroyし、S3バケットは残す」とする。**

- **通常のコスト停止（推奨・デフォルト手順）**: 上記destroy runbookのとおりEC2・RDSのみ対象にする。S3・IAM・SGは残す。復活時は `terraform apply` でEC2・RDSのみ再作成し、RDSを最終スナップショットから復元すれば、DBのURLとS3の既存キーが最初から一致した状態に戻る（バックアップ／復元手順が不要）
- **完全撤去（プロジェクト終了等でS3も削除する場合のみ）**:
  1. `aws s3 sync s3://<bucket-name> ./s3-backup-<日付>/` でバケット全体をキー構造ごとローカルへ吸い出す
  2. 件数・サイズを突き合わせる（省略しない）
     ```bash
     aws s3 ls s3://<bucket-name> --recursive --summarize | tail -3
     find ./s3-backup-<日付>/ -type f | wc -l
     ```
  3. バックアップを暗号化外部媒体へ退避する（stateと同列の保護）
  4. `aws s3 rm s3://<bucket-name> --recursive` でバケットを空にしてから `terraform destroy`（`force_destroy = false` のまま）
  - 復活時: `terraform apply`（**bucket_nameは削除前と完全に同じ固定値**）→ `aws s3 sync ./s3-backup-<日付>/ s3://<bucket-name>/` → RDSを最終スナップショットから復元
- **3つの必須条件**（完全撤去ルートを選ぶ場合）:
  1. `bucket_name` を `terraform.tfvars` に固定値で持ち、削除前後で変更しない（S3バケット名はグローバル名前空間のため、削除すると名前が解放され他者に取得され得る）
  2. バックアップの保管をstateと同列に扱う（NTFS権限・暗号化・外部媒体への複製）。`docs/インフラ構成書.md`「9.5 運用ログ」に `sync` 実行日・オブジェクト件数・総サイズを記録する
  3. Content-Typeの引き継ぎを確認する（`aws s3 sync` は一部メタデータを引き継がず拡張子から再推定される）。復元後にブラウザで最低1枚を開き、画像として表示される（`application/octet-stream` としてダウンロードされない）ことを確認する。ズレていた場合は `aws s3 cp --recursive --metadata-directive REPLACE --content-type <値>` で補正する
- 一般公開apply後は「実運用ユーザーを想定していない」という前提が薄れるため、「投稿データは予告なく削除・復元される可能性がある」旨を画面上またはREADME.mdで示すかどうかは6-B2側で整理する

## コスト

- EC2（t2.micro）・RDS（db.t3.micro）: Free Tier期間中は$0、終了後は月$25〜30規模
- S3: Free Tier（5GB）内であれば$0、超過後も月数十円規模
- Secrets Manager（RDSマスターパスワード管理）: 1シークレットあたり月額約$0.40。**Free Tier対象外**（`docs/インフラ構成書.md` 7節に反映すること）

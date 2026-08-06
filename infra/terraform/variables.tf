variable "region" {
  type        = string
  description = "AWSリージョン。phase6.mdの決定どおり東京リージョンを既定値とする。"
  default     = "ap-northeast-1"
}

variable "project_name" {
  type        = string
  description = "リソース名のプレフィックスとして使う識別子。"
  default     = "tripdiary"
}

variable "allowed_ssh_cidr" {
  type        = string
  description = "EC2への22番（SSH）アクセスを許可するCIDR。運用者の現在のグローバルIPを '<ip>/32' 形式で指定する。デフォルト値は持たせず明示指定を必須にする。"
}

variable "app_public_cidr_blocks" {
  type        = list(string)
  description = <<-EOT
    Nginx(80番)を公開するCIDRのリスト。
    6-B構築・検証中は運用者IPのみに限定し（例: ["<運用者のグローバルIP>/32"]）、
    「公開阻止DoD」完了後に別applyで ["0.0.0.0/0"] へ切り替える。
    デフォルト値は持たせず明示指定を必須にする（構築中に意図せず一般公開されることを防ぐため）。
  EOT
}

variable "bucket_name" {
  type        = string
  description = <<-EOT
    S3バケット名（グローバルに一意）。
    画像URLにバケット名がそのまま含まれるため、destroy/apply・S3の完全撤去後の再作成でも
    絶対に変更しない固定値として terraform.tfvars に保持すること。
  EOT
}

variable "db_username" {
  type        = string
  description = "RDSのマスターユーザー名。パスワードは manage_master_user_password により Secrets Manager が管理するため、この変数にパスワードは含まない。"
  default     = "tripdiary_admin"
}

variable "key_pair_name" {
  type        = string
  description = "EC2にアタッチする既存のEC2キーペア名。Terraformでは生成しない（秘密鍵をstateへ残すアンチパターンを避けるため）。事前に `aws ec2 create-key-pair` 等で作成しておくこと。"
}

variable "snapshot_suffix" {
  type        = string
  description = "RDS最終スナップショット名の一意サフィックス。通常のapplyではデフォルト値のままでよい（destroy時にしか意味を持たない）。destroy準備のapply実行時だけ、日時等から一意な値を明示指定する（例: -var=\"snapshot_suffix=20260810-1430\"）。"
  default     = "unused"
}

variable "deletion_protection" {
  type        = bool
  description = "RDSの削除保護。通常運用は true 固定。destroy準備時のみ -var=\"deletion_protection=false\" で明示的に解除する2段階手順を必須とする。"
  default     = true
}

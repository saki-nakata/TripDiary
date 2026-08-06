output "ec2_public_ip" {
  description = "EC2の自動割当パブリックIP（再作成のたびに変わる。apply後にREADME/インフラ構成書のURL表記を更新すること）。"
  value       = aws_instance.app.public_ip
}

output "rds_endpoint" {
  description = "RDSエンドポイント（DATABASE_URLの組み立てに使用）。"
  value       = aws_db_instance.main.endpoint
}

output "db_secret_arn" {
  description = "RDSマスターパスワードを管理するSecrets ManagerシークレットのARN。デプロイ時にEC2上からIAMロールで取得する。"
  value       = aws_db_instance.main.master_user_secret[0].secret_arn
}

output "s3_bucket_name" {
  description = "S3バケット名。"
  value       = aws_s3_bucket.uploads.bucket
}

output "s3_bucket_domain" {
  description = "S3バケットのバーチャルホスト形式ホスト名（AWS_S3_BUCKET_NAME/AWS_REGIONから next.config.ts が組み立てるものと一致することを確認する）。"
  value       = aws_s3_bucket.uploads.bucket_regional_domain_name
}

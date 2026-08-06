# S3: 投稿・アバター画像の保管先。
# アクセス制御はバケットポリシーによる uploads/* 限定の匿名 GetObject のみ（ACLは使わない）。

resource "aws_s3_bucket" "uploads" {
  bucket = var.bucket_name

  # バケット内にオブジェクトが残っている限り terraform destroy を失敗させる
  # 意図的なチェックポイント（「画像を空にしたと人が確認してから初めて破棄できる」）。
  force_destroy = false

  tags = {
    Project = var.project_name
  }
}

# ACLは使わずバケットポリシーのみでアクセス制御する（バケット所有者強制、ACL自体を無効化）。
resource "aws_s3_bucket_ownership_controls" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  # ACLによる公開は防いだまま（BlockPublicAcls/IgnorePublicAcls は有効のまま）、
  # バケットポリシーによる公開読み取りのみを許可する。
  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "uploads_public_read" {
  bucket = aws_s3_bucket.uploads.id

  # Public Access Block の設定が先に反映されている必要がある
  depends_on = [aws_s3_bucket_public_access_block.uploads]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadUploadsOnly"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.uploads.arn}/uploads/*"
      }
    ]
  })
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# バージョニングは個人開発規模でのコスト増を避けるため有効化しない（検討の上での見送り）。
# 誤削除対策は force_destroy = false と、アプリ側の所有者スコープ付き削除ロジックに委ねる。
# S3の保護・復旧はバージョニングではなく aws s3 sync によるバックアップ／復元を基本方式とする
# （詳細は README.md「S3の保護・復旧方針」を参照）。

resource "aws_s3_bucket_lifecycle_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    id     = "abort-incomplete-multipart-uploads"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

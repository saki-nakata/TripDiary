# EC2用IAMロール: S3の uploads/* に対する最小権限（PutObject/DeleteObject）と、
# RDSのSecrets Manager管理パスワードの読み取り権限のみを付与する。
# 長期アクセスキーは発行しない（EC2にアタッチしたロールの一時credentialsのみを使う）。

data "aws_iam_policy_document" "ec2_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ec2" {
  name               = "${var.project_name}-ec2-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume_role.json
}

data "aws_iam_policy_document" "ec2_s3_uploads" {
  statement {
    sid    = "UploadsObjectReadWrite"
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:DeleteObject",
    ]
    resources = ["${aws_s3_bucket.uploads.arn}/uploads/*"]
  }
}

resource "aws_iam_role_policy" "ec2_s3_uploads" {
  name   = "${var.project_name}-ec2-s3-uploads"
  role   = aws_iam_role.ec2.id
  policy = data.aws_iam_policy_document.ec2_s3_uploads.json
}

# RDSのmanage_master_user_passwordが生成するシークレットの読み取り権限。
# ARNを明示的に1本へ限定し、ワイルドカードにしない。
data "aws_iam_policy_document" "ec2_db_secret" {
  statement {
    sid       = "ReadDbMasterSecret"
    effect    = "Allow"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_db_instance.main.master_user_secret[0].secret_arn]
  }
}

resource "aws_iam_role_policy" "ec2_db_secret" {
  name   = "${var.project_name}-ec2-db-secret-read"
  role   = aws_iam_role.ec2.id
  policy = data.aws_iam_policy_document.ec2_db_secret.json
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${var.project_name}-ec2-instance-profile"
  role = aws_iam_role.ec2.name
}

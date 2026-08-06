resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = data.aws_subnets.default.ids

  tags = {
    Project = var.project_name
  }
}

resource "aws_db_instance" "main" {
  identifier     = "${var.project_name}-prod"
  engine         = "mysql"
  engine_version = "8.0"
  instance_class = "db.t3.micro"

  allocated_storage = 20
  storage_type      = "gp2"
  storage_encrypted = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]
  publicly_accessible    = false

  username = var.db_username
  # パスワードはAWS管理（Secrets Manager）とし、Terraformの変数・stateに平文で残さない。
  # 自動ローテーションは有効化しない（aws_secretsmanager_secret_rotationを作成しない）。
  manage_master_user_password = true

  backup_retention_period = 7
  backup_window           = "17:00-17:30"         # UTC（JST 02:00-02:30）
  maintenance_window      = "sun:18:00-sun:19:00" # UTC（JST 日 03:00-04:00、backup_windowと重複しない）

  deletion_protection = var.deletion_protection

  # destroy時は最終スナップショットを必ず残す。suffixはdestroy準備のapply時にのみ明示指定する。
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.project_name}-final-${var.snapshot_suffix}"

  tags = {
    Project = var.project_name
  }
}

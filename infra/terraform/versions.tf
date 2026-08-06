terraform {
  required_version = ">= 1.9.0"

  required_providers {
    aws = {
      source = "hashicorp/aws"
      # RDSのmanage_master_user_password（Secrets Manager管理パスワード）を使うため 5.x 系に固定する。
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

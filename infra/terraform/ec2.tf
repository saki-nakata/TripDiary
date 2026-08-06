data "aws_ssm_parameter" "al2023_ami" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

locals {
  nginx_conf = file("${path.module}/templates/nginx.conf.tpl")

  user_data = templatefile("${path.module}/templates/user-data.sh.tpl", {
    nginx_conf = local.nginx_conf
  })
}

resource "aws_instance" "app" {
  ami                    = data.aws_ssm_parameter.al2023_ami.value
  instance_type          = "t2.micro"
  key_name               = var.key_pair_name
  subnet_id              = data.aws_subnets.default.ids[0]
  vpc_security_group_ids = [aws_security_group.app.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name

  # Elastic IPは使わない（EIPは使用中・未使用問わず時間課金の対象。固定IPの必要性は
  # HTTPS非採用のため薄く、再作成のたびにIPが変わる点を許容する運用とする）。
  associate_public_ip_address = true

  user_data                   = local.user_data
  user_data_replace_on_change = true

  tags = {
    Name    = "${var.project_name}-app"
    Project = var.project_name
  }
}

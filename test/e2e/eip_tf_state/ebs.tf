resource "aws_ebs_volume" "ethereum" {
  availability_zone = "${var.ethAZ}"
  size              = 100

  tags = {
    Name = "ethereum-standalone-storage"
  }
}

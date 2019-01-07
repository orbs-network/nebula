resource "aws_ebs_volume" "ethereum" {
  availability_zone = "${var.aws_ether_az}"
  size              = 100
}

resource "aws_volume_attachment" "ethereum_storage_attachment" {
  device_name = "/dev/sdh"
  volume_id   = "${aws_ebs_volume.ethereum.id}"
  instance_id = "${aws_instance.ethereum.id}"
}

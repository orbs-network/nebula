resource "aws_ebs_volume" "ethereum" {
  count             = "${var.ethereum_count}"
  size              = 100
  availability_zone = "${data.aws_availability_zones.available.names[0]}"

  tags = {
    Name = "constellation-${var.run_identifier}-storage"
  }
}

resource "aws_volume_attachment" "ethereum_storage_attachment" {
  count        = "${var.ethereum_count}"
  device_name  = "/dev/sdh"
  force_detach = true
  volume_id    = "${aws_ebs_volume.ethereum.id}"
  instance_id  = "${aws_instance.ethereum.id}"
}

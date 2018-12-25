resource "aws_ebs_volume" "ethereum_storage" {
  size              = 100
  availability_zone = "${data.aws_availability_zones.available.names[0]}"

  tags = {
    Name = "constellation-${var.run_identifier}-storage"
  }
}

resource "aws_volume_attachment" "ethereum_storage_attachment" {
  device_name = "/dev/sdh"
  volume_id   = "${aws_ebs_volume.ethereum_storage.id}"
  instance_id = "${aws_instance.ethereum.id}"
}
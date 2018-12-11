resource "aws_eip" "eip_master" {
  vpc      = true
}

resource "aws_eip_association" "eip_assoc_master" {
  instance_id = "${aws_instance.master.id}"
  allocation_id = "${aws_eip.eip_master.id}"
}
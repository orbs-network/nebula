resource "aws_eip" "eip_manager" {
  vpc      = true
}

resource "aws_eip_association" "eip_assoc_manager" {
  instance_id = "${aws_instance.manager.id}"
  allocation_id = "${aws_eip.eip_manager.id}"
}
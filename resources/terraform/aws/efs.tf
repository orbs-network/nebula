resource "aws_efs_file_system" "block_storage" {
  creation_token = "${var.name}-storage"

  tags = {
      Name = "${var.name}-storage"
  }
}

resource "aws_efs_mount_target" "block_storage_mount_point" {
  file_system_id = "${aws_efs_file_system.block_storage.id}"
  subnet_id = "${module.vpc.first_subnet.id}"
  security_groups = ["${aws_security_group.swarm.id}"]
}

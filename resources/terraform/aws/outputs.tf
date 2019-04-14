output "manager.ip" {
  value = "${aws_instance.manager.public_ip}"
}

output "manager.dns" {
  value = "${aws_instance.manager.public_dns}"
}

output "main_vpc_id" {
  value = "${module.vpc.id}"
}

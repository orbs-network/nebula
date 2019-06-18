output "manager_ip" {
  value = "${aws_instance.manager.public_ip}"
}

output "manager_dns" {
  value = "${aws_instance.manager.public_dns}"
}

output "main_vpc_id" {
  value = "${module.vpc.id}"
}

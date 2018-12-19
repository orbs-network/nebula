output "master.ip" {
  value = "${aws_instance.master.public_ip}"
}

output "master.dns" {
  value = "${aws_instance.master.public_dns}"
}

output "main_vpc_id" {
  value = "${module.vpc.id}"
}

output "ethereum.public_ip" {
  value = "${aws_instance.ethereum.public_ip}"
}

output "ethereum.private_ip" {
  value = "${aws_instance.ethereum.private_ip}"
}

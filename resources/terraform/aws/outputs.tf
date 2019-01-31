output "manager.ip" {
  value = "${aws_instance.manager.public_ip}"
}

output "manager.dns" {
  value = "${aws_instance.manager.public_dns}"
}

output "main_vpc_id" {
  value = "${module.vpc.id}"
}
<<<<<<< HEAD
=======

output "ethereum.public_ip" {
  value = "${aws_instance.ethereum.public_ip}"
}
>>>>>>> 662c80a8bd0ed7f0618336d96ace6e50e3c4aecb

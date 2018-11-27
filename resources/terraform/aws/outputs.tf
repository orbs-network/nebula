output "master.ip" {
  value = "${aws_instance.master.public_ip}"
}

output "master.dns" {
  value = "${aws_instance.master.public_dns}"
}
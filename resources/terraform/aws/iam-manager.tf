# IAM Role Swarm manager related resources

data "aws_iam_policy_document" "swarm_manager_secrets" {
  statement {
    actions = [
      "secretsmanager:*"
    ]

    resources = ["*"]
  }
}

resource "aws_iam_role" "swarm_manager" {
  name               = "orbs-constellation-${var.name}-manager"
  assume_role_policy = "${data.aws_iam_policy_document.swarm_manager_role.json}"
}

data "aws_iam_policy_document" "swarm_manager_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_instance_profile" "swarm_manager" {
  name  = "swarm-manager-${var.name}-profile"
  role = "${aws_iam_role.swarm_manager.name}"
}

resource "aws_iam_policy" "swarm_manager_secrets" {
  name   = "orbs-constellation-${var.name}-secrets-manager-policy"
  path   = "/"
  policy = "${data.aws_iam_policy_document.swarm_manager_secrets.json}"
}

resource "aws_iam_role_policy_attachment" "swarm_manager_ecr" {
  role      = "${aws_iam_role.swarm_manager.name}"
  policy_arn = "${aws_iam_policy.swarm_ecr.arn}"
}

resource "aws_iam_role_policy_attachment" "swarm_manager_secrets" {
  role      = "${aws_iam_role.swarm_manager.name}"
  policy_arn = "${aws_iam_policy.swarm_manager_secrets.arn}"
}

resource "aws_iam_role_policy_attachment" "swarm_manager_detach_role" {
  role      = "${aws_iam_role.swarm_manager.name}"
  policy_arn = "${aws_iam_policy.swarm_detach_role_policy.arn}"
}

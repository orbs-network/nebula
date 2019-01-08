# IAM Role Swarm manager related resources

resource "aws_iam_role" "swarm_manager" {
  name               = "orbs-constellation-${var.run_identifier}-manager"
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

resource "aws_iam_policy" "swarm_manager" {
  name   = "orbs-constellation-${var.run_identifier}-manager-policy"
  path   = "/"
  policy = "${data.aws_iam_policy_document.swarm_manager.json}"
}

data "aws_iam_policy_document" "swarm_manager" {
  statement {
    actions = [
      "secretsmanager:*",
      "ecr:GetAuthorizationToken",
      "ecr:BatchCheckLayerAvailability",
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchGetImage",
    ]

    resources = ["*"]
  }
}

resource "aws_iam_policy_attachment" "swarm_manager" {
  name       = "swarm-manager-${var.run_identifier}-iam-policy-attachment"
  roles      = ["${aws_iam_role.swarm_manager.name}"]
  policy_arn = "${aws_iam_policy.swarm_manager.arn}"
}

resource "aws_iam_instance_profile" "swarm_manager" {
  name  = "swarm-manager-${var.run_identifier}-profile"
  role = "${aws_iam_role.swarm_manager.name}"
}

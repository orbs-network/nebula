# IAM Role resources for swarm workers

data "aws_iam_policy_document" "swarm_worker_secrets" {
  statement {
    actions = [
      "secretsmanager:GetSecretValue"
    ]

    resources = ["*"]
  }
}

data "aws_iam_policy_document" "swarm_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "swarm_worker" {
  name               = "orbs-constellation-${var.name}-worker"
  assume_role_policy = "${data.aws_iam_policy_document.swarm_role.json}"
}

resource "aws_iam_instance_profile" "swarm_worker" {
  name = "swarm-worker-${var.name}-profile"
  role = "${aws_iam_role.swarm_worker.name}"
}

resource "aws_iam_policy" "swarm_worker_secrets" {
  name   = "orbs-constellation-${var.name}-secrets-worker-policy"
  path   = "/"
  policy = "${data.aws_iam_policy_document.swarm_worker_secrets.json}"
}

resource "aws_iam_role_policy_attachment" "swarm_worker_ebs" {
  role      = "${aws_iam_role.swarm_worker.name}"
  policy_arn = "${aws_iam_policy.swarm_ebs.arn}"
}

resource "aws_iam_role_policy_attachment" "swarm_worker_ecr" {
  role      = "${aws_iam_role.swarm_worker.name}"
  policy_arn = "${aws_iam_policy.swarm_ecr.arn}"
}

resource "aws_iam_role_policy_attachment" "swarm_worker_secrets" {
  role      = "${aws_iam_role.swarm_worker.name}"
  policy_arn = "${aws_iam_policy.swarm_worker_secrets.arn}"
}

resource "aws_iam_role_policy_attachment" "swarm_worker_detach_role" {
  role      = "${aws_iam_role.swarm_worker.name}"
  policy_arn = "${aws_iam_policy.swarm_detach_role_policy.arn}"
}

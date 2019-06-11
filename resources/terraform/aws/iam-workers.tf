# IAM Role resources for swarm workers
data "aws_iam_policy_document" "swarm_worker_ebs" {
  statement {
    actions = [
      "ec2:AttachVolume",
      "ec2:CreateVolume",
      "ec2:CreateSnapshot",
      "ec2:CreateTags",
      "ec2:DeleteVolume",
      "ec2:DeleteSnapshot",
      "ec2:DescribeAvailabilityZones",
      "ec2:DescribeInstances",
      "ec2:DescribeVolumes",
      "ec2:DescribeVolumeAttribute",
      "ec2:DescribeVolumeStatus",
      "ec2:DescribeSnapshots",
      "ec2:CopySnapshot",
      "ec2:DescribeSnapshotAttribute",
      "ec2:DetachVolume",
      "ec2:ModifySnapshotAttribute",
      "ec2:ModifyVolumeAttribute",
      "ec2:DescribeTags"
    ]

    resources = ["*"]
  }
}

data "aws_iam_policy_document" "swarm_worker_ecr" {
  statement {
    actions = [
      "ecr:GetAuthorizationToken",
      "ecr:BatchCheckLayerAvailability",
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchGetImage",
      "ecr:GetAuthorizationToken",
      "ecr:BatchCheckLayerAvailability",
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchGetImage"
    ]

    resources = ["*"]
  }
}

data "aws_iam_policy_document" "swarm_worker_secrets" {
  statement {
    actions = [
      "secretsmanager:GetSecretValue"
    ]

    resources = ["*"]
  }
}


resource "aws_iam_role" "swarm_worker" {
  name               = "orbs-constellation-${var.name}-worker"
  assume_role_policy = "${data.aws_iam_policy_document.swarm_role.json}"
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

resource "aws_iam_policy" "swarm_worker_ebs" {
  name   = "orbs-constellation-${var.name}-ebs-worker-policy"
  path   = "/"
  policy = "${data.aws_iam_policy_document.swarm_worker_ebs.json}"
}

resource "aws_iam_policy" "swarm_worker_ecr" {
  name   = "orbs-constellation-${var.name}-ecr-worker-policy"
  path   = "/"
  policy = "${data.aws_iam_policy_document.swarm_worker_ecr.json}"
}

resource "aws_iam_policy" "swarm_worker_secrets" {
  name   = "orbs-constellation-${var.name}-secrets-worker-policy"
  path   = "/"
  policy = "${data.aws_iam_policy_document.swarm_worker_secrets.json}"
}

resource "aws_iam_policy_attachment" "swarm_worker_ebs" {
  name       = "swarm-worker-${var.name}-ebs-iam-policy-attachment"
  roles      = ["${aws_iam_role.swarm_worker.name}"]
  policy_arn = "${aws_iam_policy.swarm_worker_ebs.arn}"
}

resource "aws_iam_policy_attachment" "swarm_worker_ecr" {
  name       = "swarm-worker-${var.name}-ecr-iam-policy-attachment"
  roles      = ["${aws_iam_role.swarm_worker.name}"]
  policy_arn = "${aws_iam_policy.swarm_worker_ecr.arn}"
}

resource "aws_iam_policy_attachment" "swarm_worker_secrets" {
  name       = "swarm-worker-${var.name}-secrets-iam-policy-attachment"
  roles      = ["${aws_iam_role.swarm_worker.name}"]
  policy_arn = "${aws_iam_policy.swarm_worker_secrets.arn}"
}

resource "aws_iam_instance_profile" "swarm_worker" {
  name = "swarm-worker-${var.name}-profile"
  role = "${aws_iam_role.swarm_worker.name}"
}

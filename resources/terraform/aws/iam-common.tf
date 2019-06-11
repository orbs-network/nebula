data "aws_iam_policy_document" "swarm_ecr" {
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

data "aws_iam_policy_document" "swarm_ebs" {
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

data "aws_iam_policy_document" "swarm_detach_role" {
  statement {
    actions = [
      "iam:DetachRolePolicy"
    ]

    resources = ["*"]
  }
}

resource "aws_iam_policy" "swarm_ecr" {
  name   = "orbs-constellation-${var.name}-ecr-policy"
  path   = "/"
  policy = "${data.aws_iam_policy_document.swarm_ecr.json}"
}

resource "aws_iam_policy" "swarm_ebs" {
  name   = "orbs-constellation-${var.name}-ebs-policy"
  path   = "/"
  policy = "${data.aws_iam_policy_document.swarm_ebs.json}"
}

resource "aws_iam_policy" "swarm_detach_role_policy" {
  name   = "orbs-constellation-${var.name}-detach-role-policy"
  path   = "/"
  policy = "${data.aws_iam_policy_document.swarm_detach_role.json}"
}


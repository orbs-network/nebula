# IAM Role Swarm Master related resources

resource "aws_iam_role" "swarm_master" {
  name               = "orbs-constellation-${var.run_identifier}-master"
  assume_role_policy = "${data.aws_iam_policy_document.swarm_master_role.json}"
}

data "aws_iam_policy_document" "swarm_master_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_policy" "swarm_master" {
  name   = "orbs-constellation-${var.run_identifier}-master-policy"
  path   = "/"
  policy = "${data.aws_iam_policy_document.swarm_master.json}"
}

data "aws_iam_policy_document" "swarm_master" {
  statement {
    actions = [
      "secretsmanager:*",
      "ecr:GetAuthorizationToken",
      "ecr:BatchCheckLayerAvailability",
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchGetImage",
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
      "ec2:DescribeTags",
    ]

    resources = ["*"]
  }
}

resource "aws_iam_policy_attachment" "swarm_master" {
  name       = "swarm-master-${var.run_identifier}-iam-policy-attachment"
  roles      = ["${aws_iam_role.swarm_master.name}"]
  policy_arn = "${aws_iam_policy.swarm_master.arn}"
}

resource "aws_iam_instance_profile" "swarm_master" {
  name = "swarm-master-${var.run_identifier}-profile"
  role = "${aws_iam_role.swarm_master.name}"
}

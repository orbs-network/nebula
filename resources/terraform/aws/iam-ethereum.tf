# IAM Role resources for ethereum workers
resource "aws_iam_role" "ethereum" {
  name               = "orbs-constellation-${var.run_identifier}-ethereum"
  assume_role_policy = "${data.aws_iam_policy_document.ethereum_role.json}"
}

data "aws_iam_policy_document" "ethereum_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_policy" "ethereum" {
  name   = "orbs-constellation-${var.run_identifier}-ethereum-policy"
  path   = "/"
  policy = "${data.aws_iam_policy_document.ethereum.json}"
}

data "aws_iam_policy_document" "ethereum" {
  statement {
    actions = [
      "s3:GetObject",
      "s3:ListBucket",
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

resource "aws_iam_policy_attachment" "ethereum" {
  name       = "ethereum-${var.run_identifier}-iam-policy-attachment"
  roles      = ["${aws_iam_role.ethereum.name}"]
  policy_arn = "${aws_iam_policy.ethereum.arn}"
}

resource "aws_iam_instance_profile" "ethereum" {
  name = "ethereum-${var.run_identifier}-profile"
  role = "${aws_iam_role.ethereum.name}"
}

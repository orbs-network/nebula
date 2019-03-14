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
      "s3:ListBucket"
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

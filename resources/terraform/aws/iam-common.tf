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

resource "aws_iam_policy" "swarm_detach_role_policy" {
  name   = "orbs-constellation-${var.name}-detach-role-policy"
  path   = "/"
  policy = "${data.aws_iam_policy_document.swarm_detach_role.json}"
}


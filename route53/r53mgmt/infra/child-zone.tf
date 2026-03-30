# --- Step Functions: create-child-zone ---
resource "aws_sfn_state_machine" "create_child_zone" {
  name     = "create-child-zone"
  role_arn = aws_iam_role.create_child_zone_sfn.arn
  definition = templatefile("${path.module}/create-child-zone.asl.json", {
    sns_topic_arn = aws_sns_topic.rotation_notifications.arn
  })
}

resource "aws_iam_role" "create_child_zone_sfn" {
  name = "create-child-zone-sfn-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "states.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "create_child_zone_sfn" {
  name = "create-child-zone-sfn-policy"
  role = aws_iam_role.create_child_zone_sfn.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Route53"
        Effect = "Allow"
        Action = [
          "route53:CreateHostedZone",
          "route53:GetHostedZone",
          "route53:ChangeResourceRecordSets"
        ]
        Resource = "*"
      },
      {
        Sid      = "SNS"
        Effect   = "Allow"
        Action   = ["sns:Publish"]
        Resource = aws_sns_topic.rotation_notifications.arn
      }
    ]
  })
}

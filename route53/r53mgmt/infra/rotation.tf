# --- SNS ---
resource "aws_sns_topic" "rotation_notifications" {
  name              = "dnssec-ksk-rotation-notifications"
  kms_master_key_id = "alias/aws/sns"
}

resource "aws_sns_topic_subscription" "email" {
  count     = var.notification_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.rotation_notifications.arn
  protocol  = "email"
  endpoint  = var.notification_email
}

# --- Lambda: validate-chain ---
data "archive_file" "validate_chain" {
  type        = "zip"
  source_dir  = "${path.module}/lambda/validate-chain"
  output_path = "${path.module}/lambda/validate-chain.zip"
}

resource "aws_lambda_function" "validate_chain" {
  function_name    = "dnssec-validate-chain"
  runtime          = "nodejs20.x"
  handler          = "index.handler" # ES module (.mjs) — AWS SDK v3 bundled in runtime
  filename         = data.archive_file.validate_chain.output_path
  source_code_hash = data.archive_file.validate_chain.output_base64sha256
  role             = aws_iam_role.lambda.arn
  timeout          = 30
}

# --- Lambda: create-ksk (handles KMS key creation + policy propagation + KSK creation) ---
data "archive_file" "create_ksk" {
  type        = "zip"
  source_dir  = "${path.module}/lambda/create-ksk"
  output_path = "${path.module}/lambda/create-ksk.zip"
}

resource "aws_lambda_function" "create_ksk" {
  function_name    = "dnssec-create-ksk"
  runtime          = "nodejs20.x"
  handler          = "index.handler"
  filename         = data.archive_file.create_ksk.output_path
  source_code_hash = data.archive_file.create_ksk.output_base64sha256
  role             = aws_iam_role.lambda_create_ksk.arn
  timeout          = 30
}

resource "aws_iam_role" "lambda" {
  name = "dnssec-validate-chain-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "lambda" {
  name = "dnssec-validate-chain-policy"
  role = aws_iam_role.lambda.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["route53:GetDNSSEC"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/dnssec-validate-chain:*"
      }
    ]
  })
}

# --- IAM for create-ksk Lambda ---
resource "aws_iam_role" "lambda_create_ksk" {
  name = "dnssec-create-ksk-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "lambda_create_ksk" {
  name = "dnssec-create-ksk-policy"
  role = aws_iam_role.lambda_create_ksk.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["kms:CreateKey", "kms:PutKeyPolicy"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/dnssec-create-ksk:*"
      }
    ]
  })
}

# --- Step Functions ---
resource "aws_sfn_state_machine" "ksk_rotation" {
  name     = "dnssec-ksk-rotation"
  role_arn = aws_iam_role.sfn.arn
  definition = templatefile("${path.module}/state-machine.asl.json", {
    account_id               = data.aws_caller_identity.current.account_id
    lambda_arn               = aws_lambda_function.validate_chain.arn
    create_ksk_lambda_arn    = aws_lambda_function.create_ksk.arn
    sns_topic_arn            = aws_sns_topic.rotation_notifications.arn
    kms_deletion_window_days = var.kms_deletion_window_days
  })
}

resource "aws_iam_role" "sfn" {
  name = "dnssec-ksk-rotation-sfn-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "states.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "sfn" {
  name = "dnssec-ksk-rotation-sfn-policy"
  role = aws_iam_role.sfn.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "Route53DNSSEC"
        Effect   = "Allow"
        Action   = [
          "route53:CreateKeySigningKey",
          "route53:DeactivateKeySigningKey",
          "route53:DeleteKeySigningKey",
          "route53:GetDNSSEC",
          "route53:ChangeResourceRecordSets"
        ]
        Resource = "*"
      },
      {
        Sid      = "KMS"
        Effect   = "Allow"
        Action   = [
          "kms:ScheduleKeyDeletion",
          "kms:DescribeKey",
          "kms:GetPublicKey",
          "kms:Sign",
          "kms:CreateGrant"
        ]
        Resource = "*"
      },
      {
        Sid      = "SNS"
        Effect   = "Allow"
        Action   = ["sns:Publish"]
        Resource = aws_sns_topic.rotation_notifications.arn
      },
      {
        Sid      = "Lambda"
        Effect   = "Allow"
        Action   = ["lambda:InvokeFunction"]
        Resource = [aws_lambda_function.validate_chain.arn, aws_lambda_function.create_ksk.arn]
      }
    ]
  })
}

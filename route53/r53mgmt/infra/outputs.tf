output "state_machine_arn" {
  value = aws_sfn_state_machine.ksk_rotation.arn
}

output "sns_topic_arn" {
  value = aws_sns_topic.rotation_notifications.arn
}

output "lambda_function_names" {
  value = {
    validate_chain = aws_lambda_function.validate_chain.function_name
    create_ksk     = aws_lambda_function.create_ksk.function_name
  }
}

output "create_zone_state_machine_arn" {
  value = aws_sfn_state_machine.create_child_zone.arn
}

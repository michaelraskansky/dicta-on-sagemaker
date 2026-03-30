variable "notification_email" {
  description = "Email for SNS rotation notifications"
  type        = string
  default     = ""
}

variable "ds_ttl_seconds" {
  description = "Default DS record TTL (used for wait calculations)"
  type        = number
  default     = 86400 # 24h
}

variable "dnskey_ttl_seconds" {
  description = "Default DNSKEY TTL (used for wait calculations)"
  type        = number
  default     = 3600 # 1h
}

variable "kms_deletion_window_days" {
  description = "KMS key deletion waiting period after rotation"
  type        = number
  default     = 30
}

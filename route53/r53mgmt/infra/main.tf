terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
  # For production: use S3 backend
  # backend "s3" { bucket = "r53mgmt-tfstate", key = "dnssec-rotation/terraform.tfstate", region = "us-east-1" }
}

provider "aws" {
  region = "us-east-1" # Route 53 + KMS for DNSSEC are global/us-east-1
  default_tags {
    tags = {
      Project   = "r53mgmt"
      Component = "dnssec-rotation"
      ManagedBy = "terraform"
    }
  }
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

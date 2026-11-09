#!/bin/bash
# One-time AWS setup so GitHub Actions can deploy trangsart.com.
# Run in AWS CloudShell. Creates:
#   1. GitHub as a trusted login provider (OIDC) for this AWS account
#   2. A role "trangsart-github-deploy" that ONLY the main branch of CobaltM/trangsart can use,
#      and that can ONLY write to the site bucket and refresh the CloudFront cache.
set -e
ACCT=550413898093
BUCKET=trangsart-site-550413898093
DIST=E9P8N1L2IJW5

aws iam get-open-id-connect-provider \
  --open-id-connect-provider-arn arn:aws:iam::$ACCT:oidc-provider/token.actions.githubusercontent.com >/dev/null 2>&1 \
|| aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com >/dev/null

cat > trust.json <<EOF
{"Version":"2012-10-17","Statement":[{
  "Effect":"Allow",
  "Principal":{"Federated":"arn:aws:iam::$ACCT:oidc-provider/token.actions.githubusercontent.com"},
  "Action":"sts:AssumeRoleWithWebIdentity",
  "Condition":{
    "StringEquals":{"token.actions.githubusercontent.com:aud":"sts.amazonaws.com",
                    "token.actions.githubusercontent.com:sub":"repo:CobaltM/trangsart:ref:refs/heads/main"}}}]}
EOF

cat > perms.json <<EOF
{"Version":"2012-10-17","Statement":[
  {"Effect":"Allow","Action":"s3:ListBucket","Resource":"arn:aws:s3:::$BUCKET"},
  {"Effect":"Allow","Action":["s3:PutObject","s3:DeleteObject"],"Resource":"arn:aws:s3:::$BUCKET/*"},
  {"Effect":"Allow","Action":"cloudfront:CreateInvalidation","Resource":"arn:aws:cloudfront::$ACCT:distribution/$DIST"}]}
EOF

aws iam get-role --role-name trangsart-github-deploy >/dev/null 2>&1 \
|| aws iam create-role --role-name trangsart-github-deploy \
     --assume-role-policy-document file://trust.json \
     --description "GitHub Actions deploy for trangsart.com" >/dev/null
aws iam put-role-policy --role-name trangsart-github-deploy \
  --policy-name deploy-site --policy-document file://perms.json

echo "Done: arn:aws:iam::$ACCT:role/trangsart-github-deploy"

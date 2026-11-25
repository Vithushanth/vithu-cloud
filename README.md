# vithu.cloud

My portfolio site, [vithu.cloud](https://vithu.cloud). Plain HTML, CSS and JavaScript with no build step, hosted on **S3** behind **CloudFront** and deployed by **GitHub Actions** using **OIDC**, so no AWS access keys are stored anywhere.

## Layout

```
site/                        the website, uploaded as it is
deploy.sh                    uploads site/ to S3 and clears the CloudFront cache
.github/workflows/deploy.yml runs deploy.sh on every push to main
infra/github-oidc.yaml       CloudFormation: the IAM role GitHub Actions assumes
```

## Deploy by hand

From AWS CloudShell, or anywhere with the AWS CLI signed in:

```bash
bash deploy.sh
```

The script backs up the bucket, uploads the files with cache headers, clears the CloudFront cache and checks the live pages. It never deletes anything from the bucket.

## Turn on automatic deploys

1. Create the role (once), from CloudShell:

   ```bash
   aws cloudformation deploy --stack-name github-oidc-vithu-cloud \
     --template-file infra/github-oidc.yaml --capabilities CAPABILITY_IAM

   aws cloudformation describe-stacks --stack-name github-oidc-vithu-cloud \
     --query "Stacks[0].Outputs[0].OutputValue" --output text
   ```

   If the account already has a GitHub OIDC provider, add `--parameter-overrides CreateOidcProvider=false` to the first command.

2. On GitHub, open this repository's Settings > Secrets and variables > Actions > Variables and add a variable named `AWS_DEPLOY_ROLE_ARN` with the value the second command printed.

From then on, every push to `main` that changes `site/` deploys itself. Until the variable exists, the workflow skips its job.

## How the access is limited

- The role trusts only the `main` branch of this repository.
- It can list and write objects in the site bucket and create CloudFront invalidations. Nothing else.
- Credentials last one hour and are never stored.

## Live features

- **Visitor counter.** Set `counterApi` in `site/assets/config.js` to the URL from my [visitor counter](https://github.com/vithushanth/aws-visitor-counter) project. Leave it empty to hide the counter.
- **Status page.** `site/status.html` shows results once my [uptime monitor](https://github.com/vithushanth/aws-uptime-monitor) is running.

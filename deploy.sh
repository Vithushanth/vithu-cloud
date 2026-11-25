#!/usr/bin/env bash
# Deploys the ./site folder to the vithu.cloud S3 bucket and refreshes CloudFront.
# Run from AWS CloudShell:  bash deploy.sh
# It never deletes anything from the bucket.
set -euo pipefail

BUCKET="${BUCKET:-vithu.cloud}"
DOMAIN="${DOMAIN:-vithu.cloud}"

cd "$(dirname "$0")"
[ -f site/index.html ] || { echo "site/index.html not found. Run this from the unzipped folder."; exit 1; }

echo "1/5  Checking access to s3://$BUCKET"
aws s3api head-bucket --bucket "$BUCKET"

BACKUP=""
if [ "${SKIP_BACKUP:-0}" = "1" ]; then
  echo "2/5  Skipping the backup (SKIP_BACKUP=1)"
else
  BACKUP="$HOME/vithu-cloud-backup-$(date +%Y%m%d-%H%M%S)"
  echo "2/5  Backing up the current bucket to $BACKUP"
  mkdir -p "$BACKUP"
  aws s3 sync "s3://$BUCKET" "$BACKUP" --only-show-errors
fi

echo "3/5  Uploading pages (cached for 5 minutes)"
aws s3 sync site "s3://$BUCKET" --exclude "*" --include "*.html" \
  --cache-control "public, max-age=300" --content-type "text/html; charset=utf-8"

echo "     Uploading stylesheet, script, icons and sitemap (cached for 1 day)"
aws s3 sync site "s3://$BUCKET" --exclude "*.html" \
  --cache-control "public, max-age=86400"

echo "4/5  Finding the CloudFront distribution for $DOMAIN"
DIST="$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Aliases.Items && contains(Aliases.Items, '$DOMAIN')].Id | [0]" \
  --output text 2>/dev/null || true)"
if [ -n "$DIST" ] && [ "$DIST" != "None" ]; then
  echo "     Clearing the cache on distribution $DIST"
  aws cloudfront create-invalidation --distribution-id "$DIST" --paths "/*" \
    --query "Invalidation.Id" --output text
  echo "     Waiting 30 seconds for the invalidation to start"
  sleep 30
else
  echo "     No distribution found with the alias $DOMAIN."
  echo "     Clear the cache by hand: CloudFront > your distribution > Invalidations > /*"
fi

echo "5/5  Checking the live site"
FAIL=0
for p in "" projects.html projects/this-site.html projects/ecs-fargate-app.html notes.html about.html contact.html status.html assets/site.css assets/config.js; do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' "https://$DOMAIN/$p" || echo 000)"
  printf '     %s  https://%s/%s\n' "$CODE" "$DOMAIN" "$p"
  [ "$CODE" = "200" ] || FAIL=1
done

echo
if [ "$FAIL" = "0" ]; then
  echo "Done. The new site is live at https://$DOMAIN"
else
  echo "Some pages did not return 200. A 403 on the new pages usually means the bucket"
  echo "makes files public one by one instead of through a bucket policy. See README.md."
fi
if [ -n "$BACKUP" ]; then
  echo "Backup of the old site: $BACKUP"
  echo "To roll back:  aws s3 sync \"$BACKUP\" \"s3://$BUCKET\"  then invalidate CloudFront again."
fi
[ "$FAIL" = "0" ]

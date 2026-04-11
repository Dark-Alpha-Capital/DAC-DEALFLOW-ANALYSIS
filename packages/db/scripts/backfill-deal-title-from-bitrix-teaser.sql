-- One-off after adding DealOpportunity.title: recover Bitrix TITLE that was stored in deal_teaser.
-- Review rows without bitrix_id manually (teaser-only listings may have used deal_teaser correctly).
UPDATE "DealOpportunity"
SET title = deal_teaser
WHERE title IS NULL
  AND bitrix_id IS NOT NULL
  AND deal_teaser IS NOT NULL
  AND trim(deal_teaser) <> '';

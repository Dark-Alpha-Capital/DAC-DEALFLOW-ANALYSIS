CREATE TYPE "public"."InvestorRiskProfile" AS ENUM('CONSERVATIVE', 'MODERATE', 'BALANCED', 'GROWTH', 'AGGRESSIVE');--> statement-breakpoint
ALTER TABLE "Investor" ALTER COLUMN "riskProfile" SET DATA TYPE "public"."InvestorRiskProfile" USING (
  CASE WHEN "riskProfile" IN ('CONSERVATIVE', 'MODERATE', 'BALANCED', 'GROWTH', 'AGGRESSIVE') 
  THEN "riskProfile"::"public"."InvestorRiskProfile" 
  ELSE NULL 
  END
);
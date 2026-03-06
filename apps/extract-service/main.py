"""
Minimal LangExtract HTTP service for local testing.
Run: uvicorn main:app --reload --port 8000
"""
import logging
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from pypdf import PdfReader
import langextract as lx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).parent

load_dotenv(BASE_DIR / ".env")


CREDIT_AGREEMENT_PATH = BASE_DIR / "PROJECT_IRONBRIDGE_v1_Credit_Agreement.pdf"

app = FastAPI(title="LangExtract Service", version="0.1.0")


class ExtractionItem(BaseModel):
    extraction_class: str
    extraction_text: str
    attributes: dict[str, Any] = {}


class ExampleInput(BaseModel):
    text: str
    extractions: list[ExtractionItem]


class ExtractRequest(BaseModel):
    text: str
    prompt_description: str
    examples: list[ExampleInput]
    model_id: str = "gemini-2.5-flash"


def _load_credit_agreement_text() -> str:
    """
    Load text content from the credit agreement PDF.
    If the PDF is a scanned image-only document, this may return little or no text.
    """
    reader = PdfReader(str(CREDIT_AGREEMENT_PATH))
    pages_text: list[str] = []
    for page in reader.pages:
        page_text = page.extract_text() or ""
        if page_text:
            pages_text.append(page_text)
    text = "\n\n".join(pages_text)
    if not text.strip():
        logger.warning(
            "No extractable text found in %s. The PDF may be scanned images only.",
            CREDIT_AGREEMENT_PATH,
        )
    logger.info("Loaded credit agreement text (%d chars)", len(text))
    return text


def _example_from_input(ex: ExampleInput) -> lx.data.ExampleData:
    return lx.data.ExampleData(
        text=ex.text,
        extractions=[
            lx.data.Extraction(
                extraction_class=e.extraction_class,
                extraction_text=e.extraction_text,
                attributes=e.attributes,
            )
            for e in ex.extractions
        ],
    )


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/extract")
def extract(req: ExtractRequest):
    api_key = os.environ.get("LANGEXTRACT_API_KEY") or os.environ.get("GOOGLE_AI_API_KEY")
    if not api_key:
        raise HTTPException(
            503,
            "Set LANGEXTRACT_API_KEY or GOOGLE_AI_API_KEY for cloud models",
        )
    try:
        examples = [_example_from_input(ex) for ex in req.examples]
        result = lx.extract(
            text_or_documents=req.text,
            prompt_description=req.prompt_description,
            examples=examples,
            model_id=req.model_id,
        )
        # lx.extract returns AnnotatedDocument or list of them
        docs = result if isinstance(result, list) else [result]
        out: list[dict[str, Any]] = []
        for doc in docs:
            extractions = getattr(doc, "extractions", [])
            out.append(
                {
                    "text": getattr(doc, "text", ""),
                    "extractions": [
                        {
                            "extraction_class": getattr(e, "extraction_class", ""),
                            "extraction_text": getattr(e, "extraction_text", ""),
                            "attributes": getattr(e, "attributes", {}),
                        }
                        for e in extractions
                    ],
                }
            )
        return {"documents": out}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/test-extract")
def test_extract():
    """
    Simple test endpoint:
    - Runs LangExtract against PROJECT_IRONBRIDGE_v1_Credit_Agreement.pdf
    - Uses a PE-focused prompt + example for credit agreements
    - Logs, returns, and optionally saves the extracted documents
    """
    api_key = os.environ.get("GOOGLE_AI_API_KEY")
    if not api_key:
        raise HTTPException(
            503,
            "Set GOOGLE_AI_API_KEY for cloud models",
        )

    print("google ai api_key: ", api_key)

    if not CREDIT_AGREEMENT_PATH.exists():
        raise HTTPException(
            500,
            f"Credit agreement PDF not found at {CREDIT_AGREEMENT_PATH}. "
            "Place PROJECT_IRONBRIDGE_v1_Credit_Agreement.pdf in the extract-service directory.",
        )

    prompt = (
        "You are analyzing a leveraged finance credit agreement for a private equity sponsor.\n"
        "Extract key economic and structural terms as entities, using exact spans from the text "
        "for extraction_text (no paraphrasing) and listing them in order of appearance with no "
        "overlapping spans.\n\n"
        "Focus on:\n"
        "- borrower and any guarantors\n"
        "- administrative agent and lenders\n"
        "- each facility type (e.g., term loan, revolving facility, delayed draw)\n"
        "- total commitments and currencies\n"
        "- interest rate base (SOFR, base rate, etc.) and spread/margin\n"
        "- upfront, ticking, unused, and exit fees\n"
        "- maturity dates and amortization profile\n"
        "- collateral / security summary\n"
        "- key negative covenants (especially restricted payments, debt incurrence, liens, investments)\n"
        "- key financial covenants (e.g., leverage, interest coverage)\n"
        "- key events of default.\n"
    )

    # Generic credit-agreement-style example to guide extraction
    examples = [
        lx.data.ExampleData(
            text=(
                'IRONBRIDGE HOLDINGS, LLC (the "Borrower") has entered into this Credit Agreement '
                'with DARK ALPHA CAPITAL FUND I, L.P., as lender (the "Lender"), providing for a '
                "senior secured term loan facility in an aggregate principal amount of $150,000,000."
            ),
            extractions=[
                lx.data.Extraction(
                    extraction_class="borrower",
                    extraction_text="IRONBRIDGE HOLDINGS, LLC",
                    attributes={"role": "borrower"},
                ),
                lx.data.Extraction(
                    extraction_class="lender",
                    extraction_text="DARK ALPHA CAPITAL FUND I, L.P.",
                    attributes={"role": "lender"},
                ),
                lx.data.Extraction(
                    extraction_class="facility_amount",
                    extraction_text="$150,000,000",
                    attributes={
                        "currency": "USD",
                        "facility_type": "term_loan",
                    },
                ),
            ],
        )
    ]

    try:
        # Load text from the credit agreement PDF, then run extraction on that text.
        text = _load_credit_agreement_text()
        result = lx.extract(
            text_or_documents=text,
            prompt_description=prompt,
            examples=examples,
            model_id="gemini-2.5-flash",
            extraction_passes=2,
            max_workers=8,
            max_char_buffer=2000,
            api_key=api_key,
        )
        docs = result if isinstance(result, list) else [result]
        out: list[dict[str, Any]] = []
        for doc in docs:
            extractions = getattr(doc, "extractions", [])
            out.append(
                {
                    "text": getattr(doc, "text", ""),
                    "extractions": [
                        {
                            "extraction_class": getattr(e, "extraction_class", ""),
                            "extraction_text": getattr(e, "extraction_text", ""),
                            "attributes": getattr(e, "attributes", {}),
                        }
                        for e in extractions
                    ],
                }
            )

        total_extractions = sum(
            len(getattr(doc, "extractions", [])) for doc in docs
        )
        logger.info(
            "LangExtract credit agreement test: %d documents, %d total extractions",
            len(docs),
            total_extractions,
        )

        # Log each extraction in a structured, readable way.
        for i, doc in enumerate(docs):
            logger.info("Document %d excerpt: %.200r", i + 1, getattr(doc, "text", "")[:200])
            for j, e in enumerate(getattr(doc, "extractions", [])):
                logger.info(
                    "Extraction %d.%d | class=%s | text=%r | attributes=%s",
                    i + 1,
                    j + 1,
                    getattr(e, "extraction_class", ""),
                    getattr(e, "extraction_text", ""),
                    getattr(e, "attributes", {}),
                )

        return {"documents": out}
    except Exception as e:
        raise HTTPException(500, str(e))

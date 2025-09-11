from typing import Dict, List, Optional
import PyPDF2
import pdfplumber
from io import BytesIO
import openai
import os


class PDFProcessor:
    def __init__(self, storage_service):
        self.storage_service = storage_service
        self.openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    def process_pdf(self, s3_key: str) -> Dict:
        """Process PDF and extract structured information"""
        # Download PDF
        pdf_content = self.storage_service.get_pdf_for_processing(s3_key)

        # Extract text
        text = self.extract_text(pdf_content)

        # Extract metadata
        metadata = self.extract_metadata(pdf_content)

        # Process with AI if needed
        ai_summary = self.generate_summary(text) if text else None

        return {
            "text": text,
            "metadata": metadata,
            "summary": ai_summary,
            "word_count": len(text.split()) if text else 0,
            "page_count": metadata.get("page_count", 0),
        }

    def extract_text(self, pdf_content: bytes) -> str:
        """Extract text from PDF using pdfplumber for better accuracy"""
        text = ""

        try:
            with pdfplumber.open(BytesIO(pdf_content)) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n\n"
        except Exception as e:
            print(f"Error with pdfplumber, falling back to PyPDF2: {e}")
            # Fallback to PyPDF2
            pdf_file = BytesIO(pdf_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"

        return text.strip()

    def extract_metadata(self, pdf_content: bytes) -> Dict:
        """Extract PDF metadata"""
        pdf_file = BytesIO(pdf_content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)

        metadata = {
            "page_count": len(pdf_reader.pages),
            "is_encrypted": pdf_reader.is_encrypted,
        }

        # Extract document info if available
        if pdf_reader.metadata:
            info = pdf_reader.metadata
            metadata.update(
                {
                    "title": info.get("/Title", ""),
                    "author": info.get("/Author", ""),
                    "subject": info.get("/Subject", ""),
                    "creator": info.get("/Creator", ""),
                    "producer": info.get("/Producer", ""),
                    "creation_date": str(info.get("/CreationDate", "")),
                    "modification_date": str(info.get("/ModDate", "")),
                }
            )

        return metadata

    def generate_summary(self, text: str, max_length: int = 500) -> Optional[str]:
        """Generate AI summary of the document"""
        if not text or len(text.strip()) < 100:
            return None

        try:
            # Truncate text if too long (to avoid token limits)
            max_input_length = 4000
            if len(text) > max_input_length:
                text = text[:max_input_length] + "..."

            response = self.openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a professional document summarizer. Create concise, informative summaries.",
                    },
                    {
                        "role": "user",
                        "content": f"Please summarize this document in {max_length} characters or less:\n\n{text}",
                    },
                ],
                max_tokens=150,
                temperature=0.3,
            )

            return response.choices[0].message.content.strip()

        except Exception as e:
            print(f"Error generating summary: {e}")
            return None

    def extract_key_information(self, text: str, info_type: str) -> Dict:
        """Extract specific information based on document type"""
        prompts = {
            "resume": """Extract the following from this resume:
                - Name
                - Email
                - Phone
                - Skills (list)
                - Work Experience (list of companies and roles)
                - Education (list of degrees and institutions)
                Format as JSON.""",
            "contract": """Extract the following from this contract:
                - Contract Title
                - Parties involved
                - Effective Date
                - Key Terms
                - Payment Terms
                - Deliverables
                Format as JSON.""",
            "proposal": """Extract the following from this proposal:
                - Project Title
                - Client Name
                - Proposed Solution
                - Timeline
                - Budget
                - Key Deliverables
                Format as JSON.""",
        }

        if info_type not in prompts:
            return {}

        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": f"You are a document analyzer. {prompts[info_type]}",
                    },
                    {"role": "user", "content": text[:4000]},  # Limit input
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
            )

            import json

            return json.loads(response.choices[0].message.content)

        except Exception as e:
            print(f"Error extracting information: {e}")
            return {}


# Usage with your storage service
# pdf_processor = PDFProcessor(storage_service)

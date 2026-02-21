from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date

class LineItem(BaseModel):
    description: str = Field(..., description="Description of the item or service")
    quantity: float = Field(..., description="Number of units")
    unit_price: float = Field(..., description="Price per unit")
    total: float = Field(..., description="Total price for this line item")

class InvoiceInput(BaseModel):
    invoice_id: str = Field(..., description="Unique ID of the invoice from the source system")
    vendor_id: str = Field(..., description="ID of the vendor/supplier")
    buyer_id: str = Field(..., description="ID of the buyer")
    amount: float = Field(..., description="Total amount of the invoice")
    currency: str = Field(default="USD", description="Currency code, e.g., USD, INR")
    invoice_date: date = Field(..., description="Date the invoice was issued")
    due_date: Optional[date] = Field(None, description="Due date of the invoice")
    line_items: List[LineItem] = Field(default_factory=list, description="Array of line items")
    invoice_hash: Optional[str] = Field(None, description="SHA-256 hash if already computed by the backend")

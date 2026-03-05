from pydantic import BaseModel
from typing import Optional


class ProductCreate(BaseModel):
    name: str
    barcode: str
    price_per_unit: float
    quantity: int
    discount_percent: Optional[float] = 0
    category: Optional[str] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    price_per_unit: Optional[float] = None
    quantity: Optional[int] = None
    discount_percent: Optional[float] = None
    category: Optional[str] = None

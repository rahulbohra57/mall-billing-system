from pydantic import BaseModel
from typing import List

class CartItem(BaseModel):
    product_id: str
    quantity: int

class CheckoutRequest(BaseModel):
    cashier_id: str
    cart: List[CartItem]

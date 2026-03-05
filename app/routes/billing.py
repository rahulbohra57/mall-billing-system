from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from app.database import supabase
from app.schemas.billing import CheckoutRequest
from app.auth_utils import require_cashier
from app.utils.pdf_generator import generate_bill_pdf
import uuid
import traceback

router = APIRouter(prefix="/billing", tags=["Billing"])


@router.post("/checkout")
def checkout_billing(payload: CheckoutRequest, current_user: dict = Depends(require_cashier)):
    try:
        if not payload.cart:
            raise HTTPException(status_code=400, detail="Cart is empty")

        bill_id = str(uuid.uuid4())
        total_amount = 0.0

        # 1️⃣ Validate + calculate total from DB
        enriched_items = []

        for item in payload.cart:
            res = (
                supabase
                .table("products")
                .select("price, discount_percent, quantity")
                .eq("id", item.product_id)
                .single()
                .execute()
            )

            product = res.data
            if not product:
                raise HTTPException(status_code=404, detail="Product not found")

            if product["quantity"] < item.quantity:
                raise HTTPException(status_code=400, detail="Insufficient stock")

            # product["price"] is already the discounted price stored at product creation
            effective_price = product["price"]

            subtotal = effective_price * item.quantity
            total_amount += subtotal

            enriched_items.append({
                "product_id": item.product_id,
                "quantity": item.quantity,
                "price": effective_price,
                "subtotal": subtotal
            })

        # 2️⃣ Insert bill
        supabase.table("bills").insert({
            "id": bill_id,
            "cashier_id": payload.cashier_id,
            "total_amount": round(total_amount, 2)
        }).execute()

        # 3️⃣ Insert bill items + reduce stock
        for item in enriched_items:
            supabase.table("bill_items").insert({
                "id": str(uuid.uuid4()),
                "bill_id": bill_id,
                "product_id": item["product_id"],
                "quantity": item["quantity"],
                "price": item["price"],
                "subtotal": item["subtotal"]
            }).execute()

            supabase.rpc(
                "reduce_stock",
                {
                    "pid": item["product_id"],
                    "qty": item["quantity"]
                }
            ).execute()

        return {
            "message": "Checkout successful",
            "bill_id": bill_id,
            "total": round(total_amount, 2)
        }

    except HTTPException:
        raise

    except Exception as e:
        print("CHECKOUT ERROR")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
def list_bills(current_user: dict = Depends(require_cashier)):
    return supabase.table("bills").select("*").order("created_at", desc=True).execute().data


@router.get("/{bill_id}/pdf")
def download_bill_pdf(bill_id: str, current_user: dict = Depends(require_cashier)):
    bill = supabase.table("bills").select("*").eq("id", bill_id).single().execute().data
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    items = supabase.table("bill_items").select(
        "*, products(name, barcode, price_per_unit, discount_percent)"
    ).eq("bill_id", bill_id).execute().data

    cashier = supabase.table("app_users").select("name").eq("id", bill["cashier_id"]).single().execute().data
    cashier_name = cashier["name"] if cashier else "Unknown"

    pdf_buffer = generate_bill_pdf(bill, items, cashier_name)
    filename = f"bill-{bill_id[:8]}.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/{bill_id}")
def get_bill(bill_id: str, current_user: dict = Depends(require_cashier)):
    bill = supabase.table("bills").select("*").eq("id", bill_id).single().execute().data
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    items = supabase.table("bill_items").select("*, products(name, barcode)").eq("bill_id", bill_id).execute().data

    return {"bill": bill, "items": items}
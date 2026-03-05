from fastapi import APIRouter, HTTPException, Depends
from app.database import supabase
from app.schemas.product import ProductCreate, ProductUpdate
from app.auth_utils import require_manager, require_cashier
import uuid
import traceback

router = APIRouter(prefix="/products", tags=["Products"])


@router.post("/add")
def add_product(product: ProductCreate, current_user: dict = Depends(require_manager)):
    try:
        price_per_unit = float(product.price_per_unit)
        discount_percent = int(product.discount_percent or 0)
        quantity = int(product.quantity)

        discount = round(price_per_unit * (discount_percent / 100), 2)

        payload = {
            "id": str(uuid.uuid4()),
            "name": product.name,
            "barcode": str(product.barcode),
            "price_per_unit": price_per_unit,
            "price": round(price_per_unit - discount, 2),
            "quantity": quantity,
            "discount_percent": discount_percent,
            "discount": discount,
            "category": product.category
        }

        res = supabase.table("products").insert(payload).execute()

        if not res.data:
            raise Exception("Insert failed")

        return {"message": "Product added successfully", "product": res.data[0]}

    except HTTPException:
        raise
    except Exception as e:
        print("PRODUCT ADD ERROR")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{product_id}")
def update_product(product_id: str, update: ProductUpdate, current_user: dict = Depends(require_manager)):
    existing = supabase.table("products").select("*").eq("id", product_id).single().execute().data
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")

    price_per_unit = float(update.price_per_unit) if update.price_per_unit is not None else existing["price_per_unit"]
    discount_percent = int(update.discount_percent) if update.discount_percent is not None else existing["discount_percent"]

    discount = round(price_per_unit * (discount_percent / 100), 2)

    changes = {
        "price_per_unit": price_per_unit,
        "price": round(price_per_unit - discount, 2),
        "discount_percent": discount_percent,
        "discount": discount,
    }
    if update.name is not None:
        changes["name"] = update.name
    if update.barcode is not None:
        changes["barcode"] = update.barcode
    if update.quantity is not None:
        changes["quantity"] = int(update.quantity)
    if update.category is not None:
        changes["category"] = update.category

    res = supabase.table("products").update(changes).eq("id", product_id).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Update failed")

    return {"message": "Product updated successfully", "product": res.data[0]}


@router.delete("/{product_id}")
def delete_product(product_id: str, current_user: dict = Depends(require_manager)):
    existing = supabase.table("products").select("id").eq("id", product_id).single().execute().data
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    supabase.table("products").delete().eq("id", product_id).execute()
    return {"message": "Product deleted successfully"}


@router.get("/all")
def get_all_products(current_user: dict = Depends(require_cashier)):
    return supabase.table("products").select("*").execute().data


@router.get("/barcode/{barcode}")
def get_product_by_barcode(barcode: str, current_user: dict = Depends(require_cashier)):
    res = (
        supabase.table("products")
        .select("*")
        .eq("barcode", barcode)
        .execute()
        .data
    )

    if not res:
        raise HTTPException(status_code=404, detail="Product not found")

    return res[0]

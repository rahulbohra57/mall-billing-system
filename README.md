# Mall Billing System

## Live App Access

| | |
|---|---|
| **URL** | https://mall-billing-system-5tnb.onrender.com |
| **Email** | admin@mall.com |
| **Password** | admin@1234 |
| **Role** | Manager (full access) |

> **Note:** The app is hosted on Render's free tier. If it hasn't been accessed recently, the first load may take **30–60 seconds** to spin up (cold start). Just wait and refresh once.

---

## What the App Does

A full-stack retail billing system for **Bachat Retail Store** with two roles:

- **Manager** — add products, set prices & discounts, edit/delete inventory
- **Cashier** — scan products by barcode, build a cart, generate a bill, download PDF receipt

<img width="1536" height="1024" alt="image" src="https://github.com/user-attachments/assets/b7ed521a-e8ff-426d-8fec-d3ca031ec361" />


---

## Creating Additional Users

No self-registration UI exists by design. Use the API directly to create new accounts:

```bash
curl -X POST https://mall-billing-system-5tnb.onrender.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Cashier",
    "email": "jane@mall.com",
    "password": "yourpassword",
    "role": "cashier"
  }'
```

Valid roles: `manager` · `cashier`

---

## Feature Overview

### Manager Tab
| Feature | How |
|---|---|
| Add product | Fill the "Add New Product" form — name, barcode, price, qty, discount %, category |
| Edit product | Click **Edit** on any inventory row → update any field including barcode |
| Delete product | Click **Edit** → click the red **Delete Product** button |
| View inventory | Scrollable table showing price/unit, discount, final price, stock |

### Employee Tab
| Feature | How |
|---|---|
| Search product | Enter barcode → click **Search** (or press Enter) |
| Add to cart | Set quantity in preview card → click **Add to Cart** |
| Remove from cart | Click **Remove** on a cart row |
| Generate bill | Click **Generate Final Bill** |
| Download PDF | Click **Download PDF** in the bill modal |

### Bill PDF Format
Generated receipt includes store header (Bachat Retail Store), itemised table, total, round-off, net amount, CGST + SGST (2.5% each), savings, cashier name, date, and payment reference number.

---

## Running Locally

### Prerequisites
- Python 3.11+
- A Supabase project (tables: `app_users`, `products`, `bills`, `bill_items`)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/rahulbohra57/mall-billing-system.git
cd mall-billing-system

# 2. Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Create a .env file in the project root
cp .env.example .env             # or create manually (see below)
```

**.env file contents:**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-or-service-role-key
SECRET_KEY=any-random-secret-string
```

```bash
# 5. Start the server
uvicorn app.main:app --reload

# 6. Open in browser
# http://localhost:8000
```

### Required Supabase Tables

Run this SQL in your Supabase SQL Editor before first use:

```sql
-- Users table
CREATE TABLE app_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('manager', 'cashier')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;

-- Products table
CREATE TABLE products (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  barcode        TEXT NOT NULL,
  price_per_unit NUMERIC NOT NULL,
  price          NUMERIC NOT NULL,
  discount_percent NUMERIC DEFAULT 0,
  discount       NUMERIC DEFAULT 0,
  quantity       INTEGER NOT NULL DEFAULT 0,
  category       TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Bills table
CREATE TABLE bills (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_id   TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE bills DISABLE ROW LEVEL SECURITY;

-- Bill items table
CREATE TABLE bill_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id    UUID REFERENCES bills(id),
  product_id UUID REFERENCES products(id),
  quantity   INTEGER NOT NULL,
  price      NUMERIC NOT NULL,
  subtotal   NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE bill_items DISABLE ROW LEVEL SECURITY;

-- Stock reduction function
CREATE OR REPLACE FUNCTION reduce_stock(pid UUID, qty INTEGER)
RETURNS VOID AS $$
  UPDATE products SET quantity = quantity - qty WHERE id = pid;
$$ LANGUAGE SQL;
```

Then register the first manager account:

```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Admin Manager", "email": "admin@mall.com", "password": "admin@1234", "role": "manager"}'
```

---

## API Reference

All endpoints except `/auth/login` and `/auth/register` require:
```
Authorization: Bearer <token>
```

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register a new user |
| POST | `/auth/login` | Public | Login, returns JWT token |
| GET | `/products/all` | Any | List all products |
| GET | `/products/barcode/{barcode}` | Any | Get product by barcode |
| POST | `/products/add` | Manager | Add a new product |
| PUT | `/products/{id}` | Manager | Update a product |
| DELETE | `/products/{id}` | Manager | Delete a product |
| POST | `/billing/checkout` | Any | Create a bill from cart |
| GET | `/billing/` | Any | List all bills |
| GET | `/billing/{id}` | Any | Get bill with items |
| GET | `/billing/{id}/pdf` | Any | Download bill as PDF |

Interactive API docs available at: `http://localhost:8000/docs`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python 3.11) |
| Database | Supabase (PostgreSQL) |
| Auth | Custom JWT (python-jose + passlib/bcrypt) |
| Frontend | Vanilla HTML / CSS / JavaScript |
| PDF | ReportLab |
| Hosting | Render.com (auto-deploy on push to `main`) |

---

## Project Structure

```
mall-billing-system/
├── app/
│   ├── main.py               # FastAPI app, CORS, static files, routes
│   ├── config.py             # Env var loading
│   ├── database.py           # Supabase client
│   ├── auth_utils.py         # JWT helpers, role guards
│   ├── routes/
│   │   ├── auth.py           # /auth/login, /auth/register
│   │   ├── products.py       # CRUD for products
│   │   └── billing.py        # Checkout, bill list, PDF download
│   ├── schemas/
│   │   ├── product.py        # ProductCreate, ProductUpdate
│   │   └── billing.py        # CheckoutRequest, CartItem
│   └── utils/
│       └── pdf_generator.py  # ReportLab receipt PDF builder
├── frontend/
│   ├── login.html            # Login page (served at /)
│   ├── app.html              # Main app (served at /app)
│   └── static/
│       ├── css/styles.css
│       └── js/
│           ├── api.js        # All fetch() wrappers
│           ├── auth.js       # Login form + token helpers
│           ├── manager.js    # Manager tab logic
│           ├── employee.js   # Employee tab + cart + bill modal
│           └── app.js        # Auth guard, tab switching, navbar
├── Procfile                  # Render start command
├── render.yaml               # Render deployment config
├── requirements.txt
└── .gitignore
```

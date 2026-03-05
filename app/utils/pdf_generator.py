import io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer,
    Table, TableStyle, HRFlowable
)


def _style(name, **kwargs):
    defaults = dict(fontName="Helvetica", fontSize=8, leading=11, spaceAfter=0)
    defaults.update(kwargs)
    return ParagraphStyle(name, **defaults)


CENTER     = _style("center",      alignment=TA_CENTER)
CENTER_B   = _style("center_b",    alignment=TA_CENTER, fontName="Helvetica-Bold", fontSize=10, leading=13)
TITLE      = _style("title",       alignment=TA_CENTER, fontName="Helvetica-Bold", fontSize=14, leading=18)
BODY       = _style("body",        alignment=TA_LEFT)
BODY_SMALL = _style("body_small",  alignment=TA_LEFT, fontSize=7, leading=10)


def _hr():
    return HRFlowable(width="100%", thickness=0.5, color=colors.black, spaceAfter=2)


def _sp(h=2):
    return Spacer(1, h * mm)


def generate_bill_pdf(bill: dict, items: list, cashier_name: str) -> io.BytesIO:
    buffer = io.BytesIO()

    page_w = 80 * mm
    doc = SimpleDocTemplate(
        buffer,
        pagesize=(page_w, A4[1]),
        rightMargin=5 * mm,
        leftMargin=5 * mm,
        topMargin=8 * mm,
        bottomMargin=8 * mm,
    )

    story = []

    # ── Store Header ──────────────────────────────────────────────
    story += [
        Paragraph("BACHAT RETAIL STORE", TITLE),
        Paragraph("Apna Mall", CENTER),
        Paragraph("Mehrauli, New Delhi", CENTER),
        Paragraph("Delhi - 110030", CENTER),
        Paragraph("Store contact no- (+91) 7838870829", CENTER),
        Paragraph("Website: https://rahulbohra.my.canva.site/", CENTER),
        _sp(3), _hr(), _sp(2),
        Paragraph("TAX INVOICE", CENTER_B),
        Paragraph("********* Print for Recipient *********", CENTER),
        _sp(2), _hr(), _sp(2),
    ]

    # ── Items Table ───────────────────────────────────────────────
    col_w = [27 * mm, 8 * mm, 15 * mm, 15 * mm]
    rows = [["Product", "Qty", "Unit Price", "Amount"]]

    for item in items:
        name = (item.get("products") or {}).get("name", "Unknown")
        rows.append([
            Paragraph(name, BODY_SMALL),
            str(item["quantity"]),
            f"Rs.{item['price']:.2f}",
            f"Rs.{item['subtotal']:.2f}",
        ])

    tbl = Table(rows, colWidths=col_w)
    tbl.setStyle(TableStyle([
        ("FONTNAME",    (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, -1), 7),
        ("TOPPADDING",  (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LINEBELOW",   (0, 0), (-1, 0),  0.5, colors.black),
        ("LINEBELOW",   (0, -1), (-1, -1), 0.5, colors.black),
        ("ALIGN",       (1, 0), (-1, -1), "RIGHT"),
        ("ALIGN",       (0, 0), (0, -1),  "LEFT"),
    ]))
    story += [tbl, _sp(2), _hr(), _sp(2)]

    # ── Totals ────────────────────────────────────────────────────
    total_amount = float(bill["total_amount"])
    rounded      = round(total_amount)           # standard round-half-up
    round_off    = round(rounded - total_amount, 2)
    net_amount   = float(rounded)
    total_items  = len(items)

    # Savings = sum of (original_price - discounted_price) * qty
    total_savings = 0.0
    for item in items:
        prod = item.get("products") or {}
        ppu  = float(prod.get("price_per_unit") or 0)
        orig = ppu * item["quantity"]
        total_savings += orig - float(item["subtotal"])
    total_savings = round(total_savings, 2)

    cgst = round(net_amount * 0.025, 2)
    sgst = round(net_amount * 0.025, 2)

    def line(label, val):
        story.append(Paragraph(f"{label} : {val}", BODY))

    line("Total Amount          ", f"Rs.{total_amount:.2f}")
    line("Round Off Amount ", f"Rs.{round_off:+.2f}")
    line("Net Amount Due     ", f"Rs.{net_amount:.2f}")
    line("Total Items Sold      ", str(total_items))
    story += [_sp(2), _hr(), _sp(2)]

    if total_savings > 0:
        story += [
            Paragraph(f"You have saved Rs. {total_savings:.2f} in this visit", CENTER),
            _sp(1), _hr(), _sp(2),
        ]

    line("CGST (2.5%)           ", f"Rs.{cgst:.2f}")
    line("SGST (2.5%)           ", f"Rs.{sgst:.2f}")
    story += [_sp(2), _hr(), _sp(2)]

    # ── Footer ────────────────────────────────────────────────────
    raw_date = bill.get("created_at", "")
    try:
        dt       = datetime.fromisoformat(raw_date.replace("Z", "+00:00"))
        fmt_date = dt.strftime("%d %b %Y  %I:%M %p")
    except Exception:
        fmt_date = raw_date

    story += [
        Paragraph(f"Date: {fmt_date}", BODY),
        Paragraph(f"Cashier: {cashier_name}", BODY),
        Paragraph(f"PaymentRefNo# {bill['id']}", BODY_SMALL),
        _sp(3),
        Paragraph("Thank you for shopping with us!", CENTER),
    ]

    doc.build(story)
    buffer.seek(0)
    return buffer

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.routes import products, billing, auth

app = FastAPI(title="Mall Billing System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="frontend/static"), name="static")

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(billing.router)


@app.get("/")
def serve_login():
    return FileResponse("frontend/login.html")


@app.get("/app")
def serve_app():
    return FileResponse("frontend/app.html")

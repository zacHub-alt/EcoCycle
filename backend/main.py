"""Compatibility shim for uvicorn. Some deploys/commands expect `main:app`.

This file simply imports the FastAPI `app` instance from `app.py` so
`uvicorn main:app --reload` works without changing your existing server file.
"""
from .app import app  # re-export the app instance

__all__ = ["app"]

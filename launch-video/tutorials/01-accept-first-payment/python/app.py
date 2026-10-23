import os
import uuid

from flask import Flask, redirect, request
from bachs import Bachs, BachsWebhookError, webhooks

bachs = Bachs(api_key=os.environ["BACHS_API_KEY"])
app = Flask(__name__, static_folder="public", static_url_path="")


@app.get("/")
def index():
    return app.send_static_file("index.html")


@app.post("/checkout")
def checkout():
    order_id = str(uuid.uuid4())
    session = bachs.checkout_sessions.create(
        product_cart=[{"product_id": os.environ["PRODUCT_ID"]}],
        reference=order_id,
        idempotency_key=f"checkout-{order_id}",
    )
    return redirect(session.checkout_url, code=303)


@app.post("/webhooks")
def bachs_webhook():
    try:
        event = webhooks.construct_event(
            request.get_data(), request.headers, os.environ["BACHS_WEBHOOK_SECRET"]
        )
    except BachsWebhookError:
        return "Invalid signature", 400

    if event.type == "checkout.completed":
        data = event.data
        print(f"Order {data['reference']} paid: {data['amount']} {data['currency']}")
    return "", 200

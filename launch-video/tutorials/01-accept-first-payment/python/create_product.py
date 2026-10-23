import os

from bachs import Bachs

bachs = Bachs(api_key=os.environ["BACHS_API_KEY"])

product = bachs.products.create(
    name="SnapKit Credit Pack",
    price={"currency": "USD", "amount": "10.00"},
    idempotency_key="create-snapkit-credit-pack",
)

print(product.id)

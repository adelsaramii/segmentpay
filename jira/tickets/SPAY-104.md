# SPAY-104 · Product catalog and cart

**Status:** TODO · **Priority:** HIGH · **Route:** `/shop`

## User story

As a shopper, I want to browse products and add them to a cart with adjustable quantities.

_FA:_ به عنوان یک خریدار، می‌خواهم محصولات را مرور کرده و با مقادیر قابل تنظیم به سبد خرید اضافه کنم.

## Description

The catalog screen lists products from GET /api/products with a category filter. The cart screen shows each line item with +/- buttons and a running subtotal. Shipping is a fixed €2.00. All currency rendering uses two decimals.

_FA:_ صفحه فروشگاه محصولات را از GET /api/products با فیلتر دسته‌بندی نمایش می‌دهد. صفحه سبد خرید اقلام را با دکمه‌های + / - و جمع جاری نشان می‌دهد. هزینه ارسال ثابت ۲ یورو است.

## Preconditions

- The API is seeded with at least one product per category.

## Acceptance criteria (Given / When / Then)

**AC-1**
- Given the catalog page
- When the user clicks 'add' on Fresh Bananas
- Then the Cart tab badge increments to 1 and the cart contains Fresh Bananas with quantity 1

**AC-2**
- Given the cart has one Fresh Bananas line
- When the user clicks the + button on that line
- Then quantity becomes 2 and the subtotal updates to 2 × unit price

**AC-3**
- Given a cart with items
- When a quantity reaches 0 after clicking -
- Then the line is removed

## Scenarios

**Happy path:** Browse → add items from different categories → open cart and confirm subtotal and shipping.

**Negative / edge:** Removing all items empties the cart and the Checkout button becomes disabled.

## Expected results

- Category filter restricts the visible product list.
- Cart totals equal Σ(unitPrice × qty) + €2 shipping.

## data-testid contract

- `catalog-filter-all`
- `catalog-product-grocery-banana`
- `cart-line-grocery-banana`
- `cart-subtotal`
- `cart-shipping`
- `cart-total`
- `cart-checkout-button`

# SPAY-105 · Order creation from cart

**Status:** TODO · **Priority:** HIGH · **Route:** `/checkout`

## User story

As a shopper, I want to submit my cart to create an order so that I can proceed to pay.

_FA:_ به عنوان یک خریدار، می‌خواهم سبد خرید خود را ثبت کنم تا سفارش ایجاد شده و پرداخت را آغاز کنم.

## Description

POST /api/orders accepts an items array of { productId, quantity }. The server resolves prices, computes items total + shipping, assigns an id like ORD-10001, and returns an order in status 'pending_payment'. The client navigates to /checkout/:id.

_FA:_ POST /api/orders آرایه‌ای از { productId, quantity } می‌پذیرد. سرور قیمت‌ها را حل می‌کند، جمع اقلام و هزینه ارسال را محاسبه می‌کند، یک شناسه مانند ORD-10001 اختصاص می‌دهد و سفارش را با وضعیت 'pending_payment' بازمی‌گرداند.

## Preconditions

- The cart has at least one item.

## Acceptance criteria (Given / When / Then)

**AC-1**
- Given a cart with 1 Fresh Bananas
- When the user clicks Checkout
- Then the app navigates to /checkout/<id>, the server returns status 'pending_payment' and the totals match the cart

## Scenarios

**Happy path:** Submit a cart with 3 items, land on /checkout with the right total.

**Negative / edge:** Submitting an empty cart is rejected with EMPTY_CART.

## Expected results

- An Order record exists and is retrievable at GET /api/orders/:id.
- Order id follows ORD- prefix convention.

## data-testid contract

- `cart-checkout-button`
- `checkout-order-id`
- `checkout-total-due`

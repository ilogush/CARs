# Optimization Plan

This document outlines areas of the codebase identified for future optimization, specifically focusing on replacing potentially inefficient or insecure `select('*')` queries with specific column selections.

## Objective

To improve application performance and data security by ensuring API endpoints only fetch the data they efficiently need.

## Identified `select('*')` Usages

The following files contain `select('*')` queries that should be refactored to select specific columns (e.g., `.select('id, name, ...')`).

### API Routes

#### Companies
- **`app/api/companies/[id]/route.ts`**
  - Line 76: Fetching company details.
  - Line 192: Fetching company details after update.
- **`app/api/companies/[id]/delivery-prices/route.ts`**
  - Line 35: Fetching delivery prices.
  - Line 47: Fetching delivery prices.
- **`app/api/companies/[id]/currencies/route.ts`**
  - Line 57: Fetching company currencies.

#### Cars & Car References
- **`app/api/cars/[id]/route.ts`**
  - Line 77: Fetching car details.
  - Line 141: Fetching car details after update.
- **`app/api/car-brands/[id]/route.ts`**
  - Line 30: Fetching car brand details.
- **`app/api/company-cars/[id]/route.ts`**
  - Line 111: Fetching company car details.
  - Line 214: Fetching company car details after update.
- **`app/api/references/cars/route.ts`**
  - Lines 25-31: Fetching reference data (fuel types, classes, etc.). *Note: These might be small tables where `*` is acceptable, but review for strictness is recommended.*

#### Locations
- **`app/api/locations/[id]/route.ts`**
  - Line 36: Fetching location details.
  - Line 81: Fetching location details after update.
  - Line 170: Fetching location details after delete (checking existence/state).
- **`app/api/location-seasons/route.ts`**
  - Line 19: Fetching location seasons.

#### Contract & Payments
- **`app/api/banks/route.ts`**
  - Line 11: Fetching banks.
- **`app/api/payment-types/[id]/route.ts`**
  - Line 39: Fetching payment type.
  - Line 93: Fetching payment type after update.
  - Line 202: Fetching payment type after delete check.
- **`app/api/payment-statuses/[id]/route.ts`**
  - Line 39: Fetching payment status Details.
  - Line 78: Fetching payment status.
  - Line 161: Fetching payment status.

#### Users & Clients
- **`app/api/users/[id]/route.ts`**
  - Line 26: Fetching user details. **High Priority: detailed user data.**
- **`app/api/clients/[id]/route.ts`**
  - Line 28: Fetching client details.
  - Line 40: Fetching client details.
- **`app/api/clients/search/route.ts`**
  - Line 27: Searching clients.
- **`app/api/managers/[id]/route.ts`**
  - Line 28: Fetching manager details.

#### Others
- **`app/api/colors/[id]/route.ts`**
  - Line 37, 82, 169: Fetching color details.
- **`app/api/districts/[id]/route.ts`**
  - Line 193: Fetching district details.
- **`app/api/tasks/[id]/route.ts`**
  - Line 34, 82: Fetching task details.
- **`app/api/tasks/route.ts`**
  - Line 233: Fetching tasks.
- **`app/api/currencies/[id]/route.ts`**
  - Line 38, 77, 194: Fetching currency details.
- **`app/api/calendar-events/[id]/route.ts`**
  - Line 99, 201: Fetching calendar events.

## Recommended Action Plan

1.  **Phase 1: Security Critical & High Impact**
    - Focus on `users`, `clients`, and `companies` endpoints first.
    - Define clear interfaces for the data required by the frontend forms and lists.
    - Update queries to select only those specific fields.

2.  **Phase 2: Operational Data**
    - Refactor `contracts`, `payments`, `cars`, and `locations` endpoints.

3.  **Phase 3: Reference Data**
    - Address smaller reference tables (colors, districts, car attributes).
    - Even if `*` is currently safe for small tables, explicit selection prevents future over-fetching if schemas bloom.

## Verification

After refactoring each endpoint:
1.  Verify the frontend component consuming the API still receives all necessary data.
2.  Check for strictness with `zod` schemas if applicable.

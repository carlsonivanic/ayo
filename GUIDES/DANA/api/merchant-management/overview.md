# Merchant Management

Merchant management provides functionality for managing a merchant's organizational structure, including sub-merchants (divisions) and shops, through the DANA API. Merchants can programmatically create, update, and retrieve information. This solution offers two key functionalities:

1. **Shop**: A shop refers to a merchant's actual store or outlet within each division or category. It represents the operational unit where transactions take place and can be managed individually using the DANA API.
2. **Division**: A sub merchant, also referred to as a division, represents a categorization of a merchant's structure based on their business needs. Each division can encapsulate multiple shops, facilitating aggregated management, configuration, or operations across those shops. Divisions allow merchants to organize and group certain parts of their business for easier management using the DANA API.

## Shop

Shop represents to an individual outlet within each sub-merchant.

### Mandatory APIs

| Name | Method | Description | Link |
| --- | --- | --- | --- |
| Create Shop | POST | Used for merchant to create a new shop | [Create Shop](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/create-shop.md) |

### Available Optional APIs

| Name | Method | Description | Link |
| --- | --- | --- | --- |
| Update Shop | POST | Used for merchant to update the shop information | [Update Shop](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/optional-api/update-shop.md) |
| Query Shop | POST | Used for merchant to obtain information of shop information | [Query Shop](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/optional-api/query-shop.md) |
| Get Shop List | POST | Used to obtain shop list | [Get Shop List](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/optional-api/get-shop-list.md) |
| Query Multiple Shops | POST | Used to obtain information of multiple shop information | [Query Multiple Shops](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/optional-api/query-multiple-shops.md) |
| Query Asset Card List | POST | Used to get the available asset card list that user has | [Query Asset Card List](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/optional-api/query-asset-card-list.md) |

### Process Flow

The general flow of Shop is as follows:

#### Create Shop

![Create Shop](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/merchant-management/sequence-create-shop.png)

1. Merchant initiates the process by calling the [Create Shop API](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/create-shop.md) to DANA to create a new shop.
2. DANA receives the request and begins validating the shop information provided by the merchant. After validation, DANA processes the request to create a new shop in the system.
3. DANA returns the result of the shop creation process back to the merchant, indicating success or failure.

#### Update Shop

![Update Shop](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/merchant-management/sequence-update-shop.png)

1. Merchant initiates the process by calling the [Update Shop API](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/optional-api/update-shop.md) to DANA to update shop information.
2. DANA receives the request and validates the update shop information provided by the merchant.
3. DANA returns the result of the shop update process back to the merchant, confirming the updated shop information.

#### Query Shop

![Query Shop](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/merchant-management/sequence-query-shop.png)

1. Merchant initiates the process by calling the [Query Shop API](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/optional-api/query-shop.md) to DANA to retrieve one shop information.
2. DANA receives the request and processes the query to retrieve shop information.
3. DANA returns the result containing shop information details back to the merchant.

#### Get Shop List

![Get Shop List](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/merchant-management/sequence-get-shop-list.png)

1. Merchant requests shop list that merchant have by hitting [Get Shop List API](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/optional-api/get-shop-list.md).
2. DANA receives the request and processes to obtain the shop list.
3. DANA returns the result containing shop list to the merchant.

#### Query Multiple Shops

![Query Multiple Shops](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/merchant-management/sequence-query-multiple-shops.png)

1. Merchant requests to inquiry multiple shop information by hitting [Query Multiple Shops API](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/optional-api/query-multiple-shops.md).
2. DANA receives the request and processes the request.
3. DANA returns the result of multiple shop information to the merchant.

#### Query Asset Card List

![Query Asset Card List](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/merchant-management/sequence-query-asset-card-list.png)

1. User open page wallet to see pocket list.
2. Merchant validates the user session and prepares the required request data before calling DANA.
3. Merchant calls the [Query Asset Card List API](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/optional-api/query-asset-card-list.md) to DANA to retrieve the user's asset card data.
4. DANA validates the request format, authentication, signature, and mandatory parameters.
5. DANA retrieves the user's asset card data based on the submitted request.
6. DANA filters and prepares the asset card list result before sending the response.
7. If the asset card list is found, DANA sends the asset card list result to Merchant.
8. Merchant displays all available asset cards to User.
9. If no asset card data is found, DANA sends an empty asset card list result to Merchant.
10. Merchant displays an empty asset card list or empty state to User.
11. If the request is invalid or failed, DANA sends an error response to Merchant.
12. Merchant displays the appropriate error message to User based on DANA's response.

## Division

Division represents a sub-merchant or category under the main merchant.

### Mandatory APIs

| Name | Method | Description | Link |
| --- | --- | --- | --- |
| Create Division | POST | Used for merchant to create a new division | [Create Division](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/create-division.md) |

### Available Optional APIs

| Name | Method | Description | Link |
| --- | --- | --- | --- |
| Update Division | POST | Used for merchant to update the division information | [Update Division](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/optional-api/update-division.md) |
| Query Division | POST | Used for merchant to obtain information of division | [Query Division](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/optional-api/query-division.md) |
| Get Division List | POST | Used to obtain division list | [Get Division List](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/optional-api/get-division-list.md) |
| Query Asset Card List | POST | Used to get the available asset card list that user has | [Query Asset Card List](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/optional-api/query-asset-card-list.md) |

### Process Flow

The general flow of Division is as follows:

#### Create Division

![Create Division](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/merchant-management/sequence-create-division.png)

1. Merchant initiates the process by calling the [Create Division API](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/create-division.md) to DANA to create a new division.
2. DANA receives the request and begins validating the division information provided by the merchant. After validation, DANA processes the request to create a new division in the system.
3. DANA returns the result of the division creation process back to the merchant, indicating success or failure.

#### Update Division

![Update Division](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/merchant-management/sequence-update-division.png)

1. Merchant initiates the process by calling the [Update Division API](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/optional-api/update-division.md) to DANA to update division information.
2. DANA receives the request and validates the update division information provided by the merchant.
3. DANA returns the result of the division update process back to the merchant, confirming the updated division information.

#### Query Division

![Query Division](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/merchant-management/sequence-query-division.png)

1. Merchant initiates the process by calling the [Query Division API](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/optional-api/query-division.md) to DANA to get division information.
2. DANA receives the request and processes the query to retrieve division information.
3. DANA returns the result containing division information details back to the merchant.

#### Get Division List

![Get Division List](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/merchant-management/sequence-get-division-list.png)

1. Merchant requests division list that merchant have by hitting [Get Division List API](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/optional-api/get-division-list.md).
2. DANA receives the request and processes to obtain the division list.
3. DANA returns the result containing division list to the merchant.

#### Query Asset Card List

![Query Asset Card List](https://a.m.dana.id/merchant-portal/api-docs/assets/v2/api/merchant-management/sequence-query-asset-card-list.png)

1. User open page wallet to see pocket list.
2. Merchant validates the user session and prepares the required request data before calling DANA.
3. Merchant calls the [Query Asset Card List API](https://dashboard.dana.id/api-docs-v2/llms/api/merchant-management/optional-api/query-asset-card-list.md) to DANA to retrieve the user's asset card data.
4. DANA validates the request format, authentication, signature, and mandatory parameters.
5. DANA retrieves the user's asset card data based on the submitted request.
6. DANA filters and prepares the asset card list result before sending the response.
7. If the asset card list is found, DANA sends the asset card list result to Merchant.
8. Merchant displays all available asset cards to User.
9. If no asset card data is found, DANA sends an empty asset card list result to Merchant.
10. Merchant displays an empty asset card list or empty state to User.
11. If the request is invalid or failed, DANA sends an error response to Merchant.
12. Merchant displays the appropriate error message to User based on DANA's response.

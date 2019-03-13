# TerableBroker

Made by TerableCoder

## Usage
### `terab` 
- Toggles module on or off
### `terab old` 
- Toggles delistOldestItemsFirst to true or false. This affect all "terab delist" commands 
- true = the items at the top of page 1 are delisted first
- false = the items at the bottom of the last page are delisted first
### `terab delist all` or `terab dl all` 
- Delist all brokered items
### `terab delist (number)` or `terab dl (number)` 
- Delist "number" brokered items
- "terab dl 5" delists the 5 oldest or newest listings
### `terab delist (itemId)` or `terab dl (itemId)`
- Delist all brokered items with the mentioned itemId
- You can find an items' itemId by using https://github.com/Tera-Shiraneko/item-id-finder and typing "finditem" then hovering over the item
- "terab dl 12345" delists all items with the id 12345
### `terab dli (linkedItem)`
- Delist all of the brokered items that match linkedItem
- You can link an item by pressing CTRL+LMB on the item
### `terab fromto (startNumber) (endNumber)`
- Delist the items between and including the start and end numbers
- "terab fromto 8 13" would delist listings 8 9 10 on page 1, and 11 12 13 on page 2
- Note: There are 10 items per page, starting with item 1 and ending with item 50
### `terab page (number)`
- Delist all brokered items on the indicated page
- "terab page 3" removes all items from page 3

module.exports = function TerableBroker(mod) {
	const command = mod.command || mod.require.command;
	
	if (mod.proxyAuthor !== 'caali') {
		const options = require('./module').options
		if (options) {
			const settingsVersion = options.settingsVersion
			if(settingsVersion) {
				mod.settings = require('./' + (options.settingsMigrator || 'module_settings_migrator.js'))(mod.settings._version, settingsVersion, mod.settings)
				mod.settings._version = settingsVersion
			}
		}
	}
	
	function loopBigIntToString(obj) {
		Object.keys(obj).forEach(key => {
			if (obj[key] && typeof obj[key] === 'object') loopBigIntToString(obj[key]);
			else if (typeof obj[key] === "bigint") obj[key] = obj[key].toString();
		});
	}
	
	var delistInfo = false,
		delistFromIndicies = false,
		delistType = -1,
		itemId = -1,
		matchedItems = [],
		numFailedDelist = 0,
		delisting = false,
		timeout = null,
		numberOfOpenInventorySlots = 0,
		pageNumber = -1,
		first = -1,
		last = -1;
	
	//let tempevent = event;
	//loopBigIntToString(tempevent);
	//console.log(JSON.stringify(tempevent, null, 4));
	
	
	// uncomment them if you want to enable them
	// cmd-broker
	/*
	command.add(['broker', '거래'], {
		$none(){ mod.send('S_NPC_MENU_SELECT', 1, { type: 28 }); }
	});
	*/
	
	// broker-anywhere
	/*
	const chatHook = event => {
        if(!event.message.toLowerCase().includes('!broker')) return;
        
        mod.toClient('S_NPC_MENU_SELECT', 1, {type:28})
        return false;
    }
    mod.hook('C_CHAT', 1, chatHook);
    mod.hook('C_WHISPER', 1, chatHook);
	*/
	
	command.add(['terab', 'tbroker', 'terabroker', 'terablebroker'], { // I use terab
    	$default() {
    		mod.settings.enabled = !mod.settings.enabled;
        	command.message(`Terable Broker is now ${mod.settings.enabled ? "enabled" : "disabled"}.`);
    	},
		doil(){
			if(!mod.settings.enabled) return; // so you can pretend that you don't use this module
			toggleDeslitOldestItemsFirst();
		},
		old(){
			if(!mod.settings.enabled) return;
			toggleDeslitOldestItemsFirst();
		},
    	delist(id) { // find the id with Item Id Finder, the command is finditem then hover over the item
			if(!mod.settings.enabled) return;
			delistCommandHandler(id);
    	},
		dl(id) { // find the id with Item Id Finder, the command is finditem then hover over the item
			if(!mod.settings.enabled) return;
			delistCommandHandler(id);
    	},
		fromto(start, end){ // start and end are delist. "terab fromto 1 10" will delist the first page, aka the first 10 items
			if(!mod.settings.enabled) return;
			delistType = 2;
			first = parseInt(start);
			last = parseInt(end);
			if(isNaN(first) || first < 1 || first > 49){ command.message(`Invalid start number. Start must be within the range 1-49...`); }
			else if(isNaN(last) || last < 2 || last > 50){ command.message(`Invalid end number. End must be within the range 2-50...`); }
			else if(start >= last){ command.message(`Start isn't smaller than end...`); }
			else{ delistFromStartToEnd(); } 
		},
		page(number){
			if(!mod.settings.enabled) return;
			delistType = 3;
			pageNumber = parseInt(number);
			if(!isNaN(pageNumber) && pageNumber > 0 && pageNumber < 6){
				first = (((pageNumber-1)*10)+1);
				last = (pageNumber*10);
				delistFromStartToEnd();
			} else{
				command.message(`Invalid page number. Valid page numbers are: 1, 2, 3, 4, 5...`);
			}
		}
	});
	
	function delistFromStartToEnd(){
		first--; // change to array index
		last--; // change to array index
		itemId = last-first;
		delistFromIndicies = true;
		mod.toServer('C_TRADE_BROKER_REGISTERED_ITEM_LIST', 1, { }); // get your broker listings
	}
	
	function toggleDeslitOldestItemsFirst(){
		mod.settings.deslitOldestItemsFirst = !mod.settings.deslitOldestItemsFirst;
        command.message(`Delist Oldest Items First is now ${mod.settings.deslitOldestItemsFirst ? "enabled" : "disabled"}.`);
	}
	
	function delistCommandHandler(id){
		if(id && id == "all"){ 
			itemId = 50; 
			delistType = 0;
		} else{ 
			delistType = 1;
			itemId = parseInt(id); 
		}
		delistInfo = true;
		mod.toServer('C_TRADE_BROKER_REGISTERED_ITEM_LIST', 1, { }); // get your broker listings
	}
	
	mod.hook('S_TRADE_BROKER_REGISTERED_ITEM_LIST', 2, event => {
		if(!mod.settings.enabled || (!delistInfo && !delistFromIndicies)) return;
		delistInfo = false;
		if(!itemId || itemId < 0) {
			command.message("Invalid itemId, delisting canceled...");
			delistFromIndicies = false;
			return;
		}
		let timeToWait = 0;
		if(timeout){
			command.message("TerableBroker still delisting! Waiting 1 second before starting.");
			timeToWait = 1000;
		}
		let numInvenSpotsLocal = numberOfOpenInventorySlots;
		setTimeout(() => {
			let numItemsDelisted = 0;
			if(numInvenSpotsLocal <= 0) command.message("Your inventory is full, delisting canceled...");
			matchedItems = [];
			numFailedDelist = 0;
			delisting = true;
			
			let numListings = event.listings.length;
			let numLoops = numListings < itemId ? numListings : itemId; // smaller of numListings and numberItemsToDelist, aka handle delist 50 when only 35 listings
			if(delistFromIndicies){
				if(numListings < last){
					if(delistType==2)command.message(`You're trying to delist ending at ${last}, but only have ${numListings} brokerage listings! Delisting end set to ${numListings} instead.`);
					last = numListings-1;
					numLoops = numListings-first;
				}
				if(numInvenSpotsLocal < numLoops){ // prevent crashes caused by merging items while inventory full
					command.message(`You are trying to delist ${numLoops} items, but only have ${numInvenSpotsLocal} inventory slots! Delisting ${numInvenSpotsLocal} items instead.`);
					numLoops = numInvenSpotsLocal; // just repeat the command if you merged items and have enough inventory slots now
					last = first+numLoops-1;
				}
			} else {
				if(numInvenSpotsLocal < numLoops){ // prevent crashes caused by merging items while inventory full
					command.message(`You are trying to delist ${itemId} items, but only have ${numInvenSpotsLocal} inventory slots! Delisting ${numInvenSpotsLocal} items instead.`);
					numLoops = numInvenSpotsLocal; // just repeat the command if you merged items and have enough inventory slots now
				}
			}
			
			if(delistFromIndicies){
				delistFromIndicies = false;
				for (let i = first; i <= last; i++) matchedItems.push(event.listings[i]); // get items from start to and including end
			} else if(itemId < 51) { // delist x items, items with ids below 51 are low level gear that I don't care about handling
				if(!mod.settings.deslitOldestItemsFirst){ // delist newest listings first, aka backwards
					for (let i = numListings-1; i > numListings-1-numLoops; i--) matchedItems.push(event.listings[i]); // get numLoops items
				} else{
					for (let i = 0; i < numLoops; i++) matchedItems.push(event.listings[i]); // get numLoops items
				}
			} else{ // delist specific item
				for (let listed of event.listings){
					if(matchedItems.length >= numInvenSpotsLocal) break; // inventory will be full
					if(listed.item == itemId) matchedItems.push(listed); // get list of matched items
				}
			}
			
			if(matchedItems.length > 0){
				for (let listedItem of matchedItems) { // remove items
					mod.setTimeout(() => {
						mod.toServer('C_TRADE_BROKER_UNREGISTER_ITEM', 1, {
							listing: listedItem.listing
						});
					}, mod.settings.delay); // default 20, aka wait 1 second to delist 50 items
				}
			} else{
				command.message("Delisted 0 items");
				delisting = false;
				return;
			}
			timeout = setTimeout(() => {
				if(delistType == 0){
					command.message(`Removed ${matchedItems.length - numFailedDelist} broker listings.`);
				} else if(delistType == 1){
					command.message(`Removed ${matchedItems.length - numFailedDelist} broker listings of itemId = ${itemId}.`);
				} else if(delistType == 2){ 
					if(!numFailedDelist){ command.message(`Removed from broker listing ${first+1} to and including ${last+1}`); }
					else{ command.message(`Failed to delist ${numFailedDelist} items. Successfully delisted from ${first+1} to ${last+1-numFailedDelist}.`); }
				} else if(delistType == 3){
					if(!numFailedDelist){ command.message(`Removed broker listings from page ${pageNumber}.`); }
					else{ command.message(`Removed all but ${numFailedDelist} broker listings from page ${pageNumber}.`); }
				}
				delisting = false;
				clearTimeout(timeout);
				timeout = null;
			}, matchedItems.length*50+100);
		}, timeToWait);
		
    });
	
	mod.hook('S_SYSTEM_MESSAGE', 1, event => {
    	if(!mod.settings.enabled) return;
		if(!delisting) return;
    	let msg = mod.parseSystemMessage(event.message);
    	if (msg && msg.id === 'SMT_INVEN_FULL') numFailedDelist++; // inventory full, shouldn't happen unless you delist while looting....
	});
	
	mod.hook('S_INVEN', 16, event => { // stupid ass packet doesn't count inventory slots, have to wait for system inventory full packet
		//numberOfOpenInventorySlots = event.size - event.items.length;
		//console.log(`S_INVEN ~ numberOfOpenInventorySlots = ${numberOfOpenInventorySlots} ~ event.size = ${event.size} ~ event.items.length = ${event.items.length}`);
	});
	
	mod.hook('S_LOGIN', 12, (event) => {
		delistInfo = false;
		delistFromIndicies = false;
		delistType = -1;
		itemId = -1;
		matchedItems = [];
		numFailedDelist = 0;
		delisting = false;
		timeout = null;
		numberOfOpenInventorySlots = 0;
		pageNumber = -1;
	});
}
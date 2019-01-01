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
	
	let delistInfo = false,
		itemId = -1,
		matchedItems = [],
		numFailedDelist = 0,
		delisting = false;
	
	//let tempevent = event;
	//loopBigIntToString(tempevent);
	//console.log(JSON.stringify(tempevent, null, 4));
	
	command.add('terab', {
    	$default() {
    		mod.settings.enabled = !mod.settings.enabled;
        	command.message(`Terable Broker is now ${mod.settings.enabled ? "enabled" : "disabled"}.`);
    	},
    	delist(id) { // find the id with Item Id Finder, the command is finditem then hover over the item
			if(!mod.settings.enabled) return;
			if(id && id == "all"){
				itemId = "all";
			} else {
				id = parseInt(id);
				itemId = isNaN(id) ? -2 : id;
			}
			delistInfo = true;
			mod.toServer('C_TRADE_BROKER_REGISTERED_ITEM_LIST', 1, {
				// empty
			});
    	}
	});
	
	mod.hook('S_TRADE_BROKER_REGISTERED_ITEM_LIST', 2, event => {
		if(!mod.settings.enabled) return;
		if(!delistInfo) return;
		delistInfo = false;
		if(itemId == -1 || itemId == -2) {
			command.message("Invalid itemId");
			return;
		}
		matchedItems = [];
		numFailedDelist = 0;
		delisting = true;
		for (let listed of event.listings) { // get list of matched items
			if(itemId == "all" || listed.item == itemId) {
				matchedItems.push(listed);
			}
		}
		for (let listedItem of matchedItems) { // remove items
			mod.toServer('C_TRADE_BROKER_UNREGISTER_ITEM', 1, {
				listing: listedItem.listing
			});
		}
		let timeout = setTimeout(() => {
			command.message("Found and removed " + (matchedItems.length - numFailedDelist) + " listings of itemId = " + itemId);
			delisting = false;
		}, 2000);
    });
	
	mod.hook('S_SYSTEM_MESSAGE', 1, event => {
    	if(!mod.settings.enabled) return;
		if(!delisting) return;
    	const msg = mod.parseSystemMessage(event.message);
    	if (msg) {
    		if (msg.id === 'SMT_INVEN_FULL') { // inventory full
				numFailedDelist++;
			}
		}
	});
}
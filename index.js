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
		matchedItems = [];
	
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
			console.log("Invalid itemId");
			return;
		}
		matchedItems = [];
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
		console.log("Found and removed " + matchedItems.length + " listings of itemId = " + itemId);
    });
	
}
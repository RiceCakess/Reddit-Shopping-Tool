var uservis = {};
var options = {};
var version = "1.5.3";
var defaultoptions = 
{
	"updateTime": 360, 
	"labelSketchy":0
};
var lastInfoBox;
//load options before running rest of script
$( document ).ready(()=>{
	chrome.storage.local.get({
		options: defaultoptions
	 }, function(data) {
		options = data.options;
		if (window.location.hostname.indexOf("reddit.com") != -1 ){
			checkForUpdate();
			labelUsers();
			checkForChanges();
			
		}
	});
});
function checkForUpdate(){
	//check last update timestamp
	chrome.storage.local.get(['timestamp','version'], function(data){
		//update list if list is X days old or empty or extension was updated
		if(data.timestamp === null || data.version === null || data.version !== version ||
		( options["updateTime"] !== -1 && ( ( Date.now() - data.timestamp )/1000 ) > ( options.updateTime * 60 ) ) ) {
			updateList();
		}
	});
}
function labelUsers(){
	//create an array for users that need to be checked
	$( ".author, .Post__username, .Comment__author, .Post__authorLink, a[href^='/user/']" ).each(function() {
		if(uservis[$(this).text().toLowerCase()] == null){
			uservis[$(this).text().toLowerCase()] = "";
		}
	});
	chrome.storage.local.get('users', function(data){
		//loop through banned users and check if uservis contains any banned users
		var dbUsers = data.users;
		for (var name in uservis){
			//set as banned if not already on the list
			if (uservis[name.toLowerCase()] <= 0 && dbUsers.hasOwnProperty(name)) {
				//set user info in uservis, and label sketchy users if enabled
				if(options['labelSketchy'] == 1 || dbUsers[name].code != 2){
					uservis[name.toLowerCase()] = dbUsers[name];
				}
			}
		}
		//automoderator exception
		uservis["automoderator"] = "";
		
		//loop through all name tags and set them as banned/sketchy, if any
		$( ".author, .Post__username, .Comment__author, .Post__authorLink, a[href^='/user/']" ).each(function() {
			
			//check if user is on the list
			var userData = uservis[$(this).text().toLowerCase()];
			if(userData){
				//translate bancode and add badge next to their name
				var badge = $("<a></a>");
				badge.addClass("rst-banned-" + userData);
				badge.addClass("rst-badge");
				badge.text(userData);
				badge.attr('href',"https://universalscammerlist.com/search.php?username=" + $(this).text().replace("/u/",""));
				$(this).append(badge);
			}
		});
	});
}

var sources = [
	"https://www.reddit.com/r/hardwareswap/wiki/banlist.json",
	"https://www.reddit.com/r/RSTList/wiki/banlist.json",  
	"https://www.reddit.com/r/RSTList/wiki/sketchylist.json"
];
function updateList(callback){
	var users = {};
	Promise.all( sources.slice(0, options["labelSketchy"] == 1 ? 3 : 2).map(function( src, index ) {
		return $.get( src );
	})).then(function(res) {
		var msg = "Ban List Updated!";
		var error = false;
		$.each(res,function( i, data ){
			if(data)
				$.extend(users, getUsersFromJSON(data));
			else{
				msg = "Error, failed to get data";
				error = true;
			}
		});
		if(!error){
			chrome.storage.local.set({"users": users});
			chrome.storage.local.set({"timestamp": Date.now()});
			chrome.storage.local.set({"version": version});
		}
		// console.log("[RST] " + msg);
		if( !!callback ) {
			callback(msg);
		}
	});
}
function getUsersFromJSON(data){
	var rx = /\*\s+\/u\/([^\s#]+)(\s+|)(#[a-z0-9]+)?/;
	if( typeof data === 'undefined' || !data.data || !data.data.content_md ) {
		return {};
	}
	var result = data.data.content_md.match( new RegExp( rx, 'gi') ) || [];
	result = result.map(function(i) {
		return i.match( new RegExp( rx, 'i' ) );
	});
	var ret = {};
	$.each(result,function(i,v){
		if( typeof v[3] === 'undefined' ) {
			v[3] = '#sketchy';
		}
		v[3] = v[3].slice(1).toLowerCase().replace('sktechy','sketchy');
		if( v[3].indexOf('ske') === 0 ) {
			v[3] = 'sketchy';
		}
		if( v[3].indexOf('spa') === 0 ) {
			v[3] = 'spammer';
		}
		if( v[3].indexOf('sca') === 0 ) {
			v[3] = 'scammer';
		}
		if( ['scammer','troll','sketchy','bot','compromised','rule','slavelabour','investigating','impersonator','spammer'].indexOf( v[3] ) === -1 ) {
			v[3] = 'sketchy';
		}
		ret[v[1].toLowerCase()] = v[3];
	});
	return ret;
}
//Checks for changes in the page, in dynamically loaded content such as infinite scroll
var lastcount = 0;
function checkForChanges()
{
	var namecounts = $( ".author, .Post__username, .Comment__author, .Post__authorLink, a[href^='/user/']" ).length;
	if(lastcount != namecounts){
		lastcount = namecounts;
		labelUsers();
	}
	//recheck every two second
	setTimeout(checkForChanges, 2000);
}